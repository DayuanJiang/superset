# Superset Visual Review Gate

An event-driven pipeline: when a UI issue gets labeled, Devin fixes it and opens a PR, and
a separate Devin session renders the affected components on both the base branch and the
PR branch, compares them for regressions, and writes the verdict with evidence as a PR
comment and a commit status. The verification criteria follow the type of change. Lint and
unit tests cannot answer "does the UI look right"; only rendering can.

Everything is a pure addition to this apache/superset fork, driven entirely by Devin's
native Automation engine:

```
.agents/skills/fix-ui-issue/SKILL.md              instructions for the fix session
.agents/skills/visual-review-gate/SKILL.md        instructions for the gate session
devin-gate/automations/01-fix.json                issue labeled → start a fix session
devin-gate/automations/02-visual-review.json      PR opened or updated → start a review session
devin-gate/setup.sh                               create both Automations, start one seed session
```

## How it works

```
Seeding (setup.sh starts one session)
  Devin verifies hand-picked UI problems against the code, files them as issues,
  then labels each one devin:autofix as a separate step
        │
        ▼  github:issues, condition: action=labeled and label.name=devin:autofix
Automation 1 "Autofix UI issues"
  Devin reads the issue, verifies it against the code, implements the change following
  the repo's existing conventions, runs lint and the existing tests, opens a PR;
  the branch name must be devin/ui-fix/<issue number>
        │
        ▼  github:pull_request, condition: action in opened/synchronize and head.ref starts with devin/ui-fix/
Automation 2 "Visual review gate"
  Devin finds the Storybook stories covering the changed files, renders the base and the
  PR branch, compares them with criteria chosen per change type, comments on the PR
  (screenshots embedded), writes the commit status, commits a record to the metrics branch
```

The gate's verdict is three-valued, and "could not verify" also turns the check red,
because a gate that shows green when it cannot see is no gate at all:

| Verdict            | Meaning                                                        | commit status |
| ------------------ | -------------------------------------------------------------- | ------------- |
| `PASS`             | Rendered and inspected, no worse than the base branch          | `success`     |
| `FAIL`             | The rendered result got worse                                  | `failure`     |
| `COULD NOT VERIFY` | Could not render it, including no story covering the change    | `failure`     |

Three cross-component contracts: the branch prefix `devin/ui-fix/` (the gate filters on
it), the commit status context `visual-review` (branch protection requires it under this
name), and the record path `runs/pr-<number>-<timestamp>` (`.json` is the record, the
same-named directory holds the screenshots; the path carries the PR number and timestamp,
so concurrent runs never overwrite each other).

## Running it

A note on Docker: this solution ships no Dockerfile because there is nothing to
self-host. Event matching, session dispatch, and the review sessions themselves all
run on the Devin platform; the files above are the entire deployment.

Prerequisites:

- A Devin service user API key (`cog_` prefix) and the organization ID, with the
  `ManageOrgAutomations` permission
- This fork connected in Devin through the GitHub App (the gate writes commit statuses
  through its permissions)
- **Automation scope opened for public repos.** By default GitHub automations only fire
  on private repositories, and a public fork's events are dropped silently. In
  [Settings → Connections → GitHub](https://app.devin.ai/settings/connections/github),
  set the connection's **Automation scope** to **All installed repos**
- Issues enabled on the fork, and the label created:

```bash
gh repo edit <you>/superset --enable-issues
gh label create "devin:autofix" -R <you>/superset -c 5319e7
```

Order matters: push both SKILL.md files to the fork's default branch first, then run the
command below. The Automation prompts use `@skills:` tokens, which are validated at save
time; a skill that has not been indexed yet returns a 400.

```bash
DEVIN_API_KEY=cog_... DEVIN_ORG_ID=org-... GATE_REPO=<you>/superset ./devin-gate/setup.sh
```

The seed session files two demo issues (two appearance gaps of the AG Grid table plugin
relative to the classic table plugin; see the seed prompt in setup.sh). Once they are
filed and labeled, the pipeline runs on its own.

## How you know it is working

| What you want to see                        | Where                                                    |
| ------------------------------------------- | -------------------------------------------------------- |
| Whether a PR can merge                      | The `visual-review` status in the PR's check list        |
| Verdict, reasoning, before/after screenshots | Devin's comment on the PR (screenshots embedded)         |
| The full trail                              | The Devin session linked from the comment and the status |
| Each trigger's success, skip, or error      | The Activity tab of each Automation in the Devin app     |
| Cross-task aggregates                       | The `runs/` directory on the `metrics` branch            |

Verdict distribution in one command:

```bash
for f in $(gh api repos/<you>/superset/contents/runs?ref=metrics \
             --jq '.[] | select(.type=="file") | .path'); do
  gh api "repos/<you>/superset/contents/$f?ref=metrics" --jq '.content' | base64 -d
done | jq -s 'group_by(.verdict) | map({verdict: .[0].verdict, n: length})'
```
