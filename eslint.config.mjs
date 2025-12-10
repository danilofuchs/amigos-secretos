import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
]);

export default eslintConfig;
