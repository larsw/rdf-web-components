import {
  extractRdfaSubjectsFromDom,
  rdfToRdfaHtml,
  type RdfFormat,
} from "../src";

const textarea = document.getElementById("input") as HTMLTextAreaElement;
const formatSelect = document.getElementById("format") as HTMLSelectElement;
const convertBtn = document.getElementById("convert") as HTMLButtonElement;
const htmlOutput = document.getElementById("htmlOutput") as HTMLElement;
const preview = document.getElementById("preview") as HTMLElement;
const subjectsOutput = document.getElementById("subjectsOutput") as HTMLElement;
const status = document.getElementById("status") as HTMLElement;

const sample = `
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:alice ex:name "Alice"@en ;
  ex:age "30"^^xsd:integer ;
  ex:friend ex:bob .
`; // keep simple for quick edits

textarea.value = sample;
formatSelect.value = "turtle";

const render = () => {
  try {
    const format = formatSelect.value as RdfFormat;
    const rdfaHtml = rdfToRdfaHtml(textarea.value, format);
    htmlOutput.textContent = rdfaHtml;
    preview.innerHTML = rdfaHtml;

    const subjects = extractRdfaSubjectsFromDom(preview);
    subjectsOutput.textContent = JSON.stringify(subjects, null, 2);
    status.textContent = `Rendered ${subjects.length} subject(s)`;
  } catch (error) {
    status.textContent = `Error: ${(error as Error).message}`;
    console.error(error);
  }
};

convertBtn.addEventListener("click", render);
textarea.addEventListener("input", () => {
  status.textContent = "Ready";
});
formatSelect.addEventListener("change", render);

render();
