export const CONTRACT_STYLE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-amber-500/15 text-amber-600",
  SIGNED: "bg-sky-500/15 text-sky-600",
  ACTIVE: "bg-emerald-500/15 text-emerald-600",
  EXPIRED: "bg-orange-500/15 text-orange-600",
  TERMINATED: "bg-destructive/10 text-destructive",
};

export const CONTRACT_TYPE_LABEL: Record<string, string> = {
  MSA: "MSA",
  SOW: "SOW",
  NDA: "NDA",
  CONTRACTOR_AGREEMENT: "Contractor agreement",
  OFFER_LETTER: "Offer letter",
  EMPLOYMENT: "Employment",
  AMENDMENT: "Amendment",
  OTHER: "Other",
};
