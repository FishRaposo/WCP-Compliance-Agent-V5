// Flat ESLint config for the TypeScript workspaces (gateway, web).
// Intentionally lean: the primary type-safety gate is `tsc --noEmit`; ESLint
// here catches a focused set of correctness smells without stylistic noise.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.config.{js,ts,mjs,cjs}",
      "**/*.timestamp-*.mjs",
      "**/vite-env.d.ts",
      "packages/contracts/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // tsc already enforces typed safety; keep ESLint focused and quiet.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  }
);
