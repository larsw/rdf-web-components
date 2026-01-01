// This file has been automatically migrated to valid ESM format by Storybook.
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);
const packageDir = dirname(fileURLToPath(import.meta.url));
const localModules = resolve(packageDir, "..", "node_modules");

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx|mdx)", "../src/**/*.stories.@(js|jsx)"],
  addons: [getAbsolutePath("@storybook/addon-a11y"), getAbsolutePath("@storybook/addon-docs")],

  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {}
  },
  viteFinal: (config) => {
    config.resolve = config.resolve ?? {};
    const alias = Array.isArray(config.resolve.alias) ? config.resolve.alias : [];
    alias.push(
      {
        find: "@digdir/designsystemet-css",
        replacement: resolve(localModules, "@digdir", "designsystemet-css")
      },
      {
        find: "@digdir/designsystemet-css/theme",
        replacement: resolve(
          localModules,
          "@digdir",
          "designsystemet-css",
          "dist",
          "theme",
          "designsystemet.css"
        )
      }
    );
    config.resolve.alias = alias;
    return config;
  }
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
