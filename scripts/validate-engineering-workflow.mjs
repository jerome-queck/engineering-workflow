#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const REQUIRED_FILES = [
  "AGENTS.md",
  "CONTRIBUTING.md",
  "README.md",
  "skills-lock.json",
  "docs/agents/domain.md",
  "docs/agents/engineering-workflow.md",
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  ".github/pull_request_template.md",
  ".github/workflows/workflow-integrity.yml",
  "scripts/lib/github-repository.mjs",
  "scripts/resolve-github-repo.mjs",
  "scripts/bootstrap-engineering-workflow.mjs",
  "scripts/validate-engineering-workflow.mjs",
  "tests/workflow/workflow-cli.test.mjs",
];

const PORTABLE_FILES = REQUIRED_FILES.filter((file) =>
  file !== "skills-lock.json" && !file.startsWith("tests/"));
const REQUIRED_LABELS = [
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
  "wontfix",
];
const MARKDOWN_SCAN_EXCLUSIONS = new Set([
  ".claude",
  ".git",
  "node_modules",
]);

function usage() {
  return "Usage: node scripts/validate-engineering-workflow.mjs [--root PATH] [--github]";
}

function parseArguments(argv) {
  let root = process.cwd();
  let github = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--root requires a path");
      }
      root = value;
      index += 1;
    } else if (argument === "--github") {
      github = true;
    } else if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return { root: path.resolve(root), github };
}

function compareNames(left, right) {
  return left.localeCompare(right);
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item)).sort(compareNames);
}

async function isRegularFile(filePath) {
  try {
    return (await lstat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function immediateEntries(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return null;
  }
}

async function filesBelow(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await filesBelow(absolutePath, base));
    } else if (entry.isFile()) {
      files.push({
        absolutePath,
        relativePath: path.relative(base, absolutePath).split(path.sep).join("/"),
      });
    } else {
      throw new Error(`unsupported non-file entry ${path.relative(base, absolutePath)}`);
    }
  }

  return files;
}

async function officialFolderHash(directory) {
  const files = (await filesBelow(directory)).sort((left, right) =>
    compareNames(left.relativePath, right.relativePath));
  const hash = createHash("sha256");

  for (const file of files) {
    hash.update(file.relativePath);
    hash.update(await readFile(file.absolutePath));
  }

  return hash.digest("hex");
}

function frontmatterName(contents) {
  const frontmatter = contents.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) return null;
  const name = frontmatter[1].match(/^name:\s*(.+?)\s*$/m);
  if (!name) return null;
  const value = name[1].replace(/\s+#.*$/, "").trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function isExplicitOnly(contents) {
  const frontmatter = contents.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return frontmatter ? /^disable-model-invocation:\s*true\s*(?:#.*)?$/m.test(frontmatter[1]) : false;
}

function readmeInvocation(readme, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const row = new RegExp(`^\\|\\s*\`?/${escapedName}\`?\\s*\\|\\s*(Explicit|Automatic)\\s*\\|`, "m");
  return readme.match(row)?.[1] ?? null;
}

async function validateInventory(root, errors) {
  const lockPath = path.join(root, "skills-lock.json");
  let lock;

  try {
    lock = JSON.parse(await readFile(lockPath, "utf8"));
  } catch (error) {
    errors.push(`skills-lock.json cannot be parsed: ${error.message}`);
    return;
  }

  if (lock?.version !== 1 || !lock.skills || typeof lock.skills !== "object" || Array.isArray(lock.skills)) {
    errors.push("skills-lock.json must contain version 1 and a skills object");
    return;
  }

  const lockNames = Object.keys(lock.skills).sort(compareNames);
  if (lockNames.length === 0) {
    errors.push("skills-lock.json has no skills");
  }

  for (const name of lockNames) {
    const entry = lock.skills[name];
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      errors.push(`invalid locked skill name: ${name}`);
    }
    if (!entry || typeof entry !== "object") {
      errors.push(`locked skill ${name} has no metadata`);
      continue;
    }
    for (const field of ["source", "sourceType", "skillPath", "computedHash"]) {
      if (typeof entry[field] !== "string" || entry[field].length === 0) {
        errors.push(`locked skill ${name} has invalid ${field}`);
      }
    }
    if (typeof entry.skillPath === "string" && !entry.skillPath.endsWith(`/${name}/SKILL.md`)) {
      errors.push(`locked skill ${name} has a mismatched skillPath`);
    }
    if (typeof entry.computedHash === "string" && !/^[a-f0-9]{64}$/.test(entry.computedHash)) {
      errors.push(`locked skill ${name} has an invalid computedHash`);
    }
  }

  const agentsRoot = path.join(root, ".agents", "skills");
  const agentEntries = await immediateEntries(agentsRoot);
  if (!agentEntries) {
    errors.push("missing .agents/skills directory");
    return;
  }
  const agentNames = agentEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(compareNames);
  for (const entry of agentEntries.filter((item) => !item.isDirectory())) {
    errors.push(`unexpected non-directory in .agents/skills: ${entry.name}`);
  }

  const claudeRoot = path.join(root, ".claude", "skills");
  const claudeEntries = await immediateEntries(claudeRoot);
  if (!claudeEntries) {
    errors.push("missing .claude/skills directory");
    return;
  }
  const claudeNames = claudeEntries.map((entry) => entry.name).sort(compareNames);

  for (const [label, names] of [[".agents/skills", agentNames], [".claude/skills", claudeNames]]) {
    const missing = difference(lockNames, names);
    const unexpected = difference(names, lockNames);
    if (missing.length > 0) errors.push(`${label} missing locked skills: ${missing.join(", ")}`);
    if (unexpected.length > 0) errors.push(`${label} has unlocked skills: ${unexpected.join(", ")}`);
  }

  let readme = "";
  try {
    readme = await readFile(path.join(root, "README.md"), "utf8");
  } catch {
    // The required-file check reports this separately.
  }

  for (const name of lockNames) {
    const skillRoot = path.join(agentsRoot, name);
    const skillFile = path.join(skillRoot, "SKILL.md");
    if (!await isRegularFile(skillFile)) {
      errors.push(`skill ${name} is missing SKILL.md`);
    } else {
      const skillContents = await readFile(skillFile, "utf8");
      const declaredName = frontmatterName(skillContents);
      if (declaredName !== name) {
        errors.push(`skill ${name} frontmatter name is ${declaredName ?? "missing"}`);
      }
      const expectedInvocation = isExplicitOnly(skillContents) ? "Explicit" : "Automatic";
      const documentedInvocation = readmeInvocation(readme, name);
      if (documentedInvocation !== expectedInvocation) {
        errors.push(`README.md invocation for /${name} is ${documentedInvocation ?? "missing"}; expected ${expectedInvocation}`);
      }
      try {
        const actualHash = await officialFolderHash(skillRoot);
        if (actualHash !== lock.skills[name]?.computedHash) {
          errors.push(`skill ${name} hash differs from skills-lock.json`);
        }
      } catch (error) {
        errors.push(`skill ${name} hash failed: ${error.message}`);
      }
    }

    const claudeLink = path.join(claudeRoot, name);
    try {
      const linkMetadata = await lstat(claudeLink);
      if (!linkMetadata.isSymbolicLink()) {
        errors.push(`.claude/skills/${name} must be a symlink`);
      } else {
        const target = await readlink(claudeLink);
        const expected = `../../.agents/skills/${name}`;
        if (path.isAbsolute(target)) {
          errors.push(`.claude/skills/${name} symlink must be relative`);
        }
        if (target !== expected) {
          errors.push(`.claude/skills/${name} symlink target must be ${expected}`);
        }
        try {
          if (!(await stat(claudeLink)).isDirectory()) {
            errors.push(`.claude/skills/${name} symlink target is not a directory`);
          }
        } catch {
          errors.push(`.claude/skills/${name} symlink is dangling`);
        }
      }
    } catch {
      errors.push(`missing .claude/skills/${name} symlink`);
    }

    if (!readme.includes(`/${name}`)) {
      errors.push(`README.md does not mention /${name}`);
    }
  }
}

async function markdownFilesBelow(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && MARKDOWN_SCAN_EXCLUSIONS.has(entry.name)) continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await markdownFilesBelow(absolutePath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push({ absolutePath, relativePath });
    }
  }

  return files;
}

function markdownDestination(rawDestination) {
  const value = rawDestination.trim();
  if (value.startsWith("<")) {
    const end = value.indexOf(">");
    return end === -1 ? value.slice(1) : value.slice(1, end);
  }
  return value.match(/^\S+/)?.[0] ?? "";
}

async function destinationExists(root, sourcePath, rawDestination) {
  const destination = markdownDestination(rawDestination);
  if (!destination || destination.startsWith("#") || destination.startsWith("//") ||
      /^[a-z][a-z\d+.-]*:/i.test(destination)) {
    return true;
  }

  const withoutFragment = destination.split("#", 1)[0].split("?", 1)[0];
  if (!withoutFragment) return true;

  let decoded;
  try {
    decoded = decodeURIComponent(withoutFragment.replace(/\\([() ])/g, "$1"));
  } catch {
    return false;
  }

  const target = decoded.startsWith("/")
    ? path.join(root, decoded.slice(1))
    : path.resolve(path.dirname(sourcePath), decoded);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return false;
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function validateMarkdownLinks(root, errors) {
  let markdownFiles;
  try {
    markdownFiles = await markdownFilesBelow(root);
  } catch (error) {
    errors.push(`cannot scan Markdown links: ${error.message}`);
    return;
  }

  for (const file of markdownFiles) {
    const contents = (await readFile(file.absolutePath, "utf8"))
      .replace(/^\s*(```|~~~)[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, "");
    const destinations = [];
    const inlineLink = /(?<!!)\[[^\]\n]*\]\(([^)\n]+)\)/g;
    const referenceTarget = /^\s{0,3}\[[^\]\n]+\]:\s*(\S+)/gm;
    for (const match of contents.matchAll(inlineLink)) destinations.push(match[1]);
    for (const match of contents.matchAll(referenceTarget)) destinations.push(match[1]);

    for (const destination of destinations) {
      if (!await destinationExists(root, file.absolutePath, destination)) {
        errors.push(`broken Markdown link in ${file.relativePath}: ${markdownDestination(destination)}`);
      }
    }
  }
}

async function validatePortability(root, errors) {
  for (const relativePath of PORTABLE_FILES) {
    const absolutePath = path.join(root, relativePath);
    if (!await isRegularFile(absolutePath)) continue;
    const contents = await readFile(absolutePath, "utf8");

    if (/\/(?:Users|Volumes)\//.test(contents)) {
      errors.push(`${relativePath} contains a non-portable absolute /Users or /Volumes path`);
    }

    const lines = contents.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const hardcodedUrl = /(?:https?:\/\/github\.com\/|git@github\.com:)[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/i.test(line);
      const hardcodedScope = /(?:--repo\s+|repos\/|(?:GH_)?REPO\s*=\s*)["'`]?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i.test(line);
      if (hardcodedUrl || hardcodedScope) {
        errors.push(`${relativePath}:${index + 1} hardcodes a GitHub owner/repository; resolve origin instead`);
      }
    }
  }

  for (const relativePath of ["docs/agents/engineering-workflow.md", "docs/agents/issue-tracker.md"]) {
    const absolutePath = path.join(root, relativePath);
    if (!await isRegularFile(absolutePath)) continue;
    const contents = await readFile(absolutePath, "utf8");
    if (!/\borigin\b/i.test(contents) || !/resolve-github-repo\.mjs/.test(contents)) {
      errors.push(`${relativePath} must route GitHub operations from origin through resolve-github-repo.mjs`);
    }

    const logicalLines = [];
    let pending = "";
    for (const physicalLine of contents.split(/\r?\n/)) {
      const continuation = /\\\s*$/.test(physicalLine);
      pending += `${pending ? " " : ""}${physicalLine.replace(/\\\s*$/, "").trim()}`;
      if (!continuation) {
        logicalLines.push(pending);
        pending = "";
      }
    }
    if (pending) logicalLines.push(pending);

    for (const line of logicalLines) {
      for (const command of line.matchAll(/\bgh\s+(issue|pr|label)\b(.*?)(?=\bgh\s+|$)/gi)) {
        if (!/--repo(?:\s|=)/.test(command[0])) {
          errors.push(`${relativePath} contains an unscoped gh ${command[1]} command; pass --repo "$REPO"`);
        }
      }
      for (const command of line.matchAll(/\bgh\s+api\b(.*?)(?=\bgh\s+|$)/gi)) {
        if (!/repos\/\$(?:REPO|\{REPO\})(?:\/|["'`]|$)/.test(command[0])) {
          errors.push(`${relativePath} contains an unscoped gh api command; use repos/$REPO`);
        }
      }
    }
  }
}

async function runCommand(command, args, cwd) {
  return execFile(command, args, { cwd, encoding: "utf8", maxBuffer: 1024 * 1024 });
}

async function validateGithub(root, errors) {
  try {
    const resolver = path.join(root, "scripts", "resolve-github-repo.mjs");
    const resolved = (await runCommand(process.execPath, [resolver], root)).stdout.trim();
    if (!/^[^/\s]+\/[^/\s]+$/.test(resolved)) {
      throw new Error(`resolver returned invalid repository: ${resolved || "empty output"}`);
    }

    const defaultRepo = (await runCommand(
      "gh",
      ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
      root,
    )).stdout.trim();
    if (defaultRepo !== resolved) {
      errors.push(`GitHub default repository is ${defaultRepo || "unset"}; origin resolves to ${resolved}`);
    }

    const repository = JSON.parse((await runCommand(
      "gh",
      [
        "repo", "view", resolved,
        "--json",
        "nameWithOwner,defaultBranchRef,hasIssuesEnabled,squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed,deleteBranchOnMerge",
      ],
      root,
    )).stdout);
    if (repository.nameWithOwner !== resolved) {
      errors.push(`GitHub repository lookup returned ${repository.nameWithOwner}; expected ${resolved}`);
    }

    const expectedSettings = {
      hasIssuesEnabled: true,
      squashMergeAllowed: true,
      mergeCommitAllowed: false,
      rebaseMergeAllowed: false,
      deleteBranchOnMerge: true,
    };
    for (const [setting, expected] of Object.entries(expectedSettings)) {
      if (repository[setting] !== expected) {
        errors.push(`GitHub repository ${resolved} has ${setting}=${repository[setting]}; expected ${expected}`);
      }
    }

    const labels = JSON.parse((await runCommand(
      "gh",
      ["label", "list", "--repo", resolved, "--limit", "1000", "--json", "name"],
      root,
    )).stdout).map((label) => label.name);
    const missingLabels = difference(REQUIRED_LABELS, labels);
    if (missingLabels.length > 0) {
      errors.push(`GitHub repository ${resolved} is missing workflow labels: ${missingLabels.join(", ")}`);
    }

    const defaultBranch = repository.defaultBranchRef?.name;
    if (!defaultBranch) {
      errors.push(`GitHub repository ${resolved} has no default branch`);
    } else {
      const protection = JSON.parse((await runCommand(
        "gh",
        ["api", `repos/${resolved}/branches/${encodeURIComponent(defaultBranch)}/protection`],
        root,
      )).stdout);
      if (!protection.required_pull_request_reviews) {
        errors.push(`GitHub default branch ${defaultBranch} does not require pull requests`);
      }

      const statusChecks = protection.required_status_checks;
      const contexts = new Set([
        ...(statusChecks?.contexts ?? []),
        ...(statusChecks?.checks ?? []).map((check) => check.context),
      ]);
      if (!statusChecks?.strict || !contexts.has("workflow-integrity")) {
        errors.push(`GitHub default branch ${defaultBranch} must require strict workflow-integrity status checks`);
      }
    }
  } catch (error) {
    const detail = error.stderr?.trim() || error.message;
    errors.push(`GitHub audit failed: ${detail}`);
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage()}\n`);
    process.exitCode = 2;
    return;
  }

  const errors = [];
  for (const relativePath of REQUIRED_FILES) {
    if (!await isRegularFile(path.join(options.root, relativePath))) {
      errors.push(`missing required file: ${relativePath}`);
    }
  }

  await validateInventory(options.root, errors);
  await validateMarkdownLinks(options.root, errors);
  await validatePortability(options.root, errors);
  if (options.github) await validateGithub(options.root, errors);

  if (errors.length > 0) {
    process.stderr.write(`Engineering workflow validation failed (${errors.length}):\n`);
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Engineering workflow valid: ${options.root}${options.github ? " (including GitHub)" : ""}\n`);
}

await main();
