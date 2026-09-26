import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const event = readEvent();
const pullRequest = event?.pull_request;
const pullRequestBody =
  pullRequest?.body ?? readEnvironmentVariable("PR_BODY") ?? "";
const changedFiles = getChangedFiles(pullRequest);

if (!changedFiles.some(isUserFacingUiFile)) {
  console.log("Design review: no user-facing UI files changed.");
  process.exit(0);
}

const requiredChecks = [
  /-\s*\[x\]\s*I completed the design review checklist\./i,
  /-\s*\[x\]\s*I checked spacing, typography, layout, and responsive behavior at the affected viewport sizes\./i,
  /-\s*\[x\]\s*I checked accessibility, touch targets, focus\/keyboard behavior, loading, error, empty, and disabled states\./i,
  /-\s*\[x\]\s*I attached visual evidence or explained why visual evidence is not applicable\./i,
];

const missingChecks = requiredChecks.filter(
  (pattern) => !pattern.test(pullRequestBody),
);
const evidenceLine = pullRequestBody.match(/^Visual evidence:\s*(.*)$/im);
const evidence = evidenceLine?.[1]?.trim() ?? "";

if (missingChecks.length > 0 || evidence.length === 0) {
  console.error("Design review is required for this UI change.");
  console.error(
    "Complete the Design review section in .github/pull_request_template.md and add a non-empty Visual evidence: line.",
  );
  process.exit(1);
}

console.log(
  `Design review: passed for ${changedFiles.filter(isUserFacingUiFile).length} user-facing UI file(s).`,
);

function readEvent() {
  const eventPath = readEnvironmentVariable("GITHUB_EVENT_PATH");
  if (!eventPath) return null;

  try {
    return JSON.parse(readFileSync(eventPath, "utf8"));
  } catch {
    return null;
  }
}

function getChangedFiles(pr) {
  const range = pr ? `${pr.base.sha}...${pr.head.sha}` : "origin/main...HEAD";

  try {
    return execFileSync("git", ["diff", "--name-only", range], {
      encoding: "utf8",
    })
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isUserFacingUiFile(file) {
  return (
    file.startsWith("apps/mobile/src/") ||
    file.startsWith("apps/booking-web/") ||
    file.startsWith("packages/design-tokens/") ||
    file.startsWith("docs/design/") ||
    /\.(css|scss|sass|less|tsx|jsx|html)$/.test(file)
  );
}

function readEnvironmentVariable(name) {
  return process.env[name];
}
