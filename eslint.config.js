import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const COLOR_LITERAL = "/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "mock-public",
      "public",
      "playwright-report",
      "test-results",
      "src/api/schema.d.ts",
      "scripts",
      ".claude",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: { react: { version: "18.3" } },
    plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y, "import-x": importX },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      "react/no-danger": "error",
      // radio cards nest their text a few spans deep
      "jsx-a11y/label-has-associated-control": ["error", { assert: "either", depth: 4 }],
      // scrollable text regions must be keyboard-focusable (axe scrollable-region-focusable)
      "jsx-a11y/no-noninteractive-tabindex": ["error", { roles: ["region", "tabpanel"] }],
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "no-console": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${COLOR_LITERAL}]`,
          message: "No hardcoded colors: use tokens (src/styles/tokens.css).",
        },
        {
          selector: `TemplateElement[value.raw=${COLOR_LITERAL}]`,
          message: "No hardcoded colors: use tokens (src/styles/tokens.css).",
        },
        {
          selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
          message: "Never assign innerHTML/outerHTML (SECURITY.md §6).",
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "Never use insertAdjacentHTML (SECURITY.md §6).",
        },
      ],
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/api/schema"], message: "Import API types from @/api/types." }] },
      ],
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "@/**", group: "internal" },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          "newlines-between": "never",
        },
      ],
    },
  },
  ...pluginQuery.configs["flat/recommended"],
  {
    files: ["src/api/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/mocks/**", "e2e/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: ["*.config.{js,ts}", "e2e/**"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["eslint.config.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
