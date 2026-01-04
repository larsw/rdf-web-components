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
  graph?: string;
  properties: RdfaProperty[];
};

export type RdfFormat = "turtle" | "trig" | "n-triples" | "n-quads";

type RdfaDomRoot = ParentNode & {
  querySelectorAll(selectors: string): Iterable<Element> | ArrayLike<Element>;
};

export const parseRdfToQuads = (
  data: string,
  format: RdfFormat,
  options?: { graph?: string }
): Quad[] => {
  const quads = new Parser({ format }).parse(data);
  if (!options?.graph) return quads;

  const { quad, namedNode } = DataFactory;
  return quads.map((q) => {
    const graph = q.graph.termType === "DefaultGraph" && options.graph ? namedNode(options.graph) : q.graph;
    return quad(q.subject, q.predicate, q.object, graph);
  });
};

export const quadsToRdfaSubjects = (quads: Quad[]): RdfaSubject[] => {
  const grouped = quads.reduce<Record<string, RdfaSubject>>((acc, quad) => {
    const subject = quad.subject.value;
    const graph = quad.graph.termType === "DefaultGraph" ? undefined : quad.graph.value;
    const key = `${graph ?? ""}|${subject}`;
    const existing = acc[key];
    const properties = existing?.properties ?? [];
    const updatedProps = [...properties, quadToRdfaProperty(quad)];
    return { ...acc, [key]: { subject, graph, properties: updatedProps } };
  }, {});

  return Object.values(grouped);
};

export const renderRdfa = (subject: RdfaSubject): string => {
  const attrs = [
    `resource="${subject.subject}"`,
    subject.graph ? `data-graph="${subject.graph}"` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const rows = subject.properties
    .map((prop) => {
      const langAttr = prop.lang ? ` lang=\"${prop.lang}\"` : "";
      const dtAttr = prop.datatype ? ` datatype=\"${prop.datatype}\"` : "";
      return `<div property=\"${prop.predicate}\"${langAttr}${dtAttr}>${escapeHtml(prop.value)}</div>`;
    })
    .join("");
  return `<div ${attrs}>${rows}</div>`;
};

export const renderRdfaDocument = (subjects: RdfaSubject[]): string => subjects.map(renderRdfa).join("");

export const rdfToRdfaHtml = (data: string, format: RdfFormat): string =>
  renderRdfaDocument(quadsToRdfaSubjects(parseRdfToQuads(data, format)));

export const extractRdfaSubjectsFromDom = (root: RdfaDomRoot): RdfaSubject[] => {
  const subjectNodes = toElements(root.querySelectorAll("[resource]"));

  const grouped = subjectNodes.reduce<Record<string, RdfaSubject>>((acc, subjectEl) => {
    const subject = subjectEl.getAttribute("resource");
    if (!subject) return acc;

    const graph = subjectEl.getAttribute("data-graph") || undefined;

    const properties = toElements(subjectEl.querySelectorAll("[property]"))
      .map(rdfaPropertyFromElement)
      .filter(Boolean) as RdfaProperty[];

    const key = `${graph ?? ""}|${subject}`;
    const mergedProps = [...(acc[key]?.properties ?? []), ...properties];
    return { ...acc, [key]: { subject, graph, properties: mergedProps } };
  }, {});

  return Object.values(grouped);
};

export const rdfaSubjectsToQuads = (subjects: RdfaSubject[]): Quad[] => {
  const { namedNode, literal, quad, defaultGraph } = DataFactory;

  return subjects.flatMap((subject) =>
    subject.properties.map((prop) => {
      const subjectNode = namedNode(subject.subject);
      const predicateNode = namedNode(prop.predicate);
      const graphNode = subject.graph ? namedNode(subject.graph) : defaultGraph();
      if (prop.resource) {
        return quad(subjectNode, predicateNode, namedNode(prop.value), graphNode);
      }

      if (prop.datatype) {
        return quad(subjectNode, predicateNode, literal(prop.value, namedNode(prop.datatype)), graphNode);
      }

      if (prop.lang) {
        return quad(subjectNode, predicateNode, literal(prop.value, prop.lang), graphNode);
      }

      return quad(subjectNode, predicateNode, literal(prop.value), graphNode);
    })
  );
};

export const extractRdfaQuadsFromDom = (root: RdfaDomRoot): Quad[] => rdfaSubjectsToQuads(extractRdfaSubjectsFromDom(root));

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const quadToRdfaProperty = (quad: Quad): RdfaProperty => {
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
};

const toElements = (collection: Iterable<Element> | ArrayLike<Element>): Element[] =>
  Array.from(collection as any as Iterable<Element>);

const rdfaPropertyFromElement = (el: Element): RdfaProperty | undefined => {
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
};

export default rdfToRdfaHtml;
