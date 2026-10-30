import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig({ mode: "test", command: "serve" }),
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      typecheck: { include: ["src/**/*.test-d.ts"], tsconfig: "./tsconfig.app.json" },
      coverage: {
        provider: "v8",
        include: ["src/**"],
        exclude: ["src/api/schema.d.ts", "src/test/**", "src/mocks/**"],
      },
    },
  }),
);
