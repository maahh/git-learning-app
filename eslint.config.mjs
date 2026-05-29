import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        ResizeObserver: "readonly",
        WebSocket: "readonly",
        URL: "readonly",
        process: "readonly",
        React: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-unused-vars": "off",
    },
  },
];
