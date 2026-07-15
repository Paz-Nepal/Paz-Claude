// @paz/config shared ESLint flat config.
// Consumers spread this array and append project-specific overrides.
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export const pazBaseConfig = [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.generated.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        // Root-level tooling config files (vite.config.ts, vitest.config.ts,
        // etc.) live outside each package's `src`-scoped tsconfig `include`;
        // this lets typescript-eslint parse them with a one-off default
        // program instead of failing to find a covering project.
        projectService: {
          allowDefaultProject: ["*.config.ts", "*.config.mjs", "*.config.js"],
        },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      boundaries,
    },
    settings: {
      react: { version: "detect" },
      "boundaries/elements": [
        { type: "module", pattern: "src/modules/*", mode: "folder" },
        { type: "lib", pattern: "src/lib/*", mode: "folder" },
        { type: "app", pattern: "src/app/*", mode: "folder" },
      ],
    },
    rules: {
      ...tseslint.configs["recommended-type-checked"].rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // Undefined variables and unused imports are real bugs, not style.
      "no-undef": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Module boundary enforcement — the architectural rule made mechanical.
      // A module may only be imported through its index.ts public surface.
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "module", allow: ["lib"] },
            {
              from: "module",
              allow: [["module", { imported: ["index"] }]],
            },
            { from: "app", allow: ["module", "lib", "app"] },
            { from: "lib", allow: ["lib"] },
          ],
        },
      ],

      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];

export default pazBaseConfig;
