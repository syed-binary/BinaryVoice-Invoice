import { chromium } from "playwright";

/**
 * Render a URL to an A4 PDF using headless Chromium.
 * Forwards the caller's cookies so protected print pages authenticate.
 */
export async function renderPdfFromUrl(
  url: string,
  cookieHeader: string,
  opts?: {
    singlePage?: boolean;
    /** Page margins for flowing documents (contracts). Default: none. */
    margin?: { top: string; right: string; bottom: string; left: string };
    /** Running footer (Chromium header/footer template HTML). */
    footerTemplate?: string;
  },
): Promise<Buffer> {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const context = await browser.newContext();

    if (cookieHeader) {
      const { hostname } = new URL(url);
      const cookies = cookieHeader
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const idx = pair.indexOf("=");
          return {
            name: pair.slice(0, idx),
            value: pair.slice(idx + 1),
            domain: hostname,
            path: "/",
          };
        })
        .filter((c) => c.name);
      if (cookies.length) await context.addCookies(cookies);
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    // Ensure web fonts (incl. the Dirham symbol) and images are ready.
    await page.evaluate(() => (document as Document).fonts.ready);
    await page.waitForTimeout(300);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      // Invoices/estimates are single-page documents; contracts flow to
      // as many pages as they need.
      ...(opts?.singlePage === false ? {} : { pageRanges: "1" }),
      margin: opts?.margin ?? { top: "0", right: "0", bottom: "0", left: "0" },
      ...(opts?.footerTemplate
        ? {
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: opts.footerTemplate,
          }
        : {}),
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
