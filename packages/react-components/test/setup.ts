import { Window } from "happy-dom";
import "@testing-library/jest-dom";

const windowInstance = new Window();

const globals = {
  window: windowInstance.window,
  document: windowInstance.document,
  navigator: windowInstance.navigator,
  HTMLElement: windowInstance.HTMLElement,
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
