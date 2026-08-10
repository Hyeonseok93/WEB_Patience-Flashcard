import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Experimental react-compiler heuristic. It flags legitimate patterns we rely on
      // (mount-time data fetch, derived one-shot animation state) that can't be expressed
      // without awkward workarounds, so it's disabled. The genuinely useful hook rules
      // (rules-of-hooks, exhaustive-deps, refs) stay on and already caught a real bug.
      "react-hooks/set-state-in-effect": "off",
    },
  },
);
