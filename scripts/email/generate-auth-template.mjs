import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildConfirmationTemplate } from "../../supabase/functions/_shared/confirmationEmail.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { html, subject } = buildConfirmationTemplate();
// Format the HTML with Biome; the preceding Go assignments are not HTML.
const documentStart = html.indexOf("<!doctype html>");
const formatted =
  html.slice(0, documentStart) +
  execFileSync(
    "yarn",
    [
      "biome",
      "format",
      "--write",
      "--html-formatter-enabled=true",
      "--stdin-file-path=email-preview.html",
    ],
    { cwd: root, input: html.slice(documentStart), encoding: "utf8" },
  );
const configPath = `${root}supabase/config.toml`;
const config = readFileSync(configPath, "utf8");
if (!/\[auth\.email\.template\.confirmation\]\nsubject = /.test(config)) {
  throw new Error("Missing Auth confirmation subject in supabase/config.toml");
}
const updatedConfig = config.replace(
  /(\[auth\.email\.template\.confirmation\]\n)subject = [^\n]*/,
  `$1subject = ${JSON.stringify(subject)}`,
);
const files = [
  [`${root}supabase/templates/confirmation.html`, formatted],
  [`${root}supabase/templates/confirmation.subject.txt`, `${subject}\n`],
  [configPath, updatedConfig],
];
if (process.argv.includes("--check")) {
  for (const [path, expected] of files) {
    if (readFileSync(path, "utf8") !== expected) {
      throw new Error(
        `Auth template is outdated: ${path}. Run yarn email:generate.`,
      );
    }
  }
  console.log("Auth email template, subject and local config are in sync.");
} else {
  for (const [path, contents] of files) writeFileSync(path, contents);
  console.log("Generated Auth email template and localized subject.");
}
