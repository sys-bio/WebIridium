/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://medium.com/@vitor.vicen.te/setting-up-path-aliases-in-a-vite-typescript-react-project-the-ultimate-way-d2a9a8ff7c63
import path from "path";

/**
 * This plugin includes goat counter only when its production build.
 */
const includeGoatCounterPlugin: Plugin = {
  name: "include-goat-counter",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    handler() {
      return [
        {
          tag: "script",
          attrs: {
            async: true,
            src: "//gc.zgo.at/count.js",
            "data-goatcounter": "https://hsauro.goatcounter.com/count",
          },
          injectTo: "head",
        },
      ];
    },
  },
};

// https://vite.dev/config/
export default defineConfig({
  base: "/WebIridium",
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    svgr(),
    nodePolyfills(),
    includeGoatCounterPlugin,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
  assetsInclude: ["**/*.ant"],

  build: {
    // for whatever reason, vite moves stuff in our public/ directory to assets/ only on build. This messes up libantimony and libcopasi since they can't be imported at their regular path, so we have to disable this feature.
    assetsDir: "",
  },

  test: {
    alias: [
      // https://github.com/vitest-dev/vitest/discussions/1806
      {
        find: /^monaco-editor$/,
        replacement:
          __dirname + "/node_modules/monaco-editor/esm/vs/editor/editor.api",
      },
    ],
    setupFiles: ["./src/vitestSetup.ts", "@vitest/web-worker"],
    environment: "jsdom",
    coverage: {
      include: ["src"],
      exclude: [
        "**/__mocks__/**",
        "src/icons/",
        "src/assets",
        "src/testing-utils",
        "src/third-party/",
        "src/features/editor/language-handler",
      ],
    },
  },
});
