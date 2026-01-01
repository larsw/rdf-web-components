import { Window } from "happy-dom";
import "@testing-library/jest-dom";

const windowInstance = new Window();

const documentInstance = windowInstance.document;

if (!documentInstance.body) {
  const body = documentInstance.createElement("body");
  documentInstance.appendChild(body);
}

if (!documentInstance.head) {
  const head = documentInstance.createElement("head");
  documentInstance.documentElement.prepend(head);
}

const globals = {
  window: windowInstance.window,
  document: documentInstance,
  navigator: windowInstance.navigator,
  HTMLElement: windowInstance.HTMLElement,
  HTMLInputElement: windowInstance.HTMLInputElement,
  HTMLSelectElement: windowInstance.HTMLSelectElement,
  HTMLTextAreaElement: windowInstance.HTMLTextAreaElement,
  customElements: windowInstance.customElements,
  Node: windowInstance.Node
} as const;

Object.assign(globalThis, globals);

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = id => clearTimeout(id);
}
