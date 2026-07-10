"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { getCompany } from "@/lib/company";
import { renderTemplate } from "@/lib/contracts/merge";
import { buildVars } from "@/lib/contracts/vars";
import { jurisdictionFor, GLOBAL_JURISDICTION } from "@/lib/contracts/jurisdictions";
import { toNumber, formatNumber } from "@/lib/money";
import { formatDateLong } from "@/lib/format";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/email";

export type ContractResult = {
  error?: string;
  id?: string;
  missing?: string[];
  unreviewedClauses?: number;
  noJurisdictionPack?: boolean;
};

const generateSchema = z.object({
  templateId: z.string().min(1, "Pick a template"),
  contractorId: z.string().nullish(),
  clientId: z.string().nullish(),
  engagementId: z.string().nullish(),
  title: z.string().nullish(),
});

export type GenerateContractInput = z.input<typeof generateSchema>;

/**
 * Generate a draft contract from a template. For contractor paperwork
 * (offer letters, agreements) the {{clauses}} placeholder is filled from
 * the jurisdiction clause library: global pack + the contractor country's
 * pack, mandatory clauses only.
 */
export async function generateContract(
  input: GenerateContractInput,
): Promise<ContractResult> {
  const user = await requireCapability("contracts:write");
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const p = parsed.data;
  if (!p.contractorId && !p.clientId) {
    return { error: "Pick a counterparty (contractor or client)" };
  }

  const [template, company, contractor, client, engagement] = await Promise.all([
    prisma.contractTemplate.findUnique({ where: { id: p.templateId } }),
    getCompany(),
    p.contractorId
      ? prisma.contractor.findUnique({ where: { id: p.contractorId } })
      : null,
    p.clientId ? prisma.client.findUnique({ where: { id: p.clientId } }) : null,
    p.engagementId
      ? prisma.engagement.findUnique({ where: { id: p.engagementId } })
      : null,
  ]);
  if (!template) return { error: "Template not found" };

  // Assemble the jurisdiction clause pack for contractor paperwork.
  let clausesMd = "";
  let unreviewedClauses = 0;
  let noJurisdictionPack = false;
  if (template.body.includes("{{clauses}}")) {
    const iso = contractor ? jurisdictionFor(contractor.country) : null;
    if (contractor && !iso) noJurisdictionPack = true;
    const jurisdictions = [GLOBAL_JURISDICTION, ...(iso ? [iso] : [])];
    const clauses = await prisma.clause.findMany({
      where: { jurisdiction: { in: jurisdictions }, mandatory: true, archived: false },
      orderBy: [{ jurisdiction: "asc" }, { sortOrder: "asc" }],
    });
    // Global pack first, then the country pack ("*" sorts before letters).
    unreviewedClauses = clauses.filter((c) => !c.reviewedAt).length;
    clausesMd = clauses.map((c, i) => `### ${i + 1}. ${c.title}\n\n${c.body}`).join("\n\n");
  }

  const vars = buildVars({
    company: {
      legalName: company.legalName,
      city: company.city,
      country: company.country,
    },
    contractor: contractor
      ? {
          name: contractor.name,
          email: contractor.email,
          country: contractor.country,
          entityName: contractor.entityName,
        }
      : null,
    client: client ? { displayName: client.displayName } : null,
    engagement: engagement
      ? {
          title: engagement.title,
          startDate: formatDateLong(engagement.startDate),
          costRate: formatNumber(toNumber(engagement.costRate)),
          costCurrency: engagement.costCurrency,
          rateUnit: engagement.rateUnit.toLowerCase(),
        }
      : null,
    contract: { noticePeriodDays: 14 },
    today: formatDateLong(new Date()),
  });

  const withClauses = template.body.replace("{{clauses}}", clausesMd);
  const { text: body, missing } = renderTemplate(withClauses, vars);

  const counterpartyName = contractor?.name ?? client?.displayName ?? "";
  const title =
    p.title ||
    `${template.name} — ${counterpartyName}`;

  const contract = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, "contract", "CTR");
    return tx.contract.create({
      data: {
        number,
        type: template.type,
        title,
        contractorId: p.contractorId || null,
        clientId: p.clientId || null,
        templateId: template.id,
        body,
        noticePeriodDays: 14,
        versions: {
          create: { version: 1, body, changeNote: "Generated from template", createdById: user.id },
        },
      },
    });
  });
  if (p.engagementId) {
    await prisma.engagement.update({
      where: { id: p.engagementId },
      data: { contractId: contract.id },
    });
  }
  await audit(user, "contract.generate", "Contract", contract.id, {
    number: contract.number,
    template: template.name,
  });

  revalidatePath("/contracts");
  return { id: contract.id, missing, unreviewedClauses, noJurisdictionPack };
}

const draftSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  effectiveDate: z.string().nullish(),
  endDate: z.string().nullish(),
  renewalType: z.enum(["NONE", "AUTO_RENEW", "MANUAL"]).default("NONE"),
  noticePeriodDays: z.number().int().nonnegative().nullish(),
  value: z.number().nonnegative().nullish(),
  currency: z.string().min(1).default("AED"),
  notes: z.string().nullish(),
  changeNote: z.string().nullish(),
});

export type ContractDraftInput = z.input<typeof draftSchema>;

export async function saveContractDraft(
  input: ContractDraftInput,
): Promise<ContractResult> {
  const user = await requireCapability("contracts:write");
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid contract" };
  }
  const p = parsed.data;

  const existing = await prisma.contract.findUnique({
    where: { id: p.id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!existing) return { error: "Contract not found" };
  if (existing.status !== "DRAFT") {
    return { error: "Only drafts can be edited — sent contracts are frozen" };
  }

  const bodyChanged = existing.body !== p.body;
  await prisma.contract.update({
    where: { id: p.id },
    data: {
      title: p.title,
      body: p.body,
      effectiveDate: p.effectiveDate ? new Date(p.effectiveDate) : null,
      endDate: p.endDate ? new Date(p.endDate) : null,
      renewalType: p.renewalType,
      noticePeriodDays: p.noticePeriodDays ?? null,
      value: p.value ?? null,
      currency: p.currency,
      notes: p.notes ?? null,
      ...(bodyChanged
        ? {
            versions: {
              create: {
                version: (existing.versions[0]?.version ?? 0) + 1,
                body: p.body,
                changeNote: p.changeNote ?? null,
                createdById: user.id,
              },
            },
          }
        : {}),
    },
  });

  revalidatePath(`/contracts/${p.id}`);
  revalidatePath("/contracts");
  return { id: p.id };
}

const sendSchema = z.object({
  id: z.string().min(1),
  signatories: z
    .array(
      z.object({
        name: z.string().min(1, "Signatory name required"),
        email: z.string().email("Valid signatory email required"),
      }),
    )
    .min(1, "Add at least one signatory"),
});

export type SendContractInput = z.input<typeof sendSchema>;

/** Freeze the body, hash it, create tokenized signing links, email them. */
export async function sendContract(input: SendContractInput): Promise<ContractResult> {
  const user = await requireCapability("contracts:write");
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const p = parsed.data;

  const contract = await prisma.contract.findUnique({ where: { id: p.id } });
  if (!contract) return { error: "Contract not found" };
  if (contract.status !== "DRAFT") return { error: "Only drafts can be sent" };
  if (contract.body.includes("[missing:")) {
    return { error: "Resolve all [missing: …] fields before sending" };
  }

  const bodyHash = createHash("sha256").update(contract.body, "utf8").digest("hex");
  const signatories = p.signatories.map((s, i) => ({
    name: s.name,
    email: s.email,
    order: i,
    token: randomBytes(24).toString("base64url"),
  }));

  await prisma.contract.update({
    where: { id: p.id },
    data: {
      status: "SENT",
      bodySnapshot: contract.body,
      bodyHash,
      signatories: { deleteMany: {}, create: signatories },
    },
  });
  await audit(user, "contract.send", "Contract", p.id, {
    number: contract.number,
    bodyHash,
    signatories: signatories.map((s) => s.email),
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  for (const s of signatories) {
    await sendMail({
      to: s.email,
      subject: `Signature requested: ${contract.title}`,
      html: `<p>Dear ${s.name},</p><p>${contract.title} is ready for your signature.</p><p><a href="${appUrl}/sign/${s.token}">Review and sign</a></p>`,
      text: `Review and sign: ${appUrl}/sign/${s.token}`,
    });
  }

  revalidatePath(`/contracts/${p.id}`);
  revalidatePath("/contracts");
  return { id: p.id };
}

export async function setContractStatus(
  id: string,
  status: "ACTIVE" | "TERMINATED",
): Promise<ContractResult> {
  const user = await requireCapability("contracts:write");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return { error: "Contract not found" };
  const allowed =
    status === "ACTIVE"
      ? ["SIGNED", "SENT"].includes(contract.status)
      : ["ACTIVE", "SIGNED", "SENT"].includes(contract.status);
  if (!allowed) return { error: `Cannot mark ${contract.status} contract ${status}` };
  await prisma.contract.update({ where: { id }, data: { status } });
  await audit(user, `contract.${status.toLowerCase()}`, "Contract", id, {
    number: contract.number,
  });
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/contracts");
  return { id };
}

export async function deleteContract(id: string) {
  const user = await requireCapability("contracts:write");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return;
  if (contract.status !== "DRAFT") return; // sent/signed history is immutable
  await prisma.engagement.updateMany({ where: { contractId: id }, data: { contractId: null } });
  await prisma.contract.delete({ where: { id } });
  await audit(user, "contract.delete", "Contract", id, { number: contract.number });
  revalidatePath("/contracts");
  redirect("/contracts");
}
