# SDLC Run Command

Execute a complete SDLC workflow using the orchestrator.

## Usage

```
/sdlc-run [options]
```

## Options

- `--prd <path>` - Path to the PRD document (default: docs/PRD.md)
- `--phases <list>` - Comma-separated list of phases to execute (default: all)
- `--skip-checkpoints` - Skip human approval checkpoints
- `--max-iterations <n>` - Maximum retry iterations (default: 10)
- `--dry-run` - Show what would be executed without running

## Workflow Phases

The SDLC orchestrator executes the following phases in sequence:

1. **Planning** - Parse PRD, generate technical spec, identify risks
2. **Development** - Generate code based on spec, follow patterns
3. **Testing** - Generate tests, achieve >80% coverage
4. **Review** - Code review, identify issues (checkpoint)
5. **Deployment** - Build, create release notes, tag (checkpoint)
6. **Monitoring** - Track metrics, aggregate errors

## Human Checkpoints

By default, human approval is required before:
- Review phase (to verify implementation quality)
- Deployment phase (to verify production readiness)

Use `--skip-checkpoints` for fully autonomous execution (use with caution).

## Examples

### Run full SDLC workflow
```
/sdlc-run --prd docs/feature-prd.md
```

### Skip certain phases
```
/sdlc-run --phases planning,development,testing
```

### Dry run to see execution plan
```
/sdlc-run --dry-run
```

## Workflow State

The orchestrator maintains state in `.archon/workflows/` including:
- Current phase and status
- Artifacts produced by each phase
- Checkpoint approvals
- Error history

## Recovery

If a workflow fails, you can:
1. Fix the issues identified in the error report
2. Resume the workflow from the failed phase
3. The orchestrator will retry up to `maxIterations` times

## Output

The command outputs:
1. Real-time progress as each phase executes
2. Artifacts created (specs, code, tests, docs)
3. Human checkpoint prompts when required
4. Final workflow summary report

## Context Files

- Orchestrator implementation: `src/orchestrator/index.ts`
- Agent definitions: `src/agents/*/index.ts`
- PRD template: `docs/PRD_TEMPLATE.md`
