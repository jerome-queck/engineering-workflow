#!/usr/bin/env node

import { resolveGitHubRepository, run, runWithInput } from "./lib/github-repository.mjs";
import {
  branchProtectionDrift,
  DEFAULT_BRANCH_PROTECTION_REQUEST,
  REPOSITORY_API_FIELDS,
  REPOSITORY_SETTINGS,
  WORKFLOW_LABELS,
} from "./lib/workflow-policy.mjs";

function protectionEndpoint(repository, branch) {
  return `repos/${repository}/branches/${encodeURIComponent(branch)}/protection`;
}

async function inspect(repository) {
  let defaultRepository = null;
  try {
    defaultRepository = await run("gh", ["repo", "set-default", "--view"]);
  } catch {
    // An unset or ambiguous default is drift that apply mode can repair.
  }
  const repositoryState = JSON.parse(
    await run("gh", [
      "repo",
      "view",
      repository,
      "--json",
      [...Object.keys(REPOSITORY_SETTINGS), "defaultBranchRef"].join(","),
    ]),
  );
  const existingLabels = JSON.parse(
    await run("gh", ["label", "list", "--repo", repository, "--limit", "1000", "--json", "name"]),
  );
  const names = new Set(existingLabels.map(({ name }) => name));
  const defaultBranch = repositoryState.defaultBranchRef?.name ?? null;
  let protection = null;
  let protectionMissing = false;
  if (defaultBranch) {
    try {
      protection = JSON.parse(await run("gh", ["api", protectionEndpoint(repository, defaultBranch)]));
    } catch (error) {
      const detail = `${error.stderr ?? ""}\n${error.message}`;
      if (/Branch not protected|HTTP 404/i.test(detail)) protectionMissing = true;
      else throw error;
    }
  }
  return {
    defaultRepository,
    defaultDrift: defaultRepository !== repository,
    defaultBranch,
    protectionMissing,
    protectionDrift: protection ? branchProtectionDrift(protection) : [],
    settings: repositoryState,
    missingLabels: WORKFLOW_LABELS.filter(({ name }) => !names.has(name)),
    settingsDrift: Object.entries(REPOSITORY_SETTINGS)
      .filter(([name, value]) => repositoryState[name] !== value),
  };
}

function reportDrift(repository, state) {
  const messages = [];
  if (state.defaultDrift) {
    messages.push(`default routing: ${state.defaultRepository || "unset"}; expected ${repository}`);
  }
  for (const { name } of state.missingLabels) messages.push(`missing label: ${name}`);
  for (const [name, expected] of state.settingsDrift) {
    messages.push(`setting drift: ${name}=${JSON.stringify(state.settings[name])}; expected ${expected}`);
  }
  if (!state.defaultBranch) messages.push("default branch is missing");
  else if (state.protectionMissing) messages.push(`branch protection missing on ${state.defaultBranch}`);
  for (const detail of state.protectionDrift) {
    messages.push(`branch protection drift on ${state.defaultBranch}: ${detail}`);
  }
  if (messages.length) {
    process.stderr.write(`Workflow bootstrap drift for ${repository}:\n- ${messages.join("\n- ")}\n`);
  }
  return messages.length;
}

async function apply(repository, state) {
  await run("gh", ["repo", "set-default", repository]);

  if (state.settingsDrift.length) {
    const fields = Object.entries(REPOSITORY_SETTINGS)
      .flatMap(([name, value]) => ["-F", `${REPOSITORY_API_FIELDS[name]}=${value}`]);
    await run("gh", ["api", "--method", "PATCH", `repos/${repository}`, ...fields]);
  }

  for (const { name, color, description } of state.missingLabels) {
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

  if (state.protectionMissing && state.defaultBranch) {
    await runWithInput(
      "gh",
      ["api", "--method", "PUT", protectionEndpoint(repository, state.defaultBranch), "--input", "-"],
      `${JSON.stringify(DEFAULT_BRANCH_PROTECTION_REQUEST)}\n`,
    );
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
