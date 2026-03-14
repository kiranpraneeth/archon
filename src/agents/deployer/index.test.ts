/**
 * Tests for the Deployment Agent
 */

import { describe, it, expect } from "vitest";
import {
  createDeployerAgent,
  formatBuildResult,
  formatReleaseNotes,
  formatDeploymentResult,
  BuildStatus,
  ReleaseType,
  Environment,
  ChangeCategory,
  BuildStepSchema,
  BuildArtifactSchema,
  BuildResultSchema,
  ChangeEntrySchema,
  ContributorSchema,
  ReleaseNotesSchema,
  DeploymentTargetSchema,
  DeploymentResultSchema,
  type BuildResult,
  type ReleaseNotes,
  type DeploymentResult,
  type BuildStep,
  type BuildArtifact,
  type ChangeEntry,
  type Contributor,
  type DeploymentTarget,
  type DeployerConfig,
} from "./index.js";

describe("Deployment Agent", () => {
  describe("createDeployerAgent", () => {
    it("should create agent with default configuration", () => {
      const agent = createDeployerAgent();

      expect(agent.name).toBe("Deployer");
      expect(agent.role).toBe("Deployment Agent");
      expect(agent.status).toBe("active");
      expect(agent.version).toBe("0.1.0");
    });

    it("should have correct capabilities", () => {
      const agent = createDeployerAgent();

      expect(agent.capabilities.canModifyFiles).toBe(true);
      expect(agent.capabilities.canExecuteCommands).toBe(true);
      expect(agent.capabilities.canAccessNetwork).toBe(false);
      expect(agent.capabilities.requiresHumanApproval).toBe(true);
    });

    it("should have default config values", () => {
      const agent = createDeployerAgent();

      expect(agent.config.autoGenerateReleaseNotes).toBe(true);
      expect(agent.config.createGitTags).toBe(true);
      expect(agent.config.runBuildSteps).toBe(true);
      expect(agent.config.requireProductionApproval).toBe(true);
      expect(agent.config.environments).toEqual([
        "development",
        "staging",
        "production",
      ]);
      expect(agent.config.defaultReleaseType).toBe("patch");
      expect(agent.config.outputFormat).toBe("markdown");
    });

    it("should allow config overrides", () => {
      const customConfig: Partial<DeployerConfig> = {
        requireProductionApproval: false,
        defaultReleaseType: "minor",
        outputFormat: "json",
      };

      const agent = createDeployerAgent(customConfig);

      expect(agent.config.requireProductionApproval).toBe(false);
      expect(agent.config.defaultReleaseType).toBe("minor");
      expect(agent.config.outputFormat).toBe("json");
      // Defaults should still apply for non-overridden values
      expect(agent.config.autoGenerateReleaseNotes).toBe(true);
      expect(agent.config.createGitTags).toBe(true);
    });

    it("should preserve partial overrides correctly", () => {
      const agent = createDeployerAgent({
        autoGenerateReleaseNotes: false,
        environments: ["staging", "production"],
      });

      expect(agent.config.autoGenerateReleaseNotes).toBe(false);
      expect(agent.config.environments).toEqual(["staging", "production"]);
      expect(agent.config.createGitTags).toBe(true);
      expect(agent.config.runBuildSteps).toBe(true);
    });
  });

  describe("Type Constants", () => {
    it("should have correct BuildStatus values", () => {
      expect(BuildStatus.SUCCESS).toBe("success");
      expect(BuildStatus.FAILURE).toBe("failure");
      expect(BuildStatus.IN_PROGRESS).toBe("in_progress");
      expect(BuildStatus.CANCELLED).toBe("cancelled");
    });

    it("should have correct ReleaseType values", () => {
      expect(ReleaseType.MAJOR).toBe("major");
      expect(ReleaseType.MINOR).toBe("minor");
      expect(ReleaseType.PATCH).toBe("patch");
      expect(ReleaseType.PRERELEASE).toBe("prerelease");
    });

    it("should have correct Environment values", () => {
      expect(Environment.DEVELOPMENT).toBe("development");
      expect(Environment.STAGING).toBe("staging");
      expect(Environment.PRODUCTION).toBe("production");
    });

    it("should have correct ChangeCategory values", () => {
      expect(ChangeCategory.FEATURE).toBe("feature");
      expect(ChangeCategory.FIX).toBe("fix");
      expect(ChangeCategory.BREAKING).toBe("breaking");
      expect(ChangeCategory.DEPRECATION).toBe("deprecation");
      expect(ChangeCategory.SECURITY).toBe("security");
      expect(ChangeCategory.PERFORMANCE).toBe("performance");
      expect(ChangeCategory.DOCUMENTATION).toBe("documentation");
      expect(ChangeCategory.INTERNAL).toBe("internal");
    });
  });

  describe("Zod Schemas", () => {
    describe("BuildStepSchema", () => {
      it("should validate a valid build step", () => {
        const step: BuildStep = {
          name: "Install dependencies",
          command: "npm install",
          status: "success",
        };

        const result = BuildStepSchema.safeParse(step);
        expect(result.success).toBe(true);
      });

      it("should accept optional duration, output, and error", () => {
        const step: BuildStep = {
          name: "Build",
          command: "npm run build",
          status: "failure",
          duration: 45,
          output: "Building...",
          error: "TypeScript error",
        };

        const result = BuildStepSchema.safeParse(step);
        expect(result.success).toBe(true);
      });

      it("should validate all status values", () => {
        const statuses = [
          "success",
          "failure",
          "in_progress",
          "cancelled",
          "pending",
        ] as const;
        for (const status of statuses) {
          const step: BuildStep = {
            name: "Test",
            command: "test",
            status,
          };
          const result = BuildStepSchema.safeParse(step);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid status", () => {
        const invalid = {
          name: "Test",
          command: "test",
          status: "invalid",
        };

        const result = BuildStepSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("BuildArtifactSchema", () => {
      it("should validate a valid artifact", () => {
        const artifact: BuildArtifact = {
          name: "app.tar.gz",
          path: "dist/app.tar.gz",
          size: 1024000,
          type: "archive",
        };

        const result = BuildArtifactSchema.safeParse(artifact);
        expect(result.success).toBe(true);
      });

      it("should accept optional checksum", () => {
        const artifact: BuildArtifact = {
          name: "app",
          path: "dist/app",
          size: 2048000,
          type: "binary",
          checksum: "sha256:abc123",
        };

        const result = BuildArtifactSchema.safeParse(artifact);
        expect(result.success).toBe(true);
      });

      it("should validate all artifact types", () => {
        const types = [
          "binary",
          "archive",
          "container",
          "package",
          "other",
        ] as const;
        for (const type of types) {
          const artifact: BuildArtifact = {
            name: "test",
            path: "test",
            size: 100,
            type,
          };
          const result = BuildArtifactSchema.safeParse(artifact);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid type", () => {
        const invalid = {
          name: "test",
          path: "test",
          size: 100,
          type: "invalid",
        };

        const result = BuildArtifactSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("BuildResultSchema", () => {
      it("should validate a minimal build result", () => {
        const result: BuildResult = {
          id: "build-123",
          status: "success",
          startedAt: "2026-03-13T12:00:00Z",
          steps: [],
          artifacts: [],
          commit: "abc123",
          branch: "main",
        };

        const parseResult = BuildResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });

      it("should validate a complete build result", () => {
        const result: BuildResult = {
          id: "build-456",
          status: "failure",
          startedAt: "2026-03-13T12:00:00Z",
          completedAt: "2026-03-13T12:05:00Z",
          duration: 300,
          steps: [
            {
              name: "Install",
              command: "npm install",
              status: "success",
              duration: 60,
            },
            {
              name: "Build",
              command: "npm run build",
              status: "failure",
              duration: 120,
              error: "Build failed",
            },
          ],
          artifacts: [
            {
              name: "partial.tar.gz",
              path: "dist/partial.tar.gz",
              size: 500000,
              type: "archive",
            },
          ],
          commit: "def456",
          branch: "feature/test",
          version: "1.2.3",
          logs: "Full build logs here",
          error: "Build failed at step 2",
        };

        const parseResult = BuildResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });
    });

    describe("ChangeEntrySchema", () => {
      it("should validate a minimal change entry", () => {
        const entry: ChangeEntry = {
          id: "CHG-001",
          category: "feature",
          title: "Add new feature",
          description: "Implemented a new feature",
          breaking: false,
        };

        const result = ChangeEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      });

      it("should accept optional fields", () => {
        const entry: ChangeEntry = {
          id: "CHG-002",
          category: "fix",
          title: "Fix bug",
          description: "Fixed a critical bug",
          commit: "abc123",
          pullRequest: 42,
          author: "johndoe",
          breaking: false,
        };

        const result = ChangeEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      });

      it("should validate all categories", () => {
        const categories = [
          "feature",
          "fix",
          "breaking",
          "deprecation",
          "security",
          "performance",
          "documentation",
          "internal",
        ] as const;

        for (const category of categories) {
          const entry: ChangeEntry = {
            id: "CHG-001",
            category,
            title: "Test",
            description: "Test",
            breaking: false,
          };
          const result = ChangeEntrySchema.safeParse(entry);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid category", () => {
        const invalid = {
          id: "CHG-001",
          category: "invalid",
          title: "Test",
          description: "Test",
          breaking: false,
        };

        const result = ChangeEntrySchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("ContributorSchema", () => {
      it("should validate a minimal contributor", () => {
        const contributor: Contributor = {
          name: "John Doe",
          contributions: 5,
        };

        const result = ContributorSchema.safeParse(contributor);
        expect(result.success).toBe(true);
      });

      it("should accept optional username", () => {
        const contributor: Contributor = {
          name: "Jane Smith",
          username: "jsmith",
          contributions: 10,
        };

        const result = ContributorSchema.safeParse(contributor);
        expect(result.success).toBe(true);
      });
    });

    describe("ReleaseNotesSchema", () => {
      it("should validate minimal release notes", () => {
        const notes: ReleaseNotes = {
          version: "1.0.0",
          releaseType: "major",
          date: "2026-03-13",
          title: "v1.0.0",
          summary: "Initial release",
          changes: [],
          contributors: [],
          highlights: [],
          breakingChanges: [],
          deprecations: [],
        };

        const result = ReleaseNotesSchema.safeParse(notes);
        expect(result.success).toBe(true);
      });

      it("should validate complete release notes", () => {
        const notes: ReleaseNotes = {
          version: "2.0.0",
          releaseType: "major",
          date: "2026-03-13",
          title: "v2.0.0 - Major Update",
          summary: "This is a major update with breaking changes",
          changes: [
            {
              id: "CHG-001",
              category: "feature",
              title: "New API",
              description: "Completely new API",
              pullRequest: 100,
              author: "dev",
              breaking: true,
            },
          ],
          contributors: [
            {
              name: "Developer",
              username: "dev",
              contributions: 50,
            },
          ],
          previousVersion: "1.5.0",
          compareUrl: "https://github.com/org/repo/compare/v1.5.0...v2.0.0",
          highlights: ["New API", "Better performance"],
          breakingChanges: ["API v1 removed"],
          deprecations: ["Old helper deprecated"],
          upgradeGuide: "See migration guide at docs/migration.md",
        };

        const result = ReleaseNotesSchema.safeParse(notes);
        expect(result.success).toBe(true);
      });

      it("should validate all release types", () => {
        const types = ["major", "minor", "patch", "prerelease"] as const;

        for (const releaseType of types) {
          const notes: ReleaseNotes = {
            version: "1.0.0",
            releaseType,
            date: "2026-03-13",
            title: "Test",
            summary: "Test",
            changes: [],
            contributors: [],
            highlights: [],
            breakingChanges: [],
            deprecations: [],
          };
          const result = ReleaseNotesSchema.safeParse(notes);
          expect(result.success).toBe(true);
        }
      });
    });

    describe("DeploymentTargetSchema", () => {
      it("should validate a minimal target", () => {
        const target: DeploymentTarget = {
          name: "production-server",
          environment: "production",
          rollbackSupported: true,
        };

        const result = DeploymentTargetSchema.safeParse(target);
        expect(result.success).toBe(true);
      });

      it("should accept optional fields", () => {
        const target: DeploymentTarget = {
          name: "staging-server",
          environment: "staging",
          url: "https://staging.example.com",
          healthCheck: "https://staging.example.com/health",
          rollbackSupported: true,
        };

        const result = DeploymentTargetSchema.safeParse(target);
        expect(result.success).toBe(true);
      });

      it("should validate all environments", () => {
        const environments = ["development", "staging", "production"] as const;

        for (const environment of environments) {
          const target: DeploymentTarget = {
            name: "test",
            environment,
            rollbackSupported: false,
          };
          const result = DeploymentTargetSchema.safeParse(target);
          expect(result.success).toBe(true);
        }
      });
    });

    describe("DeploymentResultSchema", () => {
      it("should validate a minimal deployment result", () => {
        const result: DeploymentResult = {
          id: "deploy-123",
          version: "1.0.0",
          environment: "production",
          status: "success",
          startedAt: "2026-03-13T12:00:00Z",
          target: {
            name: "prod-server",
            environment: "production",
            rollbackSupported: true,
          },
          requiresHumanApproval: false,
        };

        const parseResult = DeploymentResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });

      it("should validate a complete deployment result", () => {
        const result: DeploymentResult = {
          id: "deploy-456",
          version: "1.2.3",
          environment: "staging",
          status: "success",
          startedAt: "2026-03-13T12:00:00Z",
          completedAt: "2026-03-13T12:10:00Z",
          duration: 600,
          target: {
            name: "staging-server",
            environment: "staging",
            url: "https://staging.example.com",
            healthCheck: "https://staging.example.com/health",
            rollbackSupported: true,
          },
          build: {
            id: "build-789",
            status: "success",
            startedAt: "2026-03-13T11:55:00Z",
            completedAt: "2026-03-13T11:59:00Z",
            duration: 240,
            steps: [],
            artifacts: [],
            commit: "abc123",
            branch: "main",
          },
          gitTag: "v1.2.3",
          rollbackVersion: "1.2.2",
          requiresHumanApproval: true,
          approvalReason: "Production deployment requires sign-off",
        };

        const parseResult = DeploymentResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });
    });
  });

  describe("formatBuildResult", () => {
    const minimalResult: BuildResult = {
      id: "build-001",
      status: "success",
      startedAt: "2026-03-13T12:00:00Z",
      steps: [],
      artifacts: [],
      commit: "abc123def",
      branch: "main",
    };

    it("should format header correctly", () => {
      const output = formatBuildResult(minimalResult);

      expect(output).toContain("# Build Report: build-001");
      expect(output).toContain("**Status:** [OK] Success");
      expect(output).toContain("**Started:** 2026-03-13T12:00:00Z");
      expect(output).toContain("**Branch:** `main`");
      expect(output).toContain("**Commit:** `abc123def`");
    });

    it("should include optional completion info", () => {
      const result: BuildResult = {
        ...minimalResult,
        completedAt: "2026-03-13T12:05:00Z",
        duration: 300,
        version: "1.2.3",
      };

      const output = formatBuildResult(result);

      expect(output).toContain("**Completed:** 2026-03-13T12:05:00Z");
      expect(output).toContain("**Duration:** 5m");
      expect(output).toContain("**Version:** 1.2.3");
    });

    it("should format build steps table", () => {
      const result: BuildResult = {
        ...minimalResult,
        steps: [
          {
            name: "Install",
            command: "npm install",
            status: "success",
            duration: 30,
          },
          {
            name: "Build",
            command: "npm run build",
            status: "success",
            duration: 60,
          },
          {
            name: "Test",
            command: "npm test",
            status: "failure",
            duration: 45,
            error: "Test failed",
          },
        ],
      };

      const output = formatBuildResult(result);

      expect(output).toContain("## Build Steps");
      expect(output).toContain("| Step | Status | Duration |");
      expect(output).toContain("| Install | [OK] success | 30s |");
      expect(output).toContain("| Build | [OK] success | 1m |");
      expect(output).toContain("| Test | [FAIL] failure | 45s |");
      expect(output).toContain("### Errors");
      expect(output).toContain("#### Test");
      expect(output).toContain("Test failed");
    });

    it("should format artifacts table", () => {
      const result: BuildResult = {
        ...minimalResult,
        artifacts: [
          {
            name: "app.tar.gz",
            path: "dist/app.tar.gz",
            size: 1048576,
            type: "archive",
          },
          {
            name: "app.exe",
            path: "dist/app.exe",
            size: 5242880,
            type: "binary",
          },
        ],
      };

      const output = formatBuildResult(result);

      expect(output).toContain("## Artifacts");
      expect(output).toContain("| Name | Type | Size |");
      expect(output).toContain("| app.tar.gz | archive | 1.0 MB |");
      expect(output).toContain("| app.exe | binary | 5.0 MB |");
    });

    it("should format all status icons correctly", () => {
      const statuses = [
        { status: "success" as const, icon: "[OK]", label: "Success" },
        { status: "failure" as const, icon: "[FAIL]", label: "Failure" },
        { status: "in_progress" as const, icon: "[...]", label: "In Progress" },
        { status: "cancelled" as const, icon: "[X]", label: "Cancelled" },
      ];

      for (const { status, icon, label } of statuses) {
        const result: BuildResult = {
          ...minimalResult,
          status,
        };

        const output = formatBuildResult(result);
        expect(output).toContain(`**Status:** ${icon} ${label}`);
      }
    });

    it("should format duration correctly", () => {
      const durations = [
        { seconds: 30, expected: "30s" },
        { seconds: 60, expected: "1m" },
        { seconds: 90, expected: "1m 30s" },
        { seconds: 3600, expected: "1h" },
        { seconds: 3660, expected: "1h 1m" },
      ];

      for (const { seconds, expected } of durations) {
        const result: BuildResult = {
          ...minimalResult,
          duration: seconds,
        };

        const output = formatBuildResult(result);
        expect(output).toContain(`**Duration:** ${expected}`);
      }
    });

    it("should format file sizes correctly", () => {
      const sizes = [
        { bytes: 500, expected: "500 B" },
        { bytes: 1024, expected: "1.0 KB" },
        { bytes: 1048576, expected: "1.0 MB" },
        { bytes: 1073741824, expected: "1.0 GB" },
      ];

      for (const { bytes, expected } of sizes) {
        const result: BuildResult = {
          ...minimalResult,
          artifacts: [
            {
              name: "test",
              path: "test",
              size: bytes,
              type: "other",
            },
          ],
        };

        const output = formatBuildResult(result);
        expect(output).toContain(expected);
      }
    });

    it("should show overall error when present", () => {
      const result: BuildResult = {
        ...minimalResult,
        status: "failure",
        error: "Critical build failure",
      };

      const output = formatBuildResult(result);

      expect(output).toContain("## Error");
      expect(output).toContain("Critical build failure");
    });
  });

  describe("formatReleaseNotes", () => {
    const minimalNotes: ReleaseNotes = {
      version: "1.0.0",
      releaseType: "major",
      date: "2026-03-13",
      title: "v1.0.0",
      summary: "Initial release",
      changes: [],
      contributors: [],
      highlights: [],
      breakingChanges: [],
      deprecations: [],
    };

    it("should format header correctly", () => {
      const output = formatReleaseNotes(minimalNotes);

      expect(output).toContain("# v1.0.0");
      expect(output).toContain("**Version:** 1.0.0");
      expect(output).toContain("**Release Type:** Major");
      expect(output).toContain("**Date:** 2026-03-13");
    });

    it("should include optional version info", () => {
      const notes: ReleaseNotes = {
        ...minimalNotes,
        previousVersion: "0.9.0",
        compareUrl: "https://github.com/org/repo/compare/v0.9.0...v1.0.0",
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("**Previous Version:** 0.9.0");
      expect(output).toContain(
        "**Compare:** [0.9.0...1.0.0](https://github.com/org/repo/compare/v0.9.0...v1.0.0)",
      );
    });

    it("should format summary section", () => {
      const output = formatReleaseNotes(minimalNotes);

      expect(output).toContain("## Summary");
      expect(output).toContain("Initial release");
    });

    it("should format highlights", () => {
      const notes: ReleaseNotes = {
        ...minimalNotes,
        highlights: ["New feature X", "Improved performance", "Better docs"],
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("## Highlights");
      expect(output).toContain("- New feature X");
      expect(output).toContain("- Improved performance");
      expect(output).toContain("- Better docs");
    });

    it("should format breaking changes", () => {
      const notes: ReleaseNotes = {
        ...minimalNotes,
        breakingChanges: ["API v1 removed", "Config format changed"],
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("## Breaking Changes");
      expect(output).toContain("- API v1 removed");
      expect(output).toContain("- Config format changed");
    });

    it("should format changes by category", () => {
      const notes: ReleaseNotes = {
        ...minimalNotes,
        changes: [
          {
            id: "1",
            category: "feature",
            title: "Add user auth",
            description: "New auth system",
            pullRequest: 42,
            author: "dev1",
            breaking: false,
          },
          {
            id: "2",
            category: "fix",
            title: "Fix login bug",
            description: "Fixed critical bug",
            author: "dev2",
            breaking: false,
          },
          {
            id: "3",
            category: "security",
            title: "Fix XSS vulnerability",
            description: "Security patch",
            breaking: false,
          },
        ],
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("[SEC] Security");
      expect(output).toContain("- Fix XSS vulnerability");
      expect(output).toContain("[+] Features");
      expect(output).toContain("- Add user auth (#42) - @dev1");
      expect(output).toContain("[FIX] Bug Fixes");
      expect(output).toContain("- Fix login bug - @dev2");
    });

    it("should format all category icons", () => {
      const categories = [
        { category: "feature" as const, icon: "[+]", label: "Features" },
        { category: "fix" as const, icon: "[FIX]", label: "Bug Fixes" },
        {
          category: "breaking" as const,
          icon: "[!]",
          label: "Breaking Changes",
        },
        {
          category: "deprecation" as const,
          icon: "[DEP]",
          label: "Deprecations",
        },
        { category: "security" as const, icon: "[SEC]", label: "Security" },
        {
          category: "performance" as const,
          icon: "[PERF]",
          label: "Performance",
        },
        {
          category: "documentation" as const,
          icon: "[DOC]",
          label: "Documentation",
        },
        { category: "internal" as const, icon: "[INT]", label: "Internal" },
      ];

      for (const { category, icon, label } of categories) {
        const notes: ReleaseNotes = {
          ...minimalNotes,
          changes: [
            {
              id: "1",
              category,
              title: "Test change",
              description: "Test",
              breaking: false,
            },
          ],
        };

        const output = formatReleaseNotes(notes);
        expect(output).toContain(`## ${icon} ${label}`);
      }
    });

    it("should format deprecations", () => {
      const notes: ReleaseNotes = {
        ...minimalNotes,
        deprecations: ["Old API deprecated", "Legacy config deprecated"],
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("## Deprecations");
      expect(output).toContain("- Old API deprecated");
      expect(output).toContain("- Legacy config deprecated");
    });

    it("should format upgrade guide", () => {
      const notes: ReleaseNotes = {
        ...minimalNotes,
        upgradeGuide: "Follow these steps:\n1. Update deps\n2. Run migration",
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("## Upgrade Guide");
      expect(output).toContain("Follow these steps:");
    });

    it("should format contributors", () => {
      const notes: ReleaseNotes = {
        ...minimalNotes,
        contributors: [
          { name: "Alice", username: "alice", contributions: 10 },
          { name: "Bob", contributions: 1 },
        ],
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("## Contributors");
      expect(output).toContain("- Alice (@alice) - 10 contributions");
      expect(output).toContain("- Bob - 1 contribution");
    });

    it("should format all release type labels", () => {
      const types = [
        { type: "major" as const, label: "Major" },
        { type: "minor" as const, label: "Minor" },
        { type: "patch" as const, label: "Patch" },
        { type: "prerelease" as const, label: "Prerelease" },
      ];

      for (const { type, label } of types) {
        const notes: ReleaseNotes = {
          ...minimalNotes,
          releaseType: type,
        };

        const output = formatReleaseNotes(notes);
        expect(output).toContain(`**Release Type:** ${label}`);
      }
    });
  });

  describe("formatDeploymentResult", () => {
    const minimalResult: DeploymentResult = {
      id: "deploy-001",
      version: "1.0.0",
      environment: "production",
      status: "success",
      startedAt: "2026-03-13T12:00:00Z",
      target: {
        name: "prod-server",
        environment: "production",
        rollbackSupported: true,
      },
      requiresHumanApproval: false,
    };

    it("should format header correctly", () => {
      const output = formatDeploymentResult(minimalResult);

      expect(output).toContain("# Deployment Report: deploy-001");
      expect(output).toContain("**Status:** [OK] Success");
      expect(output).toContain("**Version:** 1.0.0");
      expect(output).toContain("**Environment:** Production");
      expect(output).toContain("**Started:** 2026-03-13T12:00:00Z");
    });

    it("should include optional completion info", () => {
      const result: DeploymentResult = {
        ...minimalResult,
        completedAt: "2026-03-13T12:10:00Z",
        duration: 600,
        gitTag: "v1.0.0",
      };

      const output = formatDeploymentResult(result);

      expect(output).toContain("**Completed:** 2026-03-13T12:10:00Z");
      expect(output).toContain("**Duration:** 10m");
      expect(output).toContain("**Git Tag:** `v1.0.0`");
    });

    it("should format target information", () => {
      const result: DeploymentResult = {
        ...minimalResult,
        target: {
          name: "staging-cluster",
          environment: "staging",
          url: "https://staging.example.com",
          healthCheck: "https://staging.example.com/health",
          rollbackSupported: true,
        },
      };

      const output = formatDeploymentResult(result);

      expect(output).toContain("## Target");
      expect(output).toContain("- **Name:** staging-cluster");
      expect(output).toContain("- **Environment:** staging");
      expect(output).toContain("- **URL:** https://staging.example.com");
      expect(output).toContain(
        "- **Health Check:** https://staging.example.com/health",
      );
      expect(output).toContain("- **Rollback Supported:** Yes");
    });

    it("should format build information when present", () => {
      const result: DeploymentResult = {
        ...minimalResult,
        build: {
          id: "build-123",
          status: "success",
          startedAt: "2026-03-13T11:50:00Z",
          completedAt: "2026-03-13T11:55:00Z",
          duration: 300,
          steps: [],
          artifacts: [],
          commit: "abc123",
          branch: "main",
        },
      };

      const output = formatDeploymentResult(result);

      expect(output).toContain("## Build");
      expect(output).toContain("- **Build ID:** build-123");
      expect(output).toContain("- **Status:** [OK] success");
      expect(output).toContain("- **Commit:** `abc123`");
      expect(output).toContain("- **Duration:** 5m");
    });

    it("should format rollback information", () => {
      const result: DeploymentResult = {
        ...minimalResult,
        rollbackVersion: "0.9.5",
      };

      const output = formatDeploymentResult(result);

      expect(output).toContain("## Rollback");
      expect(output).toContain("Available rollback version: `0.9.5`");
    });

    it("should show human approval notice when required", () => {
      const result: DeploymentResult = {
        ...minimalResult,
        requiresHumanApproval: true,
        approvalReason: "Production deployment requires manager approval",
      };

      const output = formatDeploymentResult(result);

      expect(output).toContain("---");
      expect(output).toContain("**Human approval required**");
      expect(output).toContain(
        "Production deployment requires manager approval",
      );
    });

    it("should show default approval reason when missing", () => {
      const result: DeploymentResult = {
        ...minimalResult,
        requiresHumanApproval: true,
      };

      const output = formatDeploymentResult(result);

      expect(output).toContain("Production deployments require approval");
    });

    it("should not show approval notice when not required", () => {
      const output = formatDeploymentResult(minimalResult);

      expect(output).not.toContain("Human approval required");
    });

    it("should format all environment labels", () => {
      const environments = [
        { env: "development" as const, label: "Development" },
        { env: "staging" as const, label: "Staging" },
        { env: "production" as const, label: "Production" },
      ];

      for (const { env, label } of environments) {
        const result: DeploymentResult = {
          ...minimalResult,
          environment: env,
        };

        const output = formatDeploymentResult(result);
        expect(output).toContain(`**Environment:** ${label}`);
      }
    });

    it("should format target without optional fields", () => {
      const result: DeploymentResult = {
        ...minimalResult,
        target: {
          name: "basic-server",
          environment: "development",
          rollbackSupported: false,
        },
      };

      const output = formatDeploymentResult(result);

      expect(output).toContain("- **Name:** basic-server");
      expect(output).toContain("- **Rollback Supported:** No");
      expect(output).not.toContain("- **URL:**");
      expect(output).not.toContain("- **Health Check:**");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty build steps", () => {
      const result: BuildResult = {
        id: "build-001",
        status: "success",
        startedAt: "2026-03-13T12:00:00Z",
        steps: [],
        artifacts: [],
        commit: "abc123",
        branch: "main",
      };

      const output = formatBuildResult(result);

      expect(output).not.toContain("## Build Steps");
    });

    it("should handle empty artifacts", () => {
      const result: BuildResult = {
        id: "build-001",
        status: "success",
        startedAt: "2026-03-13T12:00:00Z",
        steps: [],
        artifacts: [],
        commit: "abc123",
        branch: "main",
      };

      const output = formatBuildResult(result);

      expect(output).not.toContain("## Artifacts");
    });

    it("should handle step without duration", () => {
      const result: BuildResult = {
        id: "build-001",
        status: "success",
        startedAt: "2026-03-13T12:00:00Z",
        steps: [
          {
            name: "Quick step",
            command: "echo test",
            status: "success",
          },
        ],
        artifacts: [],
        commit: "abc123",
        branch: "main",
      };

      const output = formatBuildResult(result);

      expect(output).toContain("| Quick step | [OK] success | - |");
    });

    it("should handle empty changes array", () => {
      const notes: ReleaseNotes = {
        version: "1.0.0",
        releaseType: "patch",
        date: "2026-03-13",
        title: "v1.0.0",
        summary: "Bug fix release",
        changes: [],
        contributors: [],
        highlights: [],
        breakingChanges: [],
        deprecations: [],
      };

      const output = formatReleaseNotes(notes);

      // Should not have category sections
      expect(output).not.toContain("[+] Features");
      expect(output).not.toContain("[FIX] Bug Fixes");
    });

    it("should handle change without PR and author", () => {
      const notes: ReleaseNotes = {
        version: "1.0.0",
        releaseType: "patch",
        date: "2026-03-13",
        title: "v1.0.0",
        summary: "Release",
        changes: [
          {
            id: "1",
            category: "fix",
            title: "Fix bug",
            description: "Fixed it",
            breaking: false,
          },
        ],
        contributors: [],
        highlights: [],
        breakingChanges: [],
        deprecations: [],
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("- Fix bug");
      expect(output).not.toContain("(#");
      expect(output).not.toContain("@");
    });

    it("should handle contributor without username", () => {
      const notes: ReleaseNotes = {
        version: "1.0.0",
        releaseType: "patch",
        date: "2026-03-13",
        title: "v1.0.0",
        summary: "Release",
        changes: [],
        contributors: [
          {
            name: "Anonymous",
            contributions: 5,
          },
        ],
        highlights: [],
        breakingChanges: [],
        deprecations: [],
      };

      const output = formatReleaseNotes(notes);

      expect(output).toContain("- Anonymous - 5 contributions");
      expect(output).not.toContain("(@");
    });

    it("should handle deployment without build info", () => {
      const result: DeploymentResult = {
        id: "deploy-001",
        version: "1.0.0",
        environment: "staging",
        status: "success",
        startedAt: "2026-03-13T12:00:00Z",
        target: {
          name: "server",
          environment: "staging",
          rollbackSupported: true,
        },
        requiresHumanApproval: false,
      };

      const output = formatDeploymentResult(result);

      expect(output).not.toContain("## Build");
    });

    it("should handle build step with pending status", () => {
      const result: BuildResult = {
        id: "build-001",
        status: "in_progress",
        startedAt: "2026-03-13T12:00:00Z",
        steps: [
          {
            name: "Pending step",
            command: "npm test",
            status: "pending",
          },
        ],
        artifacts: [],
        commit: "abc123",
        branch: "main",
      };

      const output = formatBuildResult(result);

      expect(output).toContain("| Pending step | [ ] pending | - |");
    });
  });
});
