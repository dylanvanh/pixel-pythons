import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      buffer: "buffer/",
      // Workers supply fetch; avoid Supabase's legacy Node HTTP fallback.
      "@supabase/node-fetch": "@supabase/node-fetch/browser.js",
    },
  },
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  environments: {
    ssr: {
      optimizeDeps: {
        include: ["pngjs/browser", "buffer/"],
      },
    },
  },
  plugins: [
    ...(process.env.VITEST
      ? []
      : [cloudflare({ inspectorPort: false, viteEnvironment: { name: "ssr" } }), tanstackStart()]),
    react(),
  ],
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["typescript", "react", "jsx-a11y"],
    rules: {
      curly: ["error", "all"],
      "no-nested-ternary": "error",
    },
    ignorePatterns: [
      ".claude/**",
      "src/routeTree.gen.ts",
      "dist/**",
      "out/**",
      "cache/**",
      ".next/**",
    ],
  },
  fmt: {
    ignorePatterns: [
      ".claude/**",
      "src/routeTree.gen.ts",
      "dist/**",
      "out/**",
      "cache/**",
      ".next/**",
      "bun.lock",
    ],
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
