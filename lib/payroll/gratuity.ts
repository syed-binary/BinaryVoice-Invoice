import { round2 } from "../money";

/**
 * UAE end-of-service gratuity (Federal Decree-Law 33/2021, post-2022 rules,
 * limited contracts): 21 days of BASIC salary per year for the first five
 * years of service, 30 days per year beyond, pro-rated daily for partial
 * years, capped at two years' total basic pay. Service under one year
 * accrues nothing. Pure — dates in, AED out. Not tax/legal advice: verify
 * edge cases (unpaid leave, terminations for cause) with the accountant.
 */
export function gratuityAccrual(
  joinDate: Date,
  asOf: Date,
  monthlyBasicSalary: number,
): { serviceYears: number; accrued: number } {
  const ms = asOf.getTime() - joinDate.getTime();
  const serviceYears = ms / (365.25 * 24 * 3600 * 1000);
  if (serviceYears < 1 || monthlyBasicSalary <= 0) {
    return { serviceYears: Math.max(0, round2(serviceYears)), accrued: 0 };
  }

  const dailyBasic = monthlyBasicSalary / 30;
  const first = Math.min(serviceYears, 5);
  const beyond = Math.max(serviceYears - 5, 0);
  let accrued = first * 21 * dailyBasic + beyond * 30 * dailyBasic;

  const cap = monthlyBasicSalary * 24; // two years' basic pay
  if (accrued > cap) accrued = cap;

  return { serviceYears: round2(serviceYears), accrued: round2(accrued) };
}
