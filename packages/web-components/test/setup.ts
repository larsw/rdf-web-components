import { Window } from "happy-dom";

const windowInstance = new Window();
const windowObject = windowInstance.window;

const globals = {
  window: windowObject,
  document: windowObject.document,
  navigator: windowObject.navigator,
  HTMLElement: windowObject.HTMLElement,
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
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
