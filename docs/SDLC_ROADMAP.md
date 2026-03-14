# Agentic SDLC Platform Roadmap

## Vision
Transform Archon into a complete autonomous Software Development Lifecycle platform where AI agents handle every phase from planning to monitoring, with human oversight at critical checkpoints.

## Current State

### Completed (Core Agents)
- **Reviewer Agent**: Code review with severity-based feedback
- **Tester Agent**: Test generation with coverage analysis
- **Documenter Agent**: JSDoc and README management
- **Planner Agent**: PRD parsing and TypeSpec generation
- **Developer Agent**: Code generation from specs and pattern analysis
- **Deployer Agent**: Build automation and release notes
- **Monitor Agent**: Metrics tracking and error aggregation

### Completed (Infrastructure)
- **Memory System**: Pluggable memory provider architecture
- **Quality Hooks**: Automated lint, format, docs checks
- **GitHub Actions**: Automated PR reviews
- **Playbook**: Documentation of agentic patterns
- **SDLC Orchestrator**: Full lifecycle workflow coordination

### Completed (Spec-Driven Development)
- **TypeSpec Infrastructure**: specs/ directory, validation, OpenAPI generation
- **Spec Parser**: Parse TypeSpec/OpenAPI into structured data
- **Spec Generator**: Generate TypeSpec from requirements
- **Code Generation**: Generate types, clients, servers from specs
- **Documentation**: TypeSpec guide and spec-driven workflows

### Active Development
- **Ralph Loop Integration**: Autonomous spec-driven task execution
- **Enhanced Codegen**: More framework support (Fastify, Express, Hono)

## Development Modes

Archon supports two development approaches:

### Spec-Driven Development (Recommended for APIs)

```
TypeSpec Spec -> OpenAPI -> Types + Clients + Servers -> Tests -> Docs
              (auto)       (auto)                        (auto)  (auto)
```

Use when:
- Building APIs (REST, HTTP)
- Frontend/backend need to stay in sync
- Type safety is critical
- Multiple teams consume the same contract

### PRD-Driven Development (For Non-API Work)

```
PRD -> Technical Spec -> Code -> Tests -> Docs
       (manual)         (manual) (manual) (manual)
```

Use when:
- CLI tools, utilities
- Internal modules without API surface
- Exploratory/prototyping work

## The Complete SDLC Cycle

See [Spec-Driven SDLC](./SPEC_DRIVEN_SDLC.md) for the detailed spec-driven workflow diagram.

### Summary: SDLC Phases

| Phase | Agent | PRD Mode | Spec Mode |
|-------|-------|----------|-----------|
| **Specification** | — | N/A | Write TypeSpec, validate, generate OpenAPI |
| **Planning** | Planner | Parse PRD -> Tech Spec | Parse TypeSpec OR generate from requirements |
| **Code Generation** | Developer | Follow patterns | Generate types, clients, servers from spec |
| **Implementation** | Developer | Write code | Write business logic (types defined) |
| **Testing** | Tester | Generate tests | Generate contract tests from spec |
| **Review** | Reviewer | Code review | Spec-aware review |
| **Deployment** | Deployer | Build & release | Build, release & publish OpenAPI docs |
| **Monitoring** | Monitor | Track metrics | Track metrics + contract violations |

## Agent Specifications

### Planning Agent
```typescript
type PlanningAgent = {
  name: "Planner";
  role: "Requirements & Design Agent";

  capabilities: {
    parseRequirements: (prd: string) => TechnicalSpec;
    generateTypeSpec: (requirements: string) => TypeSpec;
    parseTypeSpec: (spec: string) => ParsedSpec;
    generateDesign: (spec: TechnicalSpec) => DesignDocument;
    identifyRisks: (design: DesignDocument) => Risk[];
    estimateComplexity: (design: DesignDocument) => ComplexityEstimate;
  };

  outputs: [
    "Technical specification document",
    "TypeSpec API specification",
    "File structure recommendations",
    "Risk assessment",
    "Implementation plan"
  ];
};
```

### Development Agent
```typescript
type DevelopmentAgent = {
  name: "Developer";
  role: "Code Generation Agent";

  capabilities: {
    generateCode: (spec: TechnicalSpec) => CodeFiles;
    generateFromSpec: (typespec: ParsedSpec) => CodegenResult;
    generateTypes: (spec: ParsedSpec) => TypeScriptTypes;
    generateClient: (spec: ParsedSpec) => APIClient;
    generateServer: (spec: ParsedSpec, framework: string) => ServerScaffold;
    followPatterns: (codebase: string) => PatternRules;
    refactorCode: (target: string, goal: string) => Refactoring;
  };

  outputs: [
    "TypeScript type definitions",
    "Zod validation schemas",
    "API client classes",
    "Server scaffolds (Hono, Express, Fastify)",
    "Implementation code",
    "Inline documentation"
  ];
};
```

### Deployment Agent
```typescript
type DeploymentAgent = {
  name: "Deployer";
  role: "Release & Deployment Agent";

  capabilities: {
    buildArtifacts: () => BuildResult;
    generateReleaseNotes: (commits: Commit[]) => ReleaseNotes;
    deployToEnvironment: (env: string) => DeploymentResult;
    verifyDeployment: (env: string) => HealthCheck;
    rollback: (version: string) => RollbackResult;
  };

  outputs: [
    "Build artifacts",
    "Release notes",
    "Deployment status",
    "Rollback plan"
  ];
};
```

### Monitoring Agent
```typescript
type MonitoringAgent = {
  name: "Monitor";
  role: "Observability & Feedback Agent";

  capabilities: {
    trackMetrics: (service: string) => Metrics;
    aggregateErrors: (timeRange: TimeRange) => ErrorSummary;
    analyzeUsage: (period: string) => UsageReport;
    collectFeedback: (source: string) => Feedback[];
    createIssues: (incidents: Incident[]) => Issue[];
  };

  outputs: [
    "Performance dashboards",
    "Error reports",
    "Usage analytics",
    "Improvement suggestions"
  ];
};
```

## Ralph Loop Integration Strategy

### Autonomous Workflow Pattern
```bash
# Start autonomous SDLC cycle (spec-driven)
./scripts/ralph/ralph.sh --spec-mode

# Start autonomous SDLC cycle (PRD-driven)
./scripts/ralph/ralph.sh
```

### Safety Mechanisms
1. **Iteration Limits**: Always set `--max-iterations`
2. **Cost Caps**: Monitor token usage, abort if exceeding budget
3. **Human Checkpoints**: Require approval before:
   - Major architectural changes
   - Database migrations
   - Production deployments
   - Security-sensitive code
4. **Failure Recovery**: Auto-rollback on test failures
5. **Progress Tracking**: Save state after each phase

### Completion Criteria
The orchestrator considers work "complete" when:
- All requirements implemented
- All tests passing (100% of new code tested)
- Code review approved (no blockers)
- Documentation complete
- Ready for deployment

## Success Metrics

### Agent Performance
- **Planning Agent**: Spec completeness, design accuracy, TypeSpec validity
- **Development Agent**: Code quality scores, pattern adherence, type safety
- **Tester Agent**: Test coverage %, bug detection rate
- **Reviewer Agent**: Issue detection accuracy, false positive rate
- **Deployment Agent**: Deploy success rate, rollback frequency
- **Monitoring Agent**: Incident detection time, alert accuracy

### Workflow Efficiency
- Time from requirement -> production
- Number of iterations needed
- Human intervention frequency
- Cost per feature

### Quality Outcomes
- Bug escape rate
- Production incidents
- Technical debt trend
- Code maintainability score

## Resources

### Documentation
- [Spec-Driven SDLC](./SPEC_DRIVEN_SDLC.md) - Complete spec-driven workflow
- [TypeSpec Guide](./TYPESPEC_GUIDE.md) - Writing TypeSpec specifications
- [Spec-Driven Development](./SPEC_DRIVEN_DEVELOPMENT.md) - Concepts and setup
- [SDLC Workflow](./SDLC_WORKFLOW.md) - General SDLC orchestration
- [Agents Guide](./AGENTS.md) - All agent capabilities

---

**Last Updated**: 2026-03-14
**Status**: Active Development
**Owner**: Kiran Gamini
