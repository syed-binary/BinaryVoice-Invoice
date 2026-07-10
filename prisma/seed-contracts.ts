import type { PrismaClient, ClauseCategory, ContractType } from "@prisma/client";

/**
 * Seed jurisdiction clause packs + contract templates (idempotent upserts,
 * deterministic ids). Clause text is AI-drafted and deliberately left
 * UNREVIEWED (reviewedBy null) — the UI warns until counsel signs off.
 */

type ClauseSeed = {
  id: string;
  jurisdiction: string;
  category: ClauseCategory;
  title: string;
  body: string;
  mandatory?: boolean;
  sortOrder: number;
};

const CLAUSES: ClauseSeed[] = [
  // ---- Global pack (*) ------------------------------------------------
  {
    id: "cl-global-confidentiality",
    jurisdiction: "*",
    category: "CONFIDENTIALITY",
    title: "Confidentiality",
    sortOrder: 10,
    body: "The Contractor shall keep confidential all non-public information of {{company.legalName}} and its clients obtained in connection with the engagement, shall use it solely to perform the services, and shall not disclose it to any third party without prior written consent. This obligation survives termination for five (5) years, and indefinitely for trade secrets.",
  },
  {
    id: "cl-global-ip",
    jurisdiction: "*",
    category: "IP_ASSIGNMENT",
    title: "Intellectual property",
    sortOrder: 20,
    body: "All work product, deliverables, inventions and materials created by the Contractor in the course of the services are assigned to {{company.legalName}} upon creation, together with all intellectual property rights therein, to the fullest extent permitted by law. The Contractor waives, to the extent permissible, all moral rights, and shall execute any documents reasonably required to perfect such assignment.",
  },
  {
    id: "cl-global-payment",
    jurisdiction: "*",
    category: "PAYMENT",
    title: "Fees and invoicing",
    sortOrder: 30,
    body: "The Contractor shall invoice {{company.legalName}} at the rate of {{engagement.costRate}} {{engagement.costCurrency}} per {{engagement.rateUnit}}. Undisputed invoices are payable within 14 days of receipt. The Contractor is responsible for its own costs and expenses unless agreed in writing in advance.",
  },
  {
    id: "cl-global-termination",
    jurisdiction: "*",
    category: "TERMINATION",
    title: "Termination",
    sortOrder: 40,
    body: "Either party may terminate the engagement on {{contract.noticePeriodDays}} days' written notice. {{company.legalName}} may terminate immediately for material breach, insolvency of the Contractor, or conduct materially damaging to its reputation. Upon termination the Contractor shall deliver all work product and return or destroy all confidential information.",
  },
  {
    id: "cl-global-antibribery",
    jurisdiction: "*",
    category: "COMPLIANCE",
    title: "Anti-bribery and sanctions",
    sortOrder: 50,
    body: "The Contractor shall comply with all applicable anti-bribery, anti-corruption and sanctions laws and shall not offer, give or receive any improper advantage in connection with the services.",
  },
  {
    id: "cl-global-nonsolicit",
    jurisdiction: "*",
    category: "NON_SOLICIT",
    title: "Non-solicitation",
    sortOrder: 60,
    mandatory: false,
    body: "During the engagement and for twelve (12) months after, the Contractor shall not directly solicit for employment or engagement any employee, contractor or client of {{company.legalName}} with whom the Contractor had material contact, except with prior written consent.",
  },

  // ---- United Kingdom (GB) -------------------------------------------
  {
    id: "cl-gb-status",
    jurisdiction: "GB",
    category: "ENGAGEMENT_STATUS",
    title: "Independent contractor status (UK)",
    sortOrder: 10,
    body: "The Contractor is engaged as an independent contractor in business on its own account. Nothing in this agreement creates a contract of employment, a worker relationship, or a relationship of agency or partnership. The Contractor: (a) may provide the services through a suitably qualified substitute, subject to reasonable notice and {{company.legalName}}'s right to satisfy itself as to the substitute's suitability; (b) is not subject to supervision, direction or control by {{company.legalName}} as to the manner in which the services are performed; and (c) is under no obligation to accept, and {{company.legalName}} is under no obligation to offer, any further work (no mutuality of obligation).",
  },
  {
    id: "cl-gb-tax",
    jurisdiction: "GB",
    category: "TAX_WITHHOLDING",
    title: "Tax and National Insurance (UK)",
    sortOrder: 20,
    body: "The Contractor is solely responsible for its own income tax, National Insurance contributions, VAT and any other levies arising from the fees, and shall indemnify {{company.legalName}} against any liability, penalty or interest arising from the Contractor's failure to account for the same. Where the off-payroll working rules (IR35, Chapter 10 ITEPA 2003) are relevant, the parties shall cooperate in good faith on any status determination.",
  },
  {
    id: "cl-gb-data",
    jurisdiction: "GB",
    category: "DATA_PROTECTION",
    title: "Data protection (UK GDPR)",
    sortOrder: 30,
    body: "Each party shall comply with the UK GDPR and the Data Protection Act 2018 in respect of personal data processed in connection with the services. Where the Contractor processes personal data on behalf of {{company.legalName}}, it shall do so only on documented instructions, apply appropriate technical and organisational measures, and notify {{company.legalName}} without undue delay of any personal data breach.",
  },
  {
    id: "cl-gb-law",
    jurisdiction: "GB",
    category: "DISPUTE_LAW",
    title: "Governing law and jurisdiction (England & Wales)",
    sortOrder: 40,
    body: "This agreement is governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction over any dispute arising out of or in connection with it, save that {{company.legalName}} may seek injunctive relief in any competent jurisdiction.",
  },

  // ---- India (IN) ------------------------------------------------------
  {
    id: "cl-in-status",
    jurisdiction: "IN",
    category: "ENGAGEMENT_STATUS",
    title: "Independent contractor status (India)",
    sortOrder: 10,
    body: "The Contractor is engaged on a principal-to-principal basis as an independent contractor. Nothing in this agreement creates an employer–employee relationship, and the Contractor is not entitled to any employment benefits (including provident fund, gratuity, ESI or statutory bonus) from {{company.legalName}}. The Contractor retains discretion over the time, place and manner of performing the services, subject to agreed deliverables.",
  },
  {
    id: "cl-in-tax",
    jurisdiction: "IN",
    category: "TAX_WITHHOLDING",
    title: "Taxes, TDS and GST (India)",
    sortOrder: 20,
    body: "Fees are paid by {{company.legalName}}, a UAE entity, for services rendered from India. The Contractor is solely responsible for its Indian income tax obligations, including advance tax on foreign remittances, and for GST registration, invoicing and remittance if the Contractor is or becomes liable to be registered under the CGST/IGST Acts. Any withholding required under Indian law (including section 195 of the Income-tax Act, 1961, where applicable) or under the India–UAE double taxation treaty shall be applied as required by law, and the parties shall cooperate on documentation (including tax residency certificates) to obtain available treaty relief.",
  },
  {
    id: "cl-in-ip",
    jurisdiction: "IN",
    category: "IP_ASSIGNMENT",
    title: "IP assignment (India supplement)",
    sortOrder: 30,
    body: "Without limiting the global IP assignment clause: the assignment of copyright includes all rights under the Copyright Act, 1957, is worldwide and royalty-free, extends to all present and future modes of exploitation, and shall not lapse notwithstanding section 19(4) of that Act. The Contractor waives any rights under section 57 (special rights of the author) to the extent permitted by law.",
  },
  {
    id: "cl-in-data",
    jurisdiction: "IN",
    category: "DATA_PROTECTION",
    title: "Data protection (DPDP Act)",
    sortOrder: 40,
    body: "The Contractor shall comply with the Digital Personal Data Protection Act, 2023 in respect of any personal data processed in connection with the services, shall process such data only as instructed by {{company.legalName}}, apply reasonable security safeguards, and promptly report any personal data breach.",
  },
  {
    id: "cl-in-law",
    jurisdiction: "IN",
    category: "DISPUTE_LAW",
    title: "Governing law and arbitration (India engagements)",
    sortOrder: 50,
    body: "This agreement is governed by the laws of the United Arab Emirates. Any dispute shall be finally resolved by arbitration seated in the Dubai International Financial Centre (DIFC) under the DIFC-LCIA/DIAC rules by a sole arbitrator, conducted in English. Nothing prevents either party from seeking interim relief before a competent court.",
  },

  // ---- UAE (AE) --------------------------------------------------------
  {
    id: "cl-ae-status",
    jurisdiction: "AE",
    category: "ENGAGEMENT_STATUS",
    title: "Independent contractor status (UAE)",
    sortOrder: 10,
    body: "The Contractor is engaged as an independent contractor and holds, and shall maintain, any licence or permit required to provide the services lawfully in the UAE (including freelance permits where applicable). Nothing in this agreement creates an employment relationship under Federal Decree-Law No. 33 of 2021.",
  },
  {
    id: "cl-ae-vat",
    jurisdiction: "AE",
    category: "TAX_WITHHOLDING",
    title: "UAE VAT",
    sortOrder: 20,
    body: "Fees are exclusive of VAT. If the Contractor is registered for UAE VAT, it shall issue tax invoices compliant with Federal Decree-Law No. 8 of 2017 and its executive regulations, and VAT shall be added at the applicable rate.",
  },
  {
    id: "cl-ae-law",
    jurisdiction: "AE",
    category: "DISPUTE_LAW",
    title: "Governing law and jurisdiction (UAE)",
    sortOrder: 30,
    body: "This agreement is governed by the federal laws of the United Arab Emirates as applied in the Emirate of Dubai. The courts of Dubai have exclusive jurisdiction over any dispute arising out of or in connection with it.",
  },
];

const TEMPLATES: { id: string; name: string; type: ContractType; body: string }[] = [
  {
    id: "tpl-offer-letter",
    name: "Contractor offer letter",
    type: "OFFER_LETTER",
    body: `# Offer of Engagement

**{{company.legalName}}** · {{company.city}}, {{company.country}}

{{today}}

Dear {{contractor.name}},

We are pleased to offer you an engagement as an independent contractor with {{company.legalName}} on the terms below.

## Engagement

| | |
|---|---|
| **Role** | {{engagement.title}} |
| **Start date** | {{engagement.startDate}} |
| **Rate** | {{engagement.costRate}} {{engagement.costCurrency}} per {{engagement.rateUnit}} |
| **Location** | Remote — {{contractor.country}} |

This offer is conditional on satisfactory completion of onboarding, including identity and compliance documentation.

## Terms

{{clauses}}

## Acceptance

Please confirm your acceptance by signing electronically via the link provided. This offer remains open for 14 days from the date above.

For and on behalf of **{{company.legalName}}**`,
  },
  {
    id: "tpl-contractor-agreement",
    name: "Independent contractor agreement",
    type: "CONTRACTOR_AGREEMENT",
    body: `# Independent Contractor Agreement

This agreement is made on {{today}} between **{{company.legalName}}** ("Company") and **{{contractor.name}}**{{contractor.entitySuffix}} of {{contractor.country}} ("Contractor").

## Services

The Contractor shall provide the services of **{{engagement.title}}**, commencing {{engagement.startDate}}, at {{engagement.costRate}} {{engagement.costCurrency}} per {{engagement.rateUnit}}.

## Terms

{{clauses}}

Signed by the parties on the date first written above.`,
  },
];

export async function seedContracts(prisma: PrismaClient) {
  for (const c of CLAUSES) {
    const { id, mandatory, ...rest } = c;
    await prisma.clause.upsert({
      where: { id },
      update: {}, // never clobber local edits on re-seed
      create: { id, mandatory: mandatory ?? true, ...rest },
    });
  }
  for (const t of TEMPLATES) {
    await prisma.contractTemplate.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
  }
  console.log(`Seeded ${CLAUSES.length} clauses and ${TEMPLATES.length} contract templates`);
}
