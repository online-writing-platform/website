// @ts-check

import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
    files: ["src/**/*.ts"],

    extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
    ],

    languageOptions: {
        globals: globals.node,

        parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
        },
    },

    rules: {
        "@typescript-eslint/consistent-type-imports": [
            "error",
            {
                prefer: "type-imports",
                fixStyle: "inline-type-imports",
            },
        ],

        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            },
        ],
    },
});
