export const WORKFLOW_LABELS = Object.freeze([
  Object.freeze({ name: "needs-triage", color: "FBCA04", description: "Needs maintainer evaluation" }),
  Object.freeze({ name: "needs-info", color: "D4C5F9", description: "Waiting for reporter information" }),
  Object.freeze({ name: "ready-for-agent", color: "0E8A16", description: "Ready for autonomous implementation" }),
  Object.freeze({ name: "ready-for-human", color: "1D76DB", description: "Requires human implementation" }),
  Object.freeze({ name: "wontfix", color: "B60205", description: "Will not be actioned" }),
]);

export const REPOSITORY_SETTINGS = Object.freeze({
  hasIssuesEnabled: true,
  squashMergeAllowed: true,
  mergeCommitAllowed: false,
  rebaseMergeAllowed: false,
  deleteBranchOnMerge: true,
});

export const REPOSITORY_API_FIELDS = Object.freeze({
  hasIssuesEnabled: "has_issues",
  squashMergeAllowed: "allow_squash_merge",
  mergeCommitAllowed: "allow_merge_commit",
  rebaseMergeAllowed: "allow_rebase_merge",
  deleteBranchOnMerge: "delete_branch_on_merge",
});

export const REQUIRED_STATUS_CHECK = "workflow-integrity";

export const DEFAULT_BRANCH_PROTECTION_REQUEST = Object.freeze({
  required_status_checks: Object.freeze({
    strict: true,
    contexts: Object.freeze([REQUIRED_STATUS_CHECK]),
  }),
  enforce_admins: false,
  required_pull_request_reviews: Object.freeze({
    dismiss_stale_reviews: false,
    require_code_owner_reviews: false,
    required_approving_review_count: 0,
    require_last_push_approval: false,
  }),
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: true,
});

function enabled(value) {
  return typeof value === "boolean" ? value : value?.enabled;
}

export function branchProtectionDrift(protection) {
  const drift = [];
  if (!protection?.required_pull_request_reviews) {
    drift.push("pull requests are not required");
  }

  const statusChecks = protection?.required_status_checks;
  const contexts = new Set([
    ...(statusChecks?.contexts ?? []),
    ...(statusChecks?.checks ?? []).map((check) => check.context),
  ]);
  if (!statusChecks?.strict || !contexts.has(REQUIRED_STATUS_CHECK)) {
    drift.push(`strict ${REQUIRED_STATUS_CHECK} status checks are not required`);
  }
  if (enabled(protection?.enforce_admins) !== false) drift.push("administrator emergency bypass is not enabled");
  if (enabled(protection?.required_linear_history) !== true) drift.push("linear history is not required");
  if (enabled(protection?.allow_force_pushes) !== false) drift.push("force pushes are not disabled");
  if (enabled(protection?.allow_deletions) !== false) drift.push("branch deletion is not disabled");
  if (enabled(protection?.required_conversation_resolution) !== true) {
    drift.push("conversation resolution is not required");
  }
  return drift;
}
