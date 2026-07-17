#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { resolveGitHubRepository } from "./lib/github-repository.mjs";

export { resolveGitHubRepository };

async function main() {
  if (process.argv.length > 2) {
    throw new Error("Usage: node scripts/resolve-github-repo.mjs");
  }
  process.stdout.write(`${await resolveGitHubRepository()}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
