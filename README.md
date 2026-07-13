# Engineering Workflow

An issue-driven workflow for building projects with humans and coding agents. It turns uncertain ideas into explicit decisions, small tickets, tested changes, and reviewed pull requests while keeping `main` stable.

## Workflow map

```text
SET UP ONCE
  /setup-matt-pocock-skills
  Configure issue tracking, triage labels, and domain-document locations.
                              │
                              ▼
CHOOSE THE RIGHT PATH
  /ask-matt ─────────────────────────────────────────────────────────────┐
      │                                                                 │
      ├─ unclear idea or decision ──► /grill-me                         │
      │                              /grill-with-docs                   │
      ├─ unknown technical facts ──► /research                          │
      ├─ risky design question ────► /prototype                         │
      ├─ large multi-session work ─► /wayfinder                         │
      ├─ architecture problems ────► /improve-codebase-architecture     │
      └─ clear deliverable ──────────────────────────────────────────────┘
                              │
                              ▼
DEFINE THE WORK
  /to-spec ──► one approved GitHub Issue
       │
       └─────► /to-tickets ──► ordered tracer-bullet Issues + blockers

  External issue ────────────► /triage ──► verified agent-ready brief
                              │
                              ▼
DELIVER ONE UNBLOCKED TICKET
  Claim Issue ──► create branch ──► /implement
                                         │
                     ┌───────────────────┼────────────────────┐
                     ▼                   ▼                    ▼
                   /tdd        /diagnosing-bugs      /codebase-design
                     └───────────────────┼────────────────────┘
                                         ▼
                              focused commits + tests
                                         │
                                         ▼
REVIEW AND MERGE
  Push ──► pull request ──► /code-review main ──► fix findings
                                      ▲                  │
                                      └──────────────────┘
                                                  │
                                                  ▼
                       passing tests ──► squash merge ──► close Issue

CONTINUOUS SUPPORT
  /domain-modeling   Maintain shared terminology and ADRs.
  /handoff           Transfer compact context to another agent.
  /teach             Learn a concept inside the project workspace.
  /writing-great-skills  Create or improve predictable skills.
```

This is a routing map, not a requirement to invoke every skill. Start at the branch matching the work, then converge on a specified Issue and the delivery loop.

## Complete skill guide

**Explicit** skills run only when requested. **Automatic** skills may be selected by an agent when their trigger matches.

### Setup and routing

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `/setup-matt-pocock-skills` | Explicit | One-time repository setup for issue tracking, triage labels, and domain docs. |
| `/ask-matt` | Explicit | Recommends the correct skill or workflow when the next step is unclear. |

### Discovery and decisions

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `/grill-me` | Explicit | Relentlessly interviews you until a plan or design is precise. |
| `/grill-with-docs` | Explicit | Runs the same interview while updating domain language and ADRs. |
| `/grilling` | Automatic | Reusable interview loop used by the grilling workflows. |
| `/research` | Automatic | Investigates primary sources and records findings in the repository. |
| `/prototype` | Automatic | Builds a throwaway experiment to answer a design or interaction question. |
| `/wayfinder` | Explicit | Maps work too large for one session into linked decision tickets, then resolves them sequentially. |

### Specification and tracking

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `/to-spec` | Explicit | Synthesizes the current conversation into one specification and publishes it as an Issue. |
| `/to-tickets` | Explicit | Splits a plan into tracer-bullet tickets with explicit blocking relationships. |
| `/triage` | Explicit | Categorizes and verifies incoming Issues or external PRs, requesting missing information when needed. |
| `/domain-modeling` | Automatic | Defines shared terminology, updates `CONTEXT.md`, and records architectural decisions. |

### Design and implementation

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `/implement` | Explicit | Implements one approved specification or ticket in a focused working session. |
| `/tdd` | Automatic | Drives work through red, green, and refactor using behavior-focused tests. |
| `/diagnosing-bugs` | Automatic | Uses a disciplined evidence loop for bugs and performance regressions. |
| `/codebase-design` | Automatic | Designs deep module boundaries, interfaces, seams, and testable abstractions. |
| `/improve-codebase-architecture` | Explicit | Scans for architectural deepening opportunities and helps select an improvement. |

### Review, continuity, and learning

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `/code-review` | Automatic | Reviews changes against repository standards and the originating specification. |
| `/handoff` | Explicit | Produces a compact continuation document for another agent or session. |
| `/teach` | Explicit | Teaches a concept using this workspace as persistent learning context. |
| `/writing-great-skills` | Explicit | Guides creation and editing of predictable, well-triggered skills. |

## Delivery rules

1. Use one independently deliverable Issue, branch, and pull request at a time.
2. Start from an up-to-date `main`; merge blockers before dependent tickets.
3. Prefer behavior-first tests and focused conventional commits.
4. Include `Refs #<issue>` in at least one branch commit.
5. Push the branch and open a pull request with `Closes #<issue>`.
6. Run `/code-review main`; fix all valid standards and specification findings.
7. Run the full test suite, squash-merge, preserve AI attribution, and delete the branch.

## Branch names

```text
feature/12-streaming-chat
fix/19-login-error
docs/23-api-guide
chore/27-update-tooling
```

## Repository guide

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — complete branch, implementation, review, and merge policy.
- [`AGENTS.md`](AGENTS.md) — agent behavior and attribution requirements.
- [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) — GitHub Issue operations and wayfinding.
- [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) — issue-state vocabulary.
- [`docs/agents/domain.md`](docs/agents/domain.md) — domain context and ADR conventions.
