import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildConfirmationTemplate } from "../../supabase/functions/_shared/confirmationEmail.ts";
import { buildRecoveryTemplate } from "../../supabase/functions/_shared/recoveryEmail.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const configPath = `${root}supabase/config.toml`;
let updatedConfig = readFileSync(configPath, "utf8");
const files = [];
for (const [kind, template] of [
  ["confirmation", buildConfirmationTemplate],
  ["recovery", buildRecoveryTemplate],
]) {
  const { html, subject } = template();
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
  const pattern = new RegExp(
    `(\\[auth\\.email\\.template\\.${kind}\\]\n)subject = [^\n]*`,
  );
  if (!pattern.test(updatedConfig))
    throw new Error(`Missing Auth ${kind} configuration`);
  updatedConfig = updatedConfig.replace(
    pattern,
    `$1subject = ${JSON.stringify(subject)}`,
  );
  files.push(
    [`${root}supabase/templates/${kind}.html`, formatted],
    [`${root}supabase/templates/${kind}.subject.txt`, `${subject}\n`],
  );
}
files.push([configPath, updatedConfig]);
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
