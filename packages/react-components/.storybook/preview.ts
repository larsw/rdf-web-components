import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import { Classes } from "@blueprintjs/core";
import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  globalTypes: {
    colorScheme: {
      name: "Color scheme",
      description: "Blueprint color scheme",
      defaultValue: "dark",
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark"],
      },
    },
  },
  decorators: [
    (Story, context) => {
      if (typeof document !== "undefined") {
        const isDark = (context.globals.colorScheme ?? "dark") === "dark";
        document.body.classList.toggle(Classes.DARK, isDark);
        document.body.style.background = isDark ? "#1c2127" : "#f6f7f9";
      }
      return Story();
    },
  ],
  parameters: {
    backgrounds: { disable: true },
    layout: "centered",
    controls: { expanded: true },
  },
};

export default preview;
