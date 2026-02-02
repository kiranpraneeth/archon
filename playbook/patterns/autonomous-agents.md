# Autonomous Agents

> Running agents without human interaction via CI/CD pipelines

## Headless Mode

Agents can run without an interactive terminal using `--print` mode:

```bash
echo "$PROMPT" | claude --print --output-format text
```

**Key differences from interactive mode:**

| Interactive | Headless |
|-------------|----------|
| Agent can ask clarifying questions | Must work with what's given |
| User sees progress in real-time | Output captured at the end |
| Can course-correct mid-task | Single shot — prompt must be complete |
| Flexible context gathering | Explicit file lists required |

## Key Lesson: Headless Prompts Must Be Explicit

In interactive mode, Claude can ask "Which files should I review?" In headless mode, it can't.

**Too vague (fails in headless):**
```
Review this PR
```

**Explicit (works in headless):**
```
You are the Code Review Agent for Archon.

Changed files: src/agents/reviewer/index.ts src/core/types.ts

Instructions:
1. Read each changed file
2. Provide a code review with:
   - Summary (Approve / Request Changes / Needs Discussion)
   - Feedback grouped by severity
   - What I Liked
3. Focus on bugs, security issues, and code quality
```

**Rule:** If the agent would need to ask a question, answer it in the prompt.

## GitHub Actions Integration

Trigger agents on repository events:

```yaml
on:
  pull_request_target:
    types: [opened, synchronize]
```

### The Pattern We Built

```
┌─────────────────────────────────────────────────┐
│  PR Opened/Updated                              │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Workflow Triggered                             │
│  - Checkout code                                │
│  - Get changed files via git diff               │
│  - Build explicit prompt with file list         │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Claude Code (Headless)                         │
│  - Reads files                                  │
│  - Generates review                             │
│  - Outputs markdown                             │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Post Comment                                   │
│  - Find existing bot comment                    │
│  - Update if exists, create if not              │
└─────────────────────────────────────────────────┘
```

### Workflow Snippet

```yaml
- name: Get changed files
  run: |
    FILES=$(git diff --name-only origin/$BASE...HEAD | grep -E '\.(ts|tsx)$')
    echo "files=$FILES" >> $GITHUB_OUTPUT

- name: Run Claude Code Review
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    PROMPT="Review these files: ${{ steps.changed-files.outputs.files }}

    [explicit instructions here]"

    echo "$PROMPT" | claude --print --output-format text > review.md
```

## Update vs Create Comments

Avoid spamming PRs with multiple comments on each push:

```javascript
// Find existing bot comment
const botComment = comments.find(c =>
  c.user.type === 'Bot' &&
  c.body.includes('🤖 Claude Code Review')
);

if (botComment) {
  // Update existing
  await github.rest.issues.updateComment({
    comment_id: botComment.id,
    body: newReview
  });
} else {
  // Create new
  await github.rest.issues.createComment({
    issue_number: prNumber,
    body: newReview
  });
}
```

**Result:**
- First push → Comment created
- Second push → Same comment updated (shows "edited")
- No comment spam

## Error Handling

Agent failures shouldn't block PRs:

```yaml
jobs:
  review:
    continue-on-error: true  # Don't fail the PR check
```

Handle failures gracefully in the script:

```bash
set +e
REVIEW=$(echo "$PROMPT" | claude --print 2>&1)
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -ne 0 ]; then
  REVIEW="⚠️ Review could not be completed. Please review manually.

  Error: $REVIEW"
fi
```

**Philosophy:** Automated review is a bonus, not a gate. Missing review = human reviews. Failed review ≠ blocked PR.

## Security Considerations

Protect API keys from malicious PRs:

```yaml
# Use pull_request_target (runs from base branch)
on:
  pull_request_target:

# Only run on same-repo PRs (not forks)
if: github.event.pull_request.head.repo.full_name == github.repository
```

| Scenario | Secret Access |
|----------|---------------|
| PR from fork | ❌ Skipped |
| PR from same repo | ✅ Allowed |
| Malicious workflow edit in PR | ❌ Base branch workflow runs |

## Best Practices

1. **Explicit prompts** — Don't assume the agent can figure it out
2. **Filter files** — Only review relevant file types (`.ts`, `.py`, etc.)
3. **Update, don't spam** — Find and update existing comments
4. **Fail gracefully** — Don't block PRs on agent failures
5. **Protect secrets** — Use `pull_request_target` + fork checks
6. **Concurrency control** — Cancel in-progress runs on new pushes
   ```yaml
   concurrency:
     group: review-${{ github.event.pull_request.number }}
     cancel-in-progress: true
   ```
