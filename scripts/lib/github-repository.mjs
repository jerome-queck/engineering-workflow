import { execFile as execFileCallback, spawn } from "node:child_process";
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

export async function runWithInput(
  command,
  args,
  input,
  { cwd = process.cwd(), env = process.env } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      const error = new Error(stderr.trim() || `${command} exited with status ${code}`);
      Object.assign(error, { code, stdout, stderr });
      reject(error);
    });
    child.stdin.end(input);
  });
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
