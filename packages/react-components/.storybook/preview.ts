import "../node_modules/@digdir/designsystemet-css/dist/src/index.css";
import "../node_modules/@digdir/designsystemet-css/dist/theme/designsystemet.css";
import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  globalTypes: {
    colorScheme: {
      name: "Color scheme",
      description: "Designsystemet color scheme",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark"]
      }
    }
  },
  decorators: [
    (Story, context) => {
      if (typeof document !== "undefined") {
        const scheme = context.globals.colorScheme ?? "light";
        document.documentElement.setAttribute("data-color-scheme", scheme);
        document.body?.setAttribute("data-color-scheme", scheme);
      }
      return Story();
    }
  ],
  parameters: {
    layout: "centered",
    controls: { expanded: true }
  }
};

export default preview;
