import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedContracts } from "./seed-contracts";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "syed.asad@binarylabz.com";
  const password = process.env.ADMIN_PASSWORD ?? "binarylabs123";
  const name = process.env.ADMIN_NAME ?? "Syed Asad Husain Zaidi";

  // --- Admin user ---
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN" },
  });
  console.log(`✔ Admin user: ${email}`);

  // --- Company settings (prefilled from Docs/) ---
  const companyData = {
    legalName: "Binary AI Labs and Technologies L.L.C-FZ",
    tradeName: "Binary Labs",
    arabicName: "باينري ايه اي لابس اند تيكنولوجيز ش.ذ.م.م-منطقة حرة",
    addressLine1: "Meydan Grandstand, 6th floor",
    addressLine2: "Meydan Road, Nad Al Sheba",
    city: "Dubai",
    emirate: "Dubai",
    country: "United Arab Emirates",
    phone: "+971-551179083",
    email: "syed.asad@binarylabz.com",
    website: "https://binarylabz.com",
    corporateTaxTrn: "105462369700001",
    vatTrn: null,
    vatEnabled: false,
    bankName: "Wio Bank PJSC",
    accountName: "Binary AI Labs and Technologies L.L.C-FZ",
    iban: "AE730860000009214181919",
    swift: "WIOBAEADXXX",
    accountNumber: "9214181919",
    routingCode: "808610001",
    baseCurrency: "AED",
    invoicePrefix: "BL",
    estimatePrefix: "EST",
    defaultTemplate: "enterprise",
    accentColor: "#4f46e5",
    defaultNotes: "Thank you for your business.",
    defaultTerms:
      "Payment due within 14 days. Please transfer to the bank account shown above and quote the invoice number as reference.",
    defaultDueDays: 14,
  };

  await prisma.companySettings.upsert({
    where: { id: "company" },
    update: companyData,
    create: { id: "company", ...companyData },
  });
  console.log("✔ Company settings seeded (Binary Labs)");

  // --- Example custom field definitions ---
  const customFields = [
    { entity: "INVOICE" as const, key: "po_number", label: "PO Number", type: "TEXT" as const, sortOrder: 0 },
    { entity: "INVOICE" as const, key: "project_code", label: "Project Code", type: "TEXT" as const, sortOrder: 1 },
    { entity: "CLIENT" as const, key: "industry", label: "Industry", type: "TEXT" as const, sortOrder: 0 },
  ];
  for (const cf of customFields) {
    await prisma.customFieldDefinition.upsert({
      where: { entity_key: { entity: cf.entity, key: cf.key } },
      update: { label: cf.label, type: cf.type, sortOrder: cf.sortOrder },
      create: cf,
    });
  }
  console.log(`✔ ${customFields.length} example custom fields seeded`);

  // --- Contract templates + jurisdiction clause packs ---
  await seedContracts(prisma);

  // --- UAE leave types (Federal Decree-Law 33/2021) ---
  const leaveTypes = [
    { id: "lv-annual", name: "Annual leave", daysPerYear: 30, paid: true, sortOrder: 1 },
    { id: "lv-sick-full", name: "Sick leave (full pay)", daysPerYear: 15, paid: true, sortOrder: 2 },
    { id: "lv-sick-half", name: "Sick leave (half pay)", daysPerYear: 30, paid: true, sortOrder: 3 },
    { id: "lv-sick-unpaid", name: "Sick leave (unpaid)", daysPerYear: 45, paid: false, sortOrder: 4 },
    { id: "lv-maternity", name: "Maternity leave", daysPerYear: 60, paid: true, sortOrder: 5 },
    { id: "lv-parental", name: "Parental leave", daysPerYear: 5, paid: true, sortOrder: 6 },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({ where: { id: lt.id }, update: {}, create: lt });
  }
  console.log(`✔ ${leaveTypes.length} UAE leave types seeded`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
