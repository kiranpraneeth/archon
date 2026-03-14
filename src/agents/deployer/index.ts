/**
 * Deployment Agent — Archon
 *
 * This agent handles build automation, release management, and deployment tasks.
 * It generates release notes, manages git tags, and coordinates the deployment
 * process.
 *
 * The agent follows the deployment philosophy defined in .claude/agents/deployer/CLAUDE.md
 *
 * Note: The actual deployment logic is performed by Claude Code using the
 * agent context file. This module provides the programmatic interface
 * and type definitions.
 */

import { z } from "zod";
import type { Agent, AgentCapabilities } from "../../core/types.js";

/**
 * Build status values.
 *
 * - SUCCESS: Build completed successfully
 * - FAILURE: Build failed
 * - IN_PROGRESS: Build is currently running
 * - CANCELLED: Build was cancelled
 */
export const BuildStatus = {
  SUCCESS: "success",
  FAILURE: "failure",
  IN_PROGRESS: "in_progress",
  CANCELLED: "cancelled",
} as const;

export type BuildStatus = (typeof BuildStatus)[keyof typeof BuildStatus];

/**
 * Release types for versioning.
 *
 * - MAJOR: Breaking changes (x.0.0)
 * - MINOR: New features (0.x.0)
 * - PATCH: Bug fixes (0.0.x)
 * - PRERELEASE: Alpha/beta/rc releases
 */
export const ReleaseType = {
  MAJOR: "major",
  MINOR: "minor",
  PATCH: "patch",
  PRERELEASE: "prerelease",
} as const;

export type ReleaseType = (typeof ReleaseType)[keyof typeof ReleaseType];

/**
 * Deployment environment types.
 */
export const Environment = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

/**
 * Change categories for release notes.
 */
export const ChangeCategory = {
  FEATURE: "feature",
  FIX: "fix",
  BREAKING: "breaking",
  DEPRECATION: "deprecation",
  SECURITY: "security",
  PERFORMANCE: "performance",
  DOCUMENTATION: "documentation",
  INTERNAL: "internal",
} as const;

export type ChangeCategory =
  (typeof ChangeCategory)[keyof typeof ChangeCategory];

/**
 * Represents a build step in the build process.
 */
export const BuildStepSchema = z.object({
  name: z.string(),
  command: z.string(),
  status: z.enum(["success", "failure", "in_progress", "cancelled", "pending"]),
  duration: z.number().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
});

export type BuildStep = z.infer<typeof BuildStepSchema>;

/**
 * Represents a build artifact produced by the build process.
 */
export const BuildArtifactSchema = z.object({
  name: z.string(),
  path: z.string(),
  size: z.number(),
  checksum: z.string().optional(),
  type: z.enum(["binary", "archive", "container", "package", "other"]),
});

export type BuildArtifact = z.infer<typeof BuildArtifactSchema>;

/**
 * Complete build result.
 */
export const BuildResultSchema = z.object({
  id: z.string(),
  status: z.enum(["success", "failure", "in_progress", "cancelled"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  duration: z.number().optional(),
  steps: z.array(BuildStepSchema),
  artifacts: z.array(BuildArtifactSchema),
  commit: z.string(),
  branch: z.string(),
  version: z.string().optional(),
  logs: z.string().optional(),
  error: z.string().optional(),
});

export type BuildResult = z.infer<typeof BuildResultSchema>;

/**
 * Represents a change entry for release notes.
 */
export const ChangeEntrySchema = z.object({
  id: z.string(),
  category: z.enum([
    "feature",
    "fix",
    "breaking",
    "deprecation",
    "security",
    "performance",
    "documentation",
    "internal",
  ]),
  title: z.string(),
  description: z.string(),
  commit: z.string().optional(),
  pullRequest: z.number().optional(),
  author: z.string().optional(),
  breaking: z.boolean(),
});

export type ChangeEntry = z.infer<typeof ChangeEntrySchema>;

/**
 * Represents a contributor to the release.
 */
export const ContributorSchema = z.object({
  name: z.string(),
  username: z.string().optional(),
  contributions: z.number(),
});

export type Contributor = z.infer<typeof ContributorSchema>;

/**
 * Complete release notes structure.
 */
export const ReleaseNotesSchema = z.object({
  version: z.string(),
  releaseType: z.enum(["major", "minor", "patch", "prerelease"]),
  date: z.string(),
  title: z.string(),
  summary: z.string(),
  changes: z.array(ChangeEntrySchema),
  contributors: z.array(ContributorSchema),
  previousVersion: z.string().optional(),
  compareUrl: z.string().optional(),
  highlights: z.array(z.string()),
  breakingChanges: z.array(z.string()),
  deprecations: z.array(z.string()),
  upgradeGuide: z.string().optional(),
});

export type ReleaseNotes = z.infer<typeof ReleaseNotesSchema>;

/**
 * Deployment target configuration.
 */
export const DeploymentTargetSchema = z.object({
  name: z.string(),
  environment: z.enum(["development", "staging", "production"]),
  url: z.string().optional(),
  healthCheck: z.string().optional(),
  rollbackSupported: z.boolean(),
});

export type DeploymentTarget = z.infer<typeof DeploymentTargetSchema>;

/**
 * Complete deployment result.
 */
export const DeploymentResultSchema = z.object({
  id: z.string(),
  version: z.string(),
  environment: z.enum(["development", "staging", "production"]),
  status: z.enum(["success", "failure", "in_progress", "cancelled", "pending"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  duration: z.number().optional(),
  target: DeploymentTargetSchema,
  build: BuildResultSchema.optional(),
  releaseNotes: ReleaseNotesSchema.optional(),
  gitTag: z.string().optional(),
  rollbackVersion: z.string().optional(),
  requiresHumanApproval: z.boolean(),
  approvalReason: z.string().optional(),
});

export type DeploymentResult = z.infer<typeof DeploymentResultSchema>;

/**
 * Deployment Agent configuration
 */
export type DeployerConfig = {
  /** Auto-generate release notes from commits */
  autoGenerateReleaseNotes: boolean;
  /** Create git tags for releases */
  createGitTags: boolean;
  /** Run build steps before deployment */
  runBuildSteps: boolean;
  /** Require human approval for production */
  requireProductionApproval: boolean;
  /** Supported environments */
  environments: Environment[];
  /** Default release type */
  defaultReleaseType: ReleaseType;
  /** Output format for reports */
  outputFormat: "markdown" | "json";
};

/** Default configuration for the Deployment Agent */
const DEFAULT_CONFIG: DeployerConfig = {
  autoGenerateReleaseNotes: true,
  createGitTags: true,
  runBuildSteps: true,
  requireProductionApproval: true,
  environments: ["development", "staging", "production"],
  defaultReleaseType: "patch",
  outputFormat: "markdown",
};

/**
 * Deployment Agent definition
 */
export type DeployerAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: DeployerConfig;
};

/**
 * Create a Deployment Agent instance
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns A configured DeployerAgent instance
 *
 * @example
 * // Create with defaults
 * const agent = createDeployerAgent();
 *
 * @example
 * // Skip production approval for testing
 * const agent = createDeployerAgent({ requireProductionApproval: false });
 */
export function createDeployerAgent(
  configOverrides: Partial<DeployerConfig> = {},
): DeployerAgent {
  const config: DeployerConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Deployer",
    role: "Deployment Agent",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: true, // Can update version files, changelog
      canExecuteCommands: true, // Runs build commands, git operations
      canAccessNetwork: false, // No external network access needed
      requiresHumanApproval: true, // Deployments need approval
    },
    config,
  };
}

/**
 * Format a build result as markdown
 *
 * @param result - The build result to format
 * @returns Markdown-formatted build result string
 */
export function formatBuildResult(result: BuildResult): string {
  const lines: string[] = [
    `# Build Report: ${result.id}`,
    "",
    `**Status:** ${getStatusIcon(result.status)} ${getStatusLabel(result.status)}`,
    `**Started:** ${result.startedAt}`,
  ];

  if (result.completedAt) {
    lines.push(`**Completed:** ${result.completedAt}`);
  }
  if (result.duration !== undefined) {
    lines.push(`**Duration:** ${formatDuration(result.duration)}`);
  }

  lines.push(
    "",
    `**Branch:** \`${result.branch}\``,
    `**Commit:** \`${result.commit}\``,
  );

  if (result.version) {
    lines.push(`**Version:** ${result.version}`);
  }

  lines.push("");

  // Build Steps
  if (result.steps.length > 0) {
    lines.push("## Build Steps", "");
    lines.push("| Step | Status | Duration |");
    lines.push("|------|--------|----------|");

    for (const step of result.steps) {
      const statusIcon = getStatusIcon(step.status);
      const duration =
        step.duration !== undefined ? formatDuration(step.duration) : "-";
      lines.push(
        `| ${step.name} | ${statusIcon} ${step.status} | ${duration} |`,
      );
    }
    lines.push("");

    // Show errors for failed steps
    const failedSteps = result.steps.filter((s) => s.status === "failure");
    if (failedSteps.length > 0) {
      lines.push("### Errors", "");
      for (const step of failedSteps) {
        lines.push(`#### ${step.name}`);
        if (step.error) {
          lines.push("```");
          lines.push(step.error);
          lines.push("```");
        }
        lines.push("");
      }
    }
  }

  // Build Artifacts
  if (result.artifacts.length > 0) {
    lines.push("## Artifacts", "");
    lines.push("| Name | Type | Size |");
    lines.push("|------|------|------|");

    for (const artifact of result.artifacts) {
      const size = formatSize(artifact.size);
      lines.push(`| ${artifact.name} | ${artifact.type} | ${size} |`);
    }
    lines.push("");
  }

  // Overall error
  if (result.error) {
    lines.push("## Error", "");
    lines.push("```");
    lines.push(result.error);
    lines.push("```");
  }

  return lines.join("\n");
}

/**
 * Format release notes as markdown
 *
 * @param notes - The release notes to format
 * @returns Markdown-formatted release notes string
 */
export function formatReleaseNotes(notes: ReleaseNotes): string {
  const lines: string[] = [
    `# ${notes.title}`,
    "",
    `**Version:** ${notes.version}`,
    `**Release Type:** ${getReleaseTypeLabel(notes.releaseType)}`,
    `**Date:** ${notes.date}`,
  ];

  if (notes.previousVersion) {
    lines.push(`**Previous Version:** ${notes.previousVersion}`);
  }
  if (notes.compareUrl) {
    lines.push(
      `**Compare:** [${notes.previousVersion}...${notes.version}](${notes.compareUrl})`,
    );
  }

  lines.push("", "## Summary", "", notes.summary, "");

  // Highlights
  if (notes.highlights.length > 0) {
    lines.push("## Highlights", "");
    for (const highlight of notes.highlights) {
      lines.push(`- ${highlight}`);
    }
    lines.push("");
  }

  // Breaking Changes
  if (notes.breakingChanges.length > 0) {
    lines.push("## Breaking Changes", "");
    for (const change of notes.breakingChanges) {
      lines.push(`- ${change}`);
    }
    lines.push("");
  }

  // Changes by Category
  const changesByCategory = groupChangesByCategory(notes.changes);
  const categoryOrder: ChangeCategory[] = [
    "breaking",
    "security",
    "feature",
    "fix",
    "performance",
    "deprecation",
    "documentation",
    "internal",
  ];

  for (const category of categoryOrder) {
    const changes = changesByCategory[category];
    if (changes && changes.length > 0) {
      const categoryLabel = getCategoryLabel(category);
      const categoryIcon = getCategoryIcon(category);
      lines.push(`## ${categoryIcon} ${categoryLabel}`, "");

      for (const change of changes) {
        let line = `- ${change.title}`;
        if (change.pullRequest) {
          line += ` (#${change.pullRequest})`;
        }
        if (change.author) {
          line += ` - @${change.author}`;
        }
        lines.push(line);
        if (change.description && change.description !== change.title) {
          lines.push(`  - ${change.description}`);
        }
      }
      lines.push("");
    }
  }

  // Deprecations
  if (notes.deprecations.length > 0) {
    lines.push("## Deprecations", "");
    for (const deprecation of notes.deprecations) {
      lines.push(`- ${deprecation}`);
    }
    lines.push("");
  }

  // Upgrade Guide
  if (notes.upgradeGuide) {
    lines.push("## Upgrade Guide", "", notes.upgradeGuide, "");
  }

  // Contributors
  if (notes.contributors.length > 0) {
    lines.push("## Contributors", "");
    for (const contributor of notes.contributors) {
      const username = contributor.username
        ? ` (@${contributor.username})`
        : "";
      lines.push(
        `- ${contributor.name}${username} - ${contributor.contributions} contribution${contributor.contributions !== 1 ? "s" : ""}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a deployment result as markdown
 *
 * @param result - The deployment result to format
 * @returns Markdown-formatted deployment result string
 */
export function formatDeploymentResult(result: DeploymentResult): string {
  const lines: string[] = [
    `# Deployment Report: ${result.id}`,
    "",
    `**Status:** ${getStatusIcon(result.status)} ${getStatusLabel(result.status)}`,
    `**Version:** ${result.version}`,
    `**Environment:** ${getEnvironmentLabel(result.environment)}`,
    `**Started:** ${result.startedAt}`,
  ];

  if (result.completedAt) {
    lines.push(`**Completed:** ${result.completedAt}`);
  }
  if (result.duration !== undefined) {
    lines.push(`**Duration:** ${formatDuration(result.duration)}`);
  }
  if (result.gitTag) {
    lines.push(`**Git Tag:** \`${result.gitTag}\``);
  }

  lines.push("");

  // Target Information
  lines.push("## Target", "");
  lines.push(`- **Name:** ${result.target.name}`);
  lines.push(`- **Environment:** ${result.target.environment}`);
  if (result.target.url) {
    lines.push(`- **URL:** ${result.target.url}`);
  }
  if (result.target.healthCheck) {
    lines.push(`- **Health Check:** ${result.target.healthCheck}`);
  }
  lines.push(
    `- **Rollback Supported:** ${result.target.rollbackSupported ? "Yes" : "No"}`,
  );
  lines.push("");

  // Build Information (if present)
  if (result.build) {
    lines.push("## Build", "");
    lines.push(
      `- **Build ID:** ${result.build.id}`,
      `- **Status:** ${getStatusIcon(result.build.status)} ${result.build.status}`,
      `- **Commit:** \`${result.build.commit}\``,
    );
    if (result.build.duration !== undefined) {
      lines.push(`- **Duration:** ${formatDuration(result.build.duration)}`);
    }
    lines.push("");
  }

  // Rollback Information
  if (result.rollbackVersion) {
    lines.push("## Rollback", "");
    lines.push(`Available rollback version: \`${result.rollbackVersion}\``);
    lines.push("");
  }

  // Human Approval Notice
  if (result.requiresHumanApproval) {
    lines.push("---");
    lines.push(
      "**Human approval required**: " +
        (result.approvalReason ?? "Production deployments require approval"),
    );
  }

  return lines.join("\n");
}

/**
 * Get icon for status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case "success":
      return "[OK]";
    case "failure":
      return "[FAIL]";
    case "in_progress":
      return "[...]";
    case "cancelled":
      return "[X]";
    case "pending":
      return "[ ]";
    default:
      return "[?]";
  }
}

/**
 * Get label for status
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "success":
      return "Success";
    case "failure":
      return "Failure";
    case "in_progress":
      return "In Progress";
    case "cancelled":
      return "Cancelled";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

/**
 * Get label for release type
 */
function getReleaseTypeLabel(type: ReleaseType | string): string {
  switch (type) {
    case "major":
      return "Major";
    case "minor":
      return "Minor";
    case "patch":
      return "Patch";
    case "prerelease":
      return "Prerelease";
    default:
      return type;
  }
}

/**
 * Get label for environment
 */
function getEnvironmentLabel(env: Environment | string): string {
  switch (env) {
    case "development":
      return "Development";
    case "staging":
      return "Staging";
    case "production":
      return "Production";
    default:
      return env;
  }
}

/**
 * Get label for change category
 */
function getCategoryLabel(category: ChangeCategory | string): string {
  switch (category) {
    case "feature":
      return "Features";
    case "fix":
      return "Bug Fixes";
    case "breaking":
      return "Breaking Changes";
    case "deprecation":
      return "Deprecations";
    case "security":
      return "Security";
    case "performance":
      return "Performance";
    case "documentation":
      return "Documentation";
    case "internal":
      return "Internal";
    default:
      return category;
  }
}

/**
 * Get icon for change category
 */
function getCategoryIcon(category: ChangeCategory | string): string {
  switch (category) {
    case "feature":
      return "[+]";
    case "fix":
      return "[FIX]";
    case "breaking":
      return "[!]";
    case "deprecation":
      return "[DEP]";
    case "security":
      return "[SEC]";
    case "performance":
      return "[PERF]";
    case "documentation":
      return "[DOC]";
    case "internal":
      return "[INT]";
    default:
      return "[-]";
  }
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Format size in bytes to human-readable string
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

/**
 * Group changes by category
 */
function groupChangesByCategory(
  changes: ChangeEntry[],
): Record<string, ChangeEntry[]> {
  const grouped: Record<string, ChangeEntry[]> = {};
  for (const change of changes) {
    const category = change.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    const categoryArray = grouped[category];
    if (categoryArray) {
      categoryArray.push(change);
    }
  }
  return grouped;
}
