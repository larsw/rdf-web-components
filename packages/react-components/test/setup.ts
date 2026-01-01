import { Window } from "happy-dom";
import "@testing-library/jest-dom";

const windowInstance = new Window();

const windowObject = windowInstance.window;
const documentInstance = windowObject.document;
let documentElement = documentInstance.documentElement;

if (!documentElement) {
  documentElement = documentInstance.createElement("html");
  documentInstance.appendChild(documentElement);
}

if (!documentInstance.head) {
  const head = documentInstance.createElement("head");
  documentElement.appendChild(head);
}

if (!documentInstance.body) {
  const body = documentInstance.createElement("body");
  documentElement.appendChild(body);
}

const globals = {
  window: windowObject,
  document: documentInstance,
  navigator: windowObject.navigator,
  HTMLElement: windowObject.HTMLElement,
  HTMLInputElement: windowObject.HTMLInputElement,
  HTMLSelectElement: windowObject.HTMLSelectElement,
  HTMLTextAreaElement: windowObject.HTMLTextAreaElement,
  customElements: windowObject.customElements,
  Node: windowObject.Node,
} as const;

for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, {
    value,
    writable: true,
    configurable: true,
  });
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) =>
    setTimeout(() => cb(Date.now()), 0);
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
