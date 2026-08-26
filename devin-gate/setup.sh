#!/usr/bin/env bash
# Create the two automation definitions under automations/ on Devin, then start one seed
# session that files the two issues.
#
#   DEVIN_API_KEY=cog_... DEVIN_ORG_ID=org-... GATE_REPO=<you>/superset ./devin-gate/setup.sh
#
# Order matters: both SKILL.md files must already be pushed to the fork's default branch.
# The automation prompts use @skills: tokens, which are validated at save time; a skill
# that has not been indexed yet returns a 400.
set -euo pipefail

: "${DEVIN_API_KEY:?Devin service user API key required}"
: "${DEVIN_ORG_ID:?Devin organization ID required}"
: "${GATE_REPO:?target repository required, e.g. DayuanJiang/superset}"

BASE="https://api.devin.ai/v3/organizations/${DEVIN_ORG_ID}"
DIR="$(cd "$(dirname "$0")" && pwd)"

post() {
  curl -sS -X POST "$1" \
    -H "Authorization: Bearer ${DEVIN_API_KEY}" \
    -H "Content-Type: application/json" \
    -d @- -w '\n[HTTP %{http_code}]\n'
}

for f in "$DIR"/automations/*.json; do
  echo "==> creating $(basename "$f")"
  sed "s|REPO_PLACEHOLDER|${GATE_REPO}|g" "$f" | post "${BASE}/automations"
done

# Seeding runs exactly once, so these instructions live inline here rather than as a skill
# in the repo. The two gaps were verified by hand; the facts and coordinates are given,
# and reading the code, writing the bodies, and filing the issues are left to Devin.
read -r -d '' SEED_PROMPT <<'EOF' || true
File two issues in @REPO_TOKEN describing appearance gaps in the AG Grid table chart
plugin (`superset-frontend/plugins/plugin-chart-ag-grid-table`), then label each one
`devin:autofix` as a separate step after it exists.

Superset is migrating its table chart from the classic plugin to the AG Grid plugin,
and the new plugin's default appearance has not caught up with the classic one. Two
gaps, checked against the code, one issue each:

1. Zebra striping. The classic table renders every table with striped rows:
   `plugin-chart-table/src/TableChart.tsx` (near line 1639) hardcodes the class list
   `"table table-striped table-condensed"`, and its `Styles.tsx` colours odd rows with
   the `colorBgLayout` theme token. The AG Grid plugin has no striping at all, so wide
   tables lose the row guide users had before.
2. NULL rendering. The classic table shows null cells as a muted "N/A" (`dt-is-null`
   class, `colorTextTertiary` token). The AG Grid plugin's
   `src/renderers/TextCellRenderer.tsx` returns nothing for null, so a NULL cell and
   an empty-string cell look identical.

Line numbers may have moved. Read the real code and confirm each gap before filing.
Each issue should state the alignment target (the classic table's behaviour), require
that any colour comes from theme tokens, and require the result to stay readable in
both the light and the dark theme.

Labelling these issues starts the remediation pipeline for each of them. That is intended.
EOF

echo
echo "==> starting the seed session"
export SEED_PROMPT="${SEED_PROMPT//REPO_TOKEN/$GATE_REPO}"
python3 -c "
import json, os, sys
json.dump({'prompt': os.environ['SEED_PROMPT'],
           'title': 'Seed UI alignment issues',
           'max_acu_limit': 10,
           'resumable': False}, sys.stdout)
" | post "${BASE}/sessions"

echo
echo "Once the seed session has filed and labeled the issues, the pipeline takes over."
