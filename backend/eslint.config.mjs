// @ts-check

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
    {
        ignores: ["dist/**", "src/generated/**", "node_modules/**"],
    },

    {
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
                tsconfigRootDir,
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

            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
        },
    },
);
