import { marked } from "marked";

/**
 * Contract body markdown → HTML for previews, the public signing page and
 * the Playwright print route. Bodies are authored in-house (templates +
 * clause library), not arbitrary user input.
 */
export function contractHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true, breaks: true });
}
