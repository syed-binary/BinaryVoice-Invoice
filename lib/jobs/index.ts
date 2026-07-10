import { markOverdueInvoices } from "./mark-overdue-invoices";
import { documentExpiryAlerts } from "./document-expiry-alerts";
import { fxRefresh } from "./fx-refresh";
import { contractRenewalAlerts } from "./contract-renewal-alerts";

/**
 * Scheduled job registry. Jobs are triggered by host cron hitting
 * /api/jobs/[job] with the CRON_SECRET header — see that route for the
 * curl lines to install. Each job returns a short human-readable summary.
 */
export const JOBS: Record<string, () => Promise<string>> = {
  "mark-overdue-invoices": markOverdueInvoices,
  "document-expiry-alerts": documentExpiryAlerts,
  "fx-refresh": fxRefresh,
  "contract-renewal-alerts": contractRenewalAlerts,
};
