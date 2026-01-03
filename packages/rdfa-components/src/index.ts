/**
 * Minimal placeholder utilities for RDFa rendering.
 * Replace with real logic when implementing RDFa-specific features.
 */

export type RdfaProperty = {
  predicate: string;
  value: string;
  lang?: string;
  datatype?: string;
};

export type RdfaSubject = {
  subject: string;
  properties: RdfaProperty[];
};

/**
 * Render a lightweight RDFa snippet from a subject and its properties.
 * This currently returns a simple string; extend with richer templates as needed.
 */
export function renderRdfa(subject: RdfaSubject): string {
  const attrs = [`resource="${subject.subject}"`].join(" ");
  const rows = subject.properties
    .map((prop) => {
      const langAttr = prop.lang ? ` lang=\"${prop.lang}\"` : "";
      const dtAttr = prop.datatype ? ` datatype=\"${prop.datatype}\"` : "";
      return `<div property=\"${prop.predicate}\"${langAttr}${dtAttr}>${escapeHtml(prop.value)}</div>`;
    })
    .join("");
  return `<div ${attrs}>${rows}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default renderRdfa;
