import type { DocumentEntity } from "@prisma/client";
import type { Capability } from "./permissions";

/** Which capability guards documents attached to each entity type. */
export function documentCapability(
  entity: DocumentEntity,
  mode: "read" | "write",
): Capability {
  switch (entity) {
    case "CONTRACTOR":
    case "PAYABLE":
      return `contractors:${mode}`;
    case "CONTRACT":
      return `contracts:${mode}`;
    case "EMPLOYEE":
      return `hr:${mode}`;
    default:
      return `files:${mode}`;
  }
}
