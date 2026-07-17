import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export async function run(command, args, { cwd = process.cwd(), env = process.env } = {}) {
  const { stdout } = await execFile(command, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

export async function resolveGitHubRepository({ cwd = process.cwd(), env = process.env } = {}) {
  let originUrl;
  try {
    originUrl = await run("git", ["remote", "get-url", "--push", "origin"], { cwd, env });
  } catch {
    throw new Error("Cannot resolve GitHub repository: git remote 'origin' is missing or has no push URL.");
  }

  if (!originUrl) {
    throw new Error("Cannot resolve GitHub repository: git remote 'origin' has an empty push URL.");
  }

  let repository;
  try {
    repository = await run(
      "gh",
      ["repo", "view", originUrl, "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
      { cwd, env },
    );
  } catch {
    throw new Error(`Cannot resolve GitHub repository from origin push URL: ${originUrl}`);
  }

  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    throw new Error(`GitHub returned an invalid repository for origin: ${repository || "<empty>"}`);
  }

  return repository;
}
