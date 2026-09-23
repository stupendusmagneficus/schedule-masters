import { execFileSync } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = process.cwd();
const diagramsRoot = path.join(
  repositoryRoot,
  "docs",
  "architecture",
  "diagrams",
);
function getEnvironmentVariable(name) {
  return Reflect.get(process.env, name);
}

const reportRoot = path.resolve(
  getEnvironmentVariable("ARCHIFY_REPORT_DIR") ??
    path.join(repositoryRoot, "artifacts", "archify"),
);
const archifyCli = path.join(
  repositoryRoot,
  ".agents",
  "skills",
  "archify",
  "bin",
  "archify.mjs",
);
const supportedTypes = new Set([
  "architecture",
  "workflow",
  "sequence",
  "dataflow",
  "lifecycle",
]);

async function findDiagramSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const sources = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      sources.push(...(await findDiagramSources(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      sources.push(entryPath);
    }
  }

  return sources.sort();
}

function diagramType(sourcePath) {
  const relativePath = path.relative(diagramsRoot, sourcePath);
  const [type] = relativePath.split(path.sep);

  if (!supportedTypes.has(type)) {
    throw new Error(
      `Unsupported Archify diagram directory for ${relativePath}. Use one of: ${[
        ...supportedTypes,
      ].join(", ")}.`,
    );
  }

  return type;
}

function diagramName(sourcePath) {
  return path.basename(sourcePath, ".json");
}

function runArchify(args) {
  try {
    return {
      exitCode: 0,
      output: execFileSync(process.execPath, [archifyCli, ...args], {
        cwd: repositoryRoot,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

async function writeResult(resultPath, output) {
  await writeFile(resultPath, output, "utf8");
}

async function main() {
  await mkdir(reportRoot, { recursive: true });

  const sources = await findDiagramSources(diagramsRoot);
  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: path.relative(repositoryRoot, diagramsRoot),
    diagrams: [],
  };

  for (const sourcePath of sources) {
    const type = diagramType(sourcePath);
    const name = diagramName(sourcePath);
    const outputDirectory = path.join(reportRoot, type, name);
    const relativeSource = path.relative(repositoryRoot, sourcePath);
    const htmlPath = path.join(outputDirectory, `${name}.html`);

    await mkdir(outputDirectory, { recursive: true });

    const validation = runArchify([
      "validate",
      type,
      relativeSource,
      "--quality",
      "showcase",
      "--json",
    ]);
    await writeResult(
      path.join(outputDirectory, "validation.json"),
      validation.output,
    );

    const result = {
      name,
      type,
      source: relativeSource,
      validation: validation.exitCode === 0 ? "passed" : "failed",
      delivery: "skipped",
      visualCheck: "skipped",
    };

    if (validation.exitCode === 0) {
      const delivery = runArchify([
        "deliver",
        type,
        relativeSource,
        htmlPath,
        "--quality",
        "showcase",
        "--json",
      ]);
      result.delivery = delivery.exitCode === 0 ? "passed" : "failed";
      await writeResult(
        path.join(outputDirectory, "delivery.json"),
        delivery.output,
      );

      if (delivery.exitCode === 0) {
        const visualCheck = runArchify(["visual-check", htmlPath, "--json"]);
        result.visualCheck = visualCheck.exitCode === 0 ? "passed" : "failed";
        await writeResult(
          path.join(outputDirectory, "visual-check.json"),
          visualCheck.output,
        );
      }
    }

    report.diagrams.push(result);
  }

  const failed = report.diagrams.filter((diagram) =>
    [diagram.validation, diagram.delivery, diagram.visualCheck].includes(
      "failed",
    ),
  );
  const summaryLines = [
    "# Archify report",
    "",
    sources.length === 0
      ? "No Archify diagram sources changed in this revision."
      : `Checked ${sources.length} Archify diagram source${sources.length === 1 ? "" : "s"}.`,
    "",
  ];

  if (sources.length > 0) {
    summaryLines.push(
      "| Diagram | Validation | Delivery | Visual check |",
      "| --- | --- | --- | --- |",
    );
    for (const diagram of report.diagrams) {
      summaryLines.push(
        `| \`${diagram.source}\` | ${diagram.validation} | ${diagram.delivery} | ${diagram.visualCheck} |`,
      );
    }
    summaryLines.push("");
  }

  summaryLines.push(
    failed.length === 0
      ? "Result: all Archify checks passed."
      : `Result: ${failed.length} diagram${failed.length === 1 ? "" : "s"} failed. See the uploaded artifact for details.`,
  );

  await writeFile(
    path.join(reportRoot, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reportRoot, "summary.md"),
    `${summaryLines.join("\n")}\n`,
    "utf8",
  );

  if (getEnvironmentVariable("GITHUB_STEP_SUMMARY")) {
    await writeFile(
      getEnvironmentVariable("GITHUB_STEP_SUMMARY"),
      `${summaryLines.join("\n")}\n`,
      "utf8",
    );
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
