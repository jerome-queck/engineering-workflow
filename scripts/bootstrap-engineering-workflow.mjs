#!/usr/bin/env node

import { resolveGitHubRepository, run } from "./lib/github-repository.mjs";

const labels = [
  ["needs-triage", "FBCA04", "Needs maintainer evaluation"],
  ["needs-info", "D4C5F9", "Waiting for reporter information"],
  ["ready-for-agent", "0E8A16", "Ready for autonomous implementation"],
  ["ready-for-human", "1D76DB", "Requires human implementation"],
  ["wontfix", "B60205", "Will not be actioned"],
];

const desiredSettings = {
  hasIssuesEnabled: true,
  squashMergeAllowed: true,
  mergeCommitAllowed: false,
  rebaseMergeAllowed: false,
  deleteBranchOnMerge: true,
};

const apiFields = {
  hasIssuesEnabled: "has_issues",
  squashMergeAllowed: "allow_squash_merge",
  mergeCommitAllowed: "allow_merge_commit",
  rebaseMergeAllowed: "allow_rebase_merge",
  deleteBranchOnMerge: "delete_branch_on_merge",
};

async function inspect(repository) {
  let defaultRepository = null;
  try {
    defaultRepository = await run("gh", ["repo", "set-default", "--view"]);
  } catch {
    // An unset or ambiguous default is drift that apply mode can repair.
  }
  const settings = JSON.parse(
    await run("gh", [
      "repo",
      "view",
      repository,
      "--json",
      Object.keys(desiredSettings).join(","),
    ]),
  );
  const existingLabels = JSON.parse(
    await run("gh", ["label", "list", "--repo", repository, "--limit", "1000", "--json", "name"]),
  );
  const names = new Set(existingLabels.map(({ name }) => name));
  return {
    defaultRepository,
    defaultDrift: defaultRepository !== repository,
    settings,
    missingLabels: labels.filter(([name]) => !names.has(name)),
    settingsDrift: Object.entries(desiredSettings).filter(([name, value]) => settings[name] !== value),
  };
}

function reportDrift(repository, state) {
  const messages = [];
  if (state.defaultDrift) {
    messages.push(`default routing: ${state.defaultRepository || "unset"}; expected ${repository}`);
  }
  for (const [name] of state.missingLabels) messages.push(`missing label: ${name}`);
  for (const [name, expected] of state.settingsDrift) {
    messages.push(`setting drift: ${name}=${JSON.stringify(state.settings[name])}; expected ${expected}`);
  }
  if (messages.length) {
    process.stderr.write(`Workflow bootstrap drift for ${repository}:\n- ${messages.join("\n- ")}\n`);
  }
  return messages.length;
}

async function apply(repository, state) {
  await run("gh", ["repo", "set-default", repository]);

  if (state.settingsDrift.length) {
    const fields = Object.entries(desiredSettings).flatMap(([name, value]) => ["-F", `${apiFields[name]}=${value}`]);
    await run("gh", ["api", "--method", "PATCH", `repos/${repository}`, ...fields]);
  }

  for (const [name, color, description] of state.missingLabels) {
    await run("gh", [
      "label",
      "create",
      name,
      "--repo",
      repository,
      "--color",
      color,
      "--description",
      description,
    ]);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--check") || args.filter((arg) => arg === "--check").length > 1) {
    throw new Error("Usage: node scripts/bootstrap-engineering-workflow.mjs [--check]");
  }
  const checkOnly = args.includes("--check");
  const repository = await resolveGitHubRepository();
  const before = await inspect(repository);

  if (checkOnly) {
    if (reportDrift(repository, before)) process.exitCode = 1;
    else process.stdout.write(`Workflow bootstrap is current for ${repository}.\n`);
    return;
  }

  await apply(repository, before);
  const after = await inspect(repository);
  if (reportDrift(repository, after)) {
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Workflow bootstrap configured ${repository}.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
