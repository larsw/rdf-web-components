import { DataFactory, Parser, type Quad } from "n3";

export type RdfaProperty = {
  predicate: string;
  value: string;
  lang?: string;
  datatype?: string;
  resource?: boolean;
};

export type RdfaSubject = {
  subject: string;
  properties: RdfaProperty[];
};

export type RdfFormat = "turtle" | "trig" | "n-triples" | "n-quads";

type RdfaDomRoot = ParentNode & {
  querySelectorAll(selectors: string): Iterable<Element> | ArrayLike<Element>;
};

export function parseRdfToQuads(data: string, format: RdfFormat): Quad[] {
  return new Parser({ format }).parse(data);
}

export function quadsToRdfaSubjects(quads: Quad[]): RdfaSubject[] {
  const grouped = quads.reduce<Record<string, RdfaProperty[]>>((acc, quad) => {
    const subject = quad.subject.value;
    const properties = acc[subject] ?? [];
    const updatedProps = [...properties, quadToRdfaProperty(quad)];
    return { ...acc, [subject]: updatedProps };
  }, {});

  return Object.entries(grouped).map(([subject, properties]) => ({ subject, properties }));
}

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

export function renderRdfaDocument(subjects: RdfaSubject[]): string {
  return subjects.map(renderRdfa).join("");
}

export function rdfToRdfaHtml(data: string, format: RdfFormat): string {
  return renderRdfaDocument(quadsToRdfaSubjects(parseRdfToQuads(data, format)));
}

export function extractRdfaSubjectsFromDom(root: RdfaDomRoot): RdfaSubject[] {
  const subjectNodes = toElements(root.querySelectorAll("[resource]"));

  const grouped = subjectNodes.reduce<Record<string, RdfaProperty[]>>((acc, subjectEl) => {
    const subject = subjectEl.getAttribute("resource");
    if (!subject) return acc;

    const properties = toElements(subjectEl.querySelectorAll("[property]"))
      .map(rdfaPropertyFromElement)
      .filter(Boolean) as RdfaProperty[];

    const mergedProps = [...(acc[subject] ?? []), ...properties];
    return { ...acc, [subject]: mergedProps };
  }, {});

  return Object.entries(grouped).map(([subject, properties]) => ({ subject, properties }));
}

export function rdfaSubjectsToQuads(subjects: RdfaSubject[]): Quad[] {
  const { namedNode, literal, quad } = DataFactory;

  return subjects.flatMap((subject) =>
    subject.properties.map((prop) => {
      const subjectNode = namedNode(subject.subject);
      const predicateNode = namedNode(prop.predicate);
      if (prop.resource) {
        return quad(subjectNode, predicateNode, namedNode(prop.value));
      }

      if (prop.datatype) {
        return quad(subjectNode, predicateNode, literal(prop.value, namedNode(prop.datatype)));
      }

      if (prop.lang) {
        return quad(subjectNode, predicateNode, literal(prop.value, prop.lang));
      }

      return quad(subjectNode, predicateNode, literal(prop.value));
    })
  );
}

export function extractRdfaQuadsFromDom(root: RdfaDomRoot): Quad[] {
  return rdfaSubjectsToQuads(extractRdfaSubjectsFromDom(root));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function quadToRdfaProperty(quad: Quad): RdfaProperty {
  const object = quad.object;
  if (object.termType === "Literal") {
    return {
      predicate: quad.predicate.value,
      value: object.value,
      lang: object.language || undefined,
      datatype: object.datatype?.value,
    };
  }

  return {
    predicate: quad.predicate.value,
    value: object.value,
    resource: true,
  };
}

function toElements(collection: Iterable<Element> | ArrayLike<Element>): Element[] {
  return Array.from(collection as any as Iterable<Element>);
}

function rdfaPropertyFromElement(el: Element): RdfaProperty | undefined {
  const predicate = el.getAttribute("property");
  if (!predicate) return undefined;

  const lang = el.getAttribute("lang") || undefined;
  const datatype = el.getAttribute("datatype") || undefined;
  const resource =
    el.getAttribute("resource") ||
    el.getAttribute("href") ||
    el.getAttribute("src") ||
    undefined;

  if (resource) {
    return { predicate, value: resource, lang, datatype, resource: true };
  }

  const text = (el.textContent ?? "").trim();
  return { predicate, value: text, lang, datatype };
}

export default rdfToRdfaHtml;
