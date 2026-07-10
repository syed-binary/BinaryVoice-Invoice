import { NextResponse } from "next/server";
import { JOBS } from "@/lib/jobs";

/**
 * Scheduled-job trigger, guarded by CRON_SECRET (not session auth — callers
 * are host cron/systemd timers). Install with one line per job, e.g.:
 *
 *   15 2 * * * curl -s -X POST -H "x-cron-secret: $CRON_SECRET" \
 *     http://localhost:3000/api/jobs/mark-overdue-invoices
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job } = await params;
  const run = JOBS[job];
  if (!run) {
    return NextResponse.json(
      { error: `Unknown job. Available: ${Object.keys(JOBS).join(", ")}` },
      { status: 404 },
    );
  }

  try {
    const summary = await run();
    return NextResponse.json({ ok: true, job, summary });
  } catch (err) {
    console.error(`job ${job} failed`, err);
    return NextResponse.json({ ok: false, job, error: String(err) }, { status: 500 });
  }
}
