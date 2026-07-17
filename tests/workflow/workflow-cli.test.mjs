import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import test from "node:test";

const execFile = promisify(execFileCallback);
const projectRoot = path.resolve(import.meta.dirname, "../..");
const resolver = path.join(projectRoot, "scripts/resolve-github-repo.mjs");
const bootstrap = path.join(projectRoot, "scripts/bootstrap-engineering-workflow.mjs");
const validator = path.join(projectRoot, "scripts/validate-engineering-workflow.mjs");

async function run(command, args, options = {}) {
  try {
    const result = await execFile(command, args, {
      ...options,
      encoding: "utf8",
      env: { ...process.env, ...options.env },
    });
    return { ...result, code: 0 };
  } catch (error) {
    return {
      code: error.code,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
}

async function initGitRepo(name = "engineering workflow ") {
  const root = await mkdtemp(path.join(tmpdir(), name));
  await execFile("git", ["init", "--quiet"], { cwd: root });
  return root;
}

function protectedMain() {
  return {
    required_pull_request_reviews: {
      dismiss_stale_reviews: false,
      require_code_owner_reviews: false,
      required_approving_review_count: 0,
      require_last_push_approval: false,
    },
    required_status_checks: { strict: true, contexts: ["workflow-integrity"], checks: [] },
    enforce_admins: { enabled: false },
    required_linear_history: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
    required_conversation_resolution: { enabled: true },
  };
}

async function installFakeGh(root, initialState = {}) {
  const bin = path.join(root, "fake-bin");
  const statePath = path.join(root, "gh-state.json");
  const logPath = path.join(root, "gh-calls.jsonl");
  await mkdir(bin);
  await writeFile(
    statePath,
    `${JSON.stringify({
      repo: "acme/target",
      defaultRepo: null,
      originFetchRepo: null,
      defaultBranch: "main",
      hasIssuesEnabled: false,
      squashMergeAllowed: false,
      mergeCommitAllowed: true,
      rebaseMergeAllowed: true,
      deleteBranchOnMerge: false,
      labels: ["custom", "wontfix"],
      protection: null,
      ...initialState,
    })}\n`,
  );
  const fakeGh = path.join(bin, "gh");
  await writeFile(
    fakeGh,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const statePath = process.env.FAKE_GH_STATE;
const logPath = process.env.FAKE_GH_LOG;
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
fs.appendFileSync(logPath, JSON.stringify(args) + "\\n");
const save = () => fs.writeFileSync(statePath, JSON.stringify(state) + "\\n");
const repoFromUrl = (value) => {
  const match = String(value).match(/github\\.com[/:]([^/]+)\\/([^/]+?)(?:\\.git)?$/);
  return match ? match[1] + "/" + match[2] : null;
};
if (args[0] === "repo" && args[1] === "view") {
  const target = args[2] && !args[2].startsWith("-") ? args[2] : state.defaultRepo;
  const repo = repoFromUrl(target) || target || state.repo;
  if (!repo) process.exit(1);
  if (args.includes("--jq")) process.stdout.write(repo + "\\n");
  else process.stdout.write(JSON.stringify({
    nameWithOwner: repo,
    defaultBranchRef: { name: state.defaultBranch },
    hasIssuesEnabled: state.hasIssuesEnabled,
    squashMergeAllowed: state.squashMergeAllowed,
    mergeCommitAllowed: state.mergeCommitAllowed,
    rebaseMergeAllowed: state.rebaseMergeAllowed,
    deleteBranchOnMerge: state.deleteBranchOnMerge,
  }) + "\\n");
} else if (args[0] === "repo" && args[1] === "set-default") {
  if (args[2] === "--view") {
    process.stdout.write((state.defaultRepo || state.originFetchRepo || state.repo) + "\\n");
  } else {
    state.defaultRepo = repoFromUrl(args[2]) || (args[2] === "origin" ? state.originFetchRepo : args[2]) || state.repo;
    save();
  }
} else if (args[0] === "label" && args[1] === "list") {
  process.stdout.write(JSON.stringify(state.labels.map((name) => ({ name }))) + "\\n");
} else if (args[0] === "label" && args[1] === "create") {
  if (!state.labels.includes(args[2])) state.labels.push(args[2]);
  save();
} else if (args[0] === "api" && args.includes("PATCH")) {
  for (const field of args.filter((arg) => arg.includes("="))) {
    const [name, raw] = field.split("=");
    const value = raw === "true" ? true : raw === "false" ? false : raw;
    if (name === "has_issues") state.hasIssuesEnabled = value;
    if (name === "allow_squash_merge") state.squashMergeAllowed = value;
    if (name === "allow_merge_commit") state.mergeCommitAllowed = value;
    if (name === "allow_rebase_merge") state.rebaseMergeAllowed = value;
    if (name === "delete_branch_on_merge") state.deleteBranchOnMerge = value;
  }
  save();
  process.stdout.write("{}\\n");
} else if (args[0] === "api" && args.some((arg) => arg.includes("/protection")) && args.includes("PUT")) {
  const request = JSON.parse(fs.readFileSync(0, "utf8"));
  state.protection = {
    required_pull_request_reviews: request.required_pull_request_reviews,
    required_status_checks: { ...request.required_status_checks, checks: [] },
    enforce_admins: { enabled: request.enforce_admins },
    required_linear_history: { enabled: request.required_linear_history },
    allow_force_pushes: { enabled: request.allow_force_pushes },
    allow_deletions: { enabled: request.allow_deletions },
    required_conversation_resolution: { enabled: request.required_conversation_resolution },
  };
  save();
  process.stdout.write(JSON.stringify(state.protection) + "\\n");
} else if (args[0] === "api" && args[1] && args[1].includes("/protection")) {
  if (!state.protection) {
    process.stderr.write("gh: Branch not protected (HTTP 404)\\n");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(state.protection) + "\\n");
} else {
  process.stderr.write("Unsupported fake gh call: " + args.join(" ") + "\\n");
  process.exit(2);
}
`,
  );
  await chmod(fakeGh, 0o755);
  return {
    statePath,
    logPath,
    env: {
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      FAKE_GH_STATE: statePath,
      FAKE_GH_LOG: logPath,
    },
  };
}

async function readCalls(logPath) {
  const content = await readFile(logPath, "utf8").catch(() => "");
  return content.trim() ? content.trim().split("\n").map(JSON.parse) : [];
}

test("resolver uses origin push URL and ignores upstream and remote order", async (t) => {
  for (const originUrl of [
    "https://github.com/acme/target.git",
    "git@github.com:acme/target.git",
  ]) {
    await t.test(originUrl.startsWith("https") ? "HTTPS" : "SSH", async () => {
      const root = await initGitRepo();
      const fake = await installFakeGh(root);
      await execFile("git", ["remote", "add", "upstream", "https://github.com/source/template.git"], { cwd: root });
      await execFile("git", ["remote", "add", "origin", originUrl], { cwd: root });

      const result = await run(process.execPath, [resolver], { cwd: root, env: fake.env });

      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stdout.trim(), "acme/target");
      const calls = await readCalls(fake.logPath);
      assert.deepEqual(calls[0].slice(0, 3), ["repo", "view", originUrl]);
      assert.equal(JSON.stringify(calls).includes("source/template"), false);
    });
  }
});

test("resolver fails closed without origin", async () => {
  const root = await initGitRepo();
  const fake = await installFakeGh(root);
  await execFile("git", ["remote", "add", "upstream", "https://github.com/source/template.git"], { cwd: root });

  const result = await run(process.execPath, [resolver], { cwd: root, env: fake.env });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /origin/i);
  assert.equal((await readCalls(fake.logPath)).length, 0);
});

test("bootstrap applies five labels and repository policy idempotently with explicit scope", async () => {
  const root = await initGitRepo();
  const fake = await installFakeGh(root);
  await execFile("git", ["remote", "add", "origin", "https://github.com/acme/target.git"], { cwd: root });

  const first = await run(process.execPath, [bootstrap], { cwd: root, env: fake.env });
  assert.equal(first.code, 0, first.stderr);
  const state = JSON.parse(await readFile(fake.statePath, "utf8"));
  assert.deepEqual(
    [...state.labels].sort(),
    ["custom", "needs-info", "needs-triage", "ready-for-agent", "ready-for-human", "wontfix"].sort(),
  );
  assert.equal(state.defaultRepo, "acme/target");
  assert.equal(state.hasIssuesEnabled, true);
  assert.equal(state.squashMergeAllowed, true);
  assert.equal(state.mergeCommitAllowed, false);
  assert.equal(state.rebaseMergeAllowed, false);
  assert.equal(state.deleteBranchOnMerge, true);
  assert.deepEqual(state.protection, protectedMain());

  const callsAfterFirst = await readCalls(fake.logPath);
  const writes = callsAfterFirst.filter((args) =>
    (args[0] === "label" && args[1] === "create") ||
    (args[0] === "api" && (args.includes("PATCH") || args.includes("PUT"))),
  );
  assert.equal(writes.length, 6);
  for (const args of writes.filter((call) => call[0] === "label")) {
    assert.deepEqual(args.slice(args.indexOf("--repo"), args.indexOf("--repo") + 2), ["--repo", "acme/target"]);
  }
  assert.ok(writes.some((args) => args.includes("repos/acme/target")));
  assert.ok(writes.some((args) => args.includes("repos/acme/target/branches/main/protection")));

  const second = await run(process.execPath, [bootstrap], { cwd: root, env: fake.env });
  assert.equal(second.code, 0, second.stderr);
  const callsAfterSecond = await readCalls(fake.logPath);
  const newCalls = callsAfterSecond.slice(callsAfterFirst.length);
  assert.equal(newCalls.some((args) => args[0] === "label" && args[1] === "create"), false);
  assert.equal(newCalls.some((args) => args[0] === "api" && args.includes("PATCH")), false);
  assert.equal(newCalls.some((args) => args[0] === "api" && args.includes("PUT")), false);

  const check = await run(process.execPath, [bootstrap, "--check"], { cwd: root, env: fake.env });
  assert.equal(check.code, 0, check.stderr);
});

test("bootstrap --check reports drift without mutating", async () => {
  const root = await initGitRepo();
  const fake = await installFakeGh(root);
  await execFile("git", ["remote", "add", "origin", "https://github.com/acme/target.git"], { cwd: root });
  const before = JSON.parse(await readFile(fake.statePath, "utf8"));

  const result = await run(process.execPath, [bootstrap, "--check"], { cwd: root, env: fake.env });

  assert.notEqual(result.code, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /drift|missing/i);
  assert.deepEqual(JSON.parse(await readFile(fake.statePath, "utf8")), before);
  const calls = await readCalls(fake.logPath);
  assert.equal(calls.some((args) =>
    args[0] === "repo" && args[1] === "set-default" && args[2] !== "--view"), false);
  assert.equal(calls.some((args) => args[0] === "label" && args[1] === "create"), false);
  assert.equal(calls.some((args) => args[0] === "api" && args.includes("PATCH")), false);
  assert.equal(calls.some((args) => args[0] === "api" && args.includes("PUT")), false);
});

test("bootstrap routes a split origin to its push repository and audits that default", async () => {
  const root = await initGitRepo();
  const fake = await installFakeGh(root, {
    defaultRepo: "source/template",
    originFetchRepo: "source/template",
    hasIssuesEnabled: true,
    squashMergeAllowed: true,
    mergeCommitAllowed: false,
    rebaseMergeAllowed: false,
    deleteBranchOnMerge: true,
    labels: ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"],
    protection: protectedMain(),
  });
  await execFile("git", ["remote", "add", "origin", "https://github.com/source/template.git"], { cwd: root });
  await execFile("git", ["remote", "set-url", "--push", "origin", "git@github.com:acme/target.git"], { cwd: root });

  const drift = await run(process.execPath, [bootstrap, "--check"], { cwd: root, env: fake.env });
  assert.notEqual(drift.code, 0);
  assert.match(`${drift.stdout}\n${drift.stderr}`, /default|routing|source\/template/i);
  assert.equal(JSON.parse(await readFile(fake.statePath, "utf8")).defaultRepo, "source/template");

  const apply = await run(process.execPath, [bootstrap], { cwd: root, env: fake.env });
  assert.equal(apply.code, 0, apply.stderr);
  assert.equal(JSON.parse(await readFile(fake.statePath, "utf8")).defaultRepo, "acme/target");
  const setDefault = (await readCalls(fake.logPath)).filter((args) =>
    args[0] === "repo" && args[1] === "set-default" && args[2] !== "--view");
  assert.deepEqual(setDefault.at(-1), ["repo", "set-default", "acme/target"]);

  const clean = await run(process.execPath, [bootstrap, "--check"], { cwd: root, env: fake.env });
  assert.equal(clean.code, 0, clean.stderr);
});

test("bootstrap refuses to overwrite existing branch protection drift", async () => {
  const root = await initGitRepo();
  const existingProtection = {
    ...protectedMain(),
    required_status_checks: { strict: false, contexts: ["legacy-ci"], checks: [] },
  };
  const fake = await installFakeGh(root, {
    defaultRepo: "acme/target",
    hasIssuesEnabled: true,
    squashMergeAllowed: true,
    mergeCommitAllowed: false,
    rebaseMergeAllowed: false,
    deleteBranchOnMerge: true,
    labels: ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"],
    protection: existingProtection,
  });
  await execFile("git", ["remote", "add", "origin", "https://github.com/acme/target.git"], { cwd: root });

  const result = await run(process.execPath, [bootstrap], { cwd: root, env: fake.env });

  assert.notEqual(result.code, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /protection|status|workflow-integrity/i);
  assert.deepEqual(JSON.parse(await readFile(fake.statePath, "utf8")).protection, existingProtection);
  assert.equal((await readCalls(fake.logPath)).some((args) => args[0] === "api" && args.includes("PUT")), false);
});

function folderHash(files) {
  const hash = createHash("sha256");
  for (const [relativePath, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(relativePath);
    hash.update(content);
  }
  return hash.digest("hex");
}

async function createValidWorkflowFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "portable workflow "));
  const skill = `---\nname: example\ndescription: Example skill.\n---\n\n# Example\n`;
  const docs = {
    "AGENTS.md": "# Agents\n\nSee [workflow](docs/agents/engineering-workflow.md).\n",
    "CONTRIBUTING.md": "# Contributing\n\nRun `node scripts/validate-engineering-workflow.mjs`.\n",
    "README.md": "# Workflow\n\nSee [agents](AGENTS.md).\n\n| Skill | Invocation | Purpose |\n| --- | --- | --- |\n| `/example` | Automatic | Example. |\n",
    "docs/agents/domain.md": "# Domain\n",
    "docs/agents/engineering-workflow.md": "# Workflow\n\nResolve GitHub from `origin` with `scripts/resolve-github-repo.mjs`.\n",
    "docs/agents/issue-tracker.md": "# Tracker\n\nSet `REPO` from `origin` with `scripts/resolve-github-repo.mjs`; pass `--repo \"$REPO\"`.\n",
    "docs/agents/triage-labels.md": "# Labels\n\nneeds-triage, needs-info, ready-for-agent, ready-for-human, wontfix.\n",
    ".github/pull_request_template.md": "## Verification\n\n- [ ] Workflow validator passes.\n",
    ".github/workflows/workflow-integrity.yml": "name: workflow-integrity\n",
    "scripts/lib/github-repository.mjs": "// shared routing fixture\n",
    "scripts/lib/workflow-policy.mjs": "// shared policy fixture\n",
    "scripts/resolve-github-repo.mjs": "// resolver fixture\n",
    "scripts/bootstrap-engineering-workflow.mjs": "// bootstrap fixture\n",
    "scripts/validate-engineering-workflow.mjs": "// validator fixture\n",
    "tests/workflow/workflow-cli.test.mjs": "// workflow test fixture\n",
    ".agents/skills/example/SKILL.md": skill,
  };
  for (const [relativePath, content] of Object.entries(docs)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await mkdir(path.join(root, ".claude/skills"), { recursive: true });
  await symlink("../../.agents/skills/example", path.join(root, ".claude/skills/example"));
  await writeFile(
    path.join(root, "skills-lock.json"),
    `${JSON.stringify({
      version: 1,
      skills: {
        example: {
          source: "mattpocock/skills",
          sourceType: "github",
          skillPath: "skills/engineering/example/SKILL.md",
          computedHash: folderHash([["SKILL.md", skill]]),
        },
      },
    }, null, 2)}\n`,
  );
  return root;
}

async function validate(root) {
  return run(process.execPath, [validator, "--root", root], { cwd: projectRoot });
}

test("validator accepts aligned portable workflow", async () => {
  const root = await createValidWorkflowFixture();
  const result = await validate(root);
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
});

test("validator catches inventory, links, README, routing, and absolute-path drift", async (t) => {
  const cases = [
    ["skill hash", async (root) => writeFile(path.join(root, ".agents/skills/example/extra.md"), "drift\n"), /hash|skill/i],
    ["README coverage", async (root) => writeFile(path.join(root, "README.md"), "# Workflow\n"), /readme|example/i],
    ["invocation mode", async (root) => writeFile(path.join(root, "README.md"), "# Workflow\n\n| Skill | Invocation | Purpose |\n| --- | --- | --- |\n| `/example` | Explicit | Wrong. |\n"), /invocation|automatic|explicit|readme/i],
    ["broken link", async (root) => writeFile(path.join(root, "README.md"), "# Workflow\n\nUse `/example`. [Missing](missing.md)\n"), /link|missing/i],
    ["unsafe routing", async (root) => writeFile(path.join(root, "docs/agents/issue-tracker.md"), "# Tracker\n\nRun `gh issue list`.\n"), /origin|routing|resolver|repo/i],
    ["absolute path", async (root) => writeFile(path.join(root, "CONTRIBUTING.md"), "Use /Users/example/private/repo.\n"), /absolute|portable|users/i],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, async () => {
      const root = await createValidWorkflowFixture();
      await mutate(root);
      const result = await validate(root);
      assert.notEqual(result.code, 0, "expected validation failure");
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
    });
  }
});
