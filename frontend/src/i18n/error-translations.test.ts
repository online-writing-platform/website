import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import { additionalErrorTranslations } from "./error-translations";
import en from "./locales/en/translation.json";
import fa from "./locales/fa/translation.json";

const backendRoot = fileURLToPath(
  new URL("../../../backend/src/", import.meta.url),
);

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return listTypeScriptFiles(path);
    if (!entry.isFile()) return [];
    if (!/\.tsx?$/u.test(entry.name)) return [];
    if (/\.test\.tsx?$/u.test(entry.name)) return [];

    return [path];
  });
}

function stringValue(node: ts.Node | undefined): string | null {
  return node && ts.isStringLiteralLike(node) ? node.text : null;
}

function collectBackendErrorCodes(): Set<string> {
  const codes = new Set<string>(["APPLICATION_ERROR"]);

  for (const file of listTypeScriptFiles(backendRoot)) {
    const source = readFileSync(file, "utf8");
    const scriptKind = extname(file) === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );

    const visit = (node: ts.Node): void => {
      if (
        ts.isMethodDeclaration(node) &&
        ts.isClassDeclaration(node.parent) &&
        node.parent.name?.text === "AppError"
      ) {
        for (const parameter of node.parameters) {
          if (
            ts.isIdentifier(parameter.name) &&
            parameter.name.text === "code"
          ) {
            const code = stringValue(parameter.initializer);
            if (code) codes.add(code);
          }
        }
      }

      if (ts.isCallExpression(node)) {
        if (
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === "AppError"
        ) {
          const code = stringValue(node.arguments[1]);
          if (code) codes.add(code);
        }

        if (ts.isIdentifier(node.expression) && node.expression.text === "policy") {
          const code = stringValue(node.arguments[3]);
          if (code) codes.add(code);
        }
      }

      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "AppError"
      ) {
        const options = node.arguments?.[2];
        if (options && ts.isObjectLiteralExpression(options)) {
          for (const property of options.properties) {
            if (
              ts.isPropertyAssignment(property) &&
              ts.isIdentifier(property.name) &&
              property.name.text === "code"
            ) {
              const code = stringValue(property.initializer);
              if (code) codes.add(code);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return codes;
}

const enErrors: Record<string, unknown> = {
  ...en.errors,
  ...additionalErrorTranslations.en,
};
const faErrors: Record<string, unknown> = {
  ...fa.errors,
  ...additionalErrorTranslations.fa,
};

describe("error translation coverage", () => {
  it("keeps additional Persian and English error keys aligned", () => {
    expect(Object.keys(additionalErrorTranslations.fa).sort()).toEqual(
      Object.keys(additionalErrorTranslations.en).sort(),
    );
  });

  it("has Persian and English translations for every backend error code", () => {
    const backendCodes = [...collectBackendErrorCodes()].sort();
    const missingEnglish = backendCodes.filter(
      (code) => typeof enErrors[code] !== "string",
    );
    const missingPersian = backendCodes.filter(
      (code) => typeof faErrors[code] !== "string",
    );

    expect(backendCodes.length).toBeGreaterThan(60);
    expect(missingEnglish).toEqual([]);
    expect(missingPersian).toEqual([]);
  });
});
