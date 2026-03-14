/**
 * Monitoring Agent — Archon
 *
 * This agent handles metrics tracking, error aggregation, and analytics
 * for observability across the SDLC pipeline. It closes the feedback loop
 * by providing insights into system health and performance.
 *
 * The agent follows the monitoring philosophy defined in .claude/agents/monitor/CLAUDE.md
 *
 * Note: The actual monitoring logic is performed by Claude Code using the
 * agent context file. This module provides the programmatic interface
 * and type definitions.
 */

import { z } from "zod";
import type { Agent, AgentCapabilities } from "../../core/types.js";

/**
 * Metric types for categorization.
 *
 * - COUNTER: Monotonically increasing value (e.g., request count)
 * - GAUGE: Point-in-time value (e.g., memory usage)
 * - HISTOGRAM: Distribution of values (e.g., response times)
 * - SUMMARY: Similar to histogram with percentiles
 */
export const MetricType = {
  COUNTER: "counter",
  GAUGE: "gauge",
  HISTOGRAM: "histogram",
  SUMMARY: "summary",
} as const;

export type MetricType = (typeof MetricType)[keyof typeof MetricType];

/**
 * Alert severity levels.
 *
 * - CRITICAL: Requires immediate attention
 * - WARNING: Should be addressed soon
 * - INFO: Informational, no action needed
 */
export const AlertSeverity = {
  CRITICAL: "critical",
  WARNING: "warning",
  INFO: "info",
} as const;

export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

/**
 * Health status values.
 *
 * - HEALTHY: All systems operational
 * - DEGRADED: Some issues present but functional
 * - UNHEALTHY: Critical issues detected
 * - UNKNOWN: Unable to determine status
 */
export const HealthStatus = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy",
  UNKNOWN: "unknown",
} as const;

export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus];

/**
 * Error categories for classification.
 */
export const ErrorCategory = {
  BUILD: "build",
  TEST: "test",
  DEPLOY: "deploy",
  RUNTIME: "runtime",
  INTEGRATION: "integration",
  SECURITY: "security",
  PERFORMANCE: "performance",
  CONFIGURATION: "configuration",
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

/**
 * Trend direction for metrics.
 */
export const TrendDirection = {
  UP: "up",
  DOWN: "down",
  STABLE: "stable",
} as const;

export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];

/**
 * Represents a single metric data point.
 */
export const MetricSchema = z.object({
  name: z.string(),
  type: z.enum(["counter", "gauge", "histogram", "summary"]),
  value: z.number(),
  unit: z.string().optional(),
  labels: z.record(z.string()).optional(),
  timestamp: z.string(),
  description: z.string().optional(),
});

export type Metric = z.infer<typeof MetricSchema>;

/**
 * Represents an aggregated error.
 */
export const AggregatedErrorSchema = z.object({
  id: z.string(),
  message: z.string(),
  category: z.enum([
    "build",
    "test",
    "deploy",
    "runtime",
    "integration",
    "security",
    "performance",
    "configuration",
  ]),
  count: z.number(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  stackTrace: z.string().optional(),
  affectedFiles: z.array(z.string()),
  suggestedFix: z.string().optional(),
  resolved: z.boolean(),
});

export type AggregatedError = z.infer<typeof AggregatedErrorSchema>;

/**
 * Represents an alert triggered by monitoring.
 */
export const AlertSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
  source: z.string(),
  triggeredAt: z.string(),
  resolvedAt: z.string().optional(),
  acknowledged: z.boolean(),
  acknowledgedBy: z.string().optional(),
  relatedMetric: z.string().optional(),
  threshold: z.string().optional(),
  currentValue: z.string().optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

/**
 * Represents a health check result.
 */
export const HealthCheckSchema = z.object({
  name: z.string(),
  status: z.enum(["healthy", "degraded", "unhealthy", "unknown"]),
  message: z.string().optional(),
  lastChecked: z.string(),
  responseTime: z.number().optional(),
  details: z.record(z.unknown()).optional(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

/**
 * Represents a metric trend analysis.
 */
export const MetricTrendSchema = z.object({
  metricName: z.string(),
  direction: z.enum(["up", "down", "stable"]),
  changePercent: z.number(),
  period: z.string(),
  currentValue: z.number(),
  previousValue: z.number(),
  forecast: z.number().optional(),
  anomalyDetected: z.boolean(),
});

export type MetricTrend = z.infer<typeof MetricTrendSchema>;

/**
 * Complete metrics report structure.
 */
export const MetricsReportSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  summary: z.object({
    totalMetrics: z.number(),
    healthyChecks: z.number(),
    totalChecks: z.number(),
    activeAlerts: z.number(),
    resolvedAlerts: z.number(),
  }),
  metrics: z.array(MetricSchema),
  healthChecks: z.array(HealthCheckSchema),
  alerts: z.array(AlertSchema),
  trends: z.array(MetricTrendSchema),
});

export type MetricsReport = z.infer<typeof MetricsReportSchema>;

/**
 * Complete error report structure.
 */
export const ErrorReportSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  summary: z.object({
    totalErrors: z.number(),
    uniqueErrors: z.number(),
    resolvedErrors: z.number(),
    criticalErrors: z.number(),
  }),
  errors: z.array(AggregatedErrorSchema),
  topAffectedFiles: z.array(
    z.object({
      file: z.string(),
      errorCount: z.number(),
    }),
  ),
  errorsByCategory: z.record(z.number()),
  recommendations: z.array(z.string()),
});

export type ErrorReport = z.infer<typeof ErrorReportSchema>;

/**
 * Monitoring Agent configuration
 */
export type MonitorConfig = {
  /** Collect build metrics */
  trackBuildMetrics: boolean;
  /** Collect test metrics */
  trackTestMetrics: boolean;
  /** Collect deployment metrics */
  trackDeployMetrics: boolean;
  /** Aggregate errors by similarity */
  aggregateErrors: boolean;
  /** Alert on anomalies */
  enableAlerts: boolean;
  /** Retention period in days */
  retentionDays: number;
  /** Output format for reports */
  outputFormat: "markdown" | "json";
};

/** Default configuration for the Monitoring Agent */
const DEFAULT_CONFIG: MonitorConfig = {
  trackBuildMetrics: true,
  trackTestMetrics: true,
  trackDeployMetrics: true,
  aggregateErrors: true,
  enableAlerts: true,
  retentionDays: 30,
  outputFormat: "markdown",
};

/**
 * Monitoring Agent definition
 */
export type MonitorAgent = Agent & {
  readonly capabilities: AgentCapabilities;
  readonly config: MonitorConfig;
};

/**
 * Create a Monitoring Agent instance
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns A configured MonitorAgent instance
 *
 * @example
 * // Create with defaults
 * const agent = createMonitorAgent();
 *
 * @example
 * // Disable alerts for testing
 * const agent = createMonitorAgent({ enableAlerts: false });
 */
export function createMonitorAgent(
  configOverrides: Partial<MonitorConfig> = {},
): MonitorAgent {
  const config: MonitorConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  return {
    name: "Monitor",
    role: "Monitoring Agent",
    status: "active",
    version: "0.1.0",
    capabilities: {
      canModifyFiles: false, // Read-only observability
      canExecuteCommands: true, // Runs health checks
      canAccessNetwork: false, // No external network access needed
      requiresHumanApproval: false, // Observability is passive
    },
    config,
  };
}

/**
 * Format a metrics report as markdown
 *
 * @param report - The metrics report to format
 * @returns Markdown-formatted metrics report string
 */
export function formatMetricsReport(report: MetricsReport): string {
  const lines: string[] = [
    `# Metrics Report: ${report.id}`,
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Period:** ${report.period.start} to ${report.period.end}`,
    "",
    "## Summary",
    "",
    `- **Total Metrics:** ${report.summary.totalMetrics}`,
    `- **Health Checks:** ${report.summary.healthyChecks}/${report.summary.totalChecks} passing`,
    `- **Active Alerts:** ${report.summary.activeAlerts}`,
    `- **Resolved Alerts:** ${report.summary.resolvedAlerts}`,
    "",
  ];

  // Health Checks
  if (report.healthChecks.length > 0) {
    lines.push("## Health Checks", "");
    lines.push("| Service | Status | Response Time |");
    lines.push("|---------|--------|---------------|");

    for (const check of report.healthChecks) {
      const statusIcon = getHealthStatusIcon(check.status);
      const responseTime =
        check.responseTime !== undefined ? `${check.responseTime}ms` : "-";
      lines.push(
        `| ${check.name} | ${statusIcon} ${check.status} | ${responseTime} |`,
      );
    }
    lines.push("");
  }

  // Active Alerts
  const activeAlerts = report.alerts.filter((a) => !a.resolvedAt);
  if (activeAlerts.length > 0) {
    lines.push("## Active Alerts", "");
    for (const alert of activeAlerts) {
      const severityIcon = getAlertSeverityIcon(alert.severity);
      lines.push(`### ${severityIcon} ${alert.title}`);
      lines.push("");
      lines.push(`- **Severity:** ${alert.severity}`);
      lines.push(`- **Source:** ${alert.source}`);
      lines.push(`- **Triggered:** ${alert.triggeredAt}`);
      if (alert.threshold) {
        lines.push(`- **Threshold:** ${alert.threshold}`);
      }
      if (alert.currentValue) {
        lines.push(`- **Current Value:** ${alert.currentValue}`);
      }
      lines.push("");
      lines.push(`> ${alert.message}`);
      lines.push("");
    }
  }

  // Metrics
  if (report.metrics.length > 0) {
    lines.push("## Metrics", "");
    lines.push("| Name | Type | Value | Unit |");
    lines.push("|------|------|-------|------|");

    for (const metric of report.metrics) {
      const typeIcon = getMetricTypeIcon(metric.type);
      const unit = metric.unit ?? "-";
      const value = formatMetricValue(metric.value, metric.type);
      lines.push(`| ${metric.name} | ${typeIcon} | ${value} | ${unit} |`);
    }
    lines.push("");
  }

  // Trends
  if (report.trends.length > 0) {
    lines.push("## Trends", "");
    for (const trend of report.trends) {
      const trendIcon = getTrendIcon(trend.direction);
      const anomalyWarning = trend.anomalyDetected ? " [ANOMALY]" : "";
      lines.push(
        `- **${trend.metricName}:** ${trendIcon} ${trend.changePercent > 0 ? "+" : ""}${trend.changePercent.toFixed(1)}% (${trend.period})${anomalyWarning}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format an error report as markdown
 *
 * @param report - The error report to format
 * @returns Markdown-formatted error report string
 */
export function formatErrorReport(report: ErrorReport): string {
  const lines: string[] = [
    `# Error Report: ${report.id}`,
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Period:** ${report.period.start} to ${report.period.end}`,
    "",
    "## Summary",
    "",
    `- **Total Errors:** ${report.summary.totalErrors}`,
    `- **Unique Errors:** ${report.summary.uniqueErrors}`,
    `- **Resolved:** ${report.summary.resolvedErrors}`,
    `- **Critical:** ${report.summary.criticalErrors}`,
    "",
  ];

  // Errors by Category
  const categories = Object.entries(report.errorsByCategory);
  if (categories.length > 0) {
    lines.push("## Errors by Category", "");
    lines.push("| Category | Count |");
    lines.push("|----------|-------|");

    for (const [category, count] of categories) {
      const icon = getErrorCategoryIcon(category);
      lines.push(`| ${icon} ${category} | ${count} |`);
    }
    lines.push("");
  }

  // Top Affected Files
  if (report.topAffectedFiles.length > 0) {
    lines.push("## Top Affected Files", "");
    for (const { file, errorCount } of report.topAffectedFiles) {
      lines.push(
        `- \`${file}\` - ${errorCount} error${errorCount !== 1 ? "s" : ""}`,
      );
    }
    lines.push("");
  }

  // Error Details
  if (report.errors.length > 0) {
    lines.push("## Error Details", "");

    for (const error of report.errors) {
      const statusIcon = error.resolved ? "[RESOLVED]" : "[OPEN]";
      const categoryIcon = getErrorCategoryIcon(error.category);
      lines.push(`### ${statusIcon} ${categoryIcon} ${error.message}`);
      lines.push("");
      lines.push(`- **ID:** ${error.id}`);
      lines.push(`- **Category:** ${error.category}`);
      lines.push(`- **Occurrences:** ${error.count}`);
      lines.push(`- **First Seen:** ${error.firstSeen}`);
      lines.push(`- **Last Seen:** ${error.lastSeen}`);

      if (error.affectedFiles.length > 0) {
        lines.push(`- **Affected Files:** ${error.affectedFiles.join(", ")}`);
      }

      if (error.stackTrace) {
        lines.push("");
        lines.push("```");
        lines.push(error.stackTrace);
        lines.push("```");
      }

      if (error.suggestedFix) {
        lines.push("");
        lines.push(`**Suggested Fix:** ${error.suggestedFix}`);
      }
      lines.push("");
    }
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push("## Recommendations", "");
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get icon for health status
 */
function getHealthStatusIcon(status: string): string {
  switch (status) {
    case "healthy":
      return "[OK]";
    case "degraded":
      return "[WARN]";
    case "unhealthy":
      return "[FAIL]";
    case "unknown":
      return "[?]";
    default:
      return "[?]";
  }
}

/**
 * Get icon for alert severity
 */
function getAlertSeverityIcon(severity: string): string {
  switch (severity) {
    case "critical":
      return "[CRITICAL]";
    case "warning":
      return "[WARNING]";
    case "info":
      return "[INFO]";
    default:
      return "[?]";
  }
}

/**
 * Get icon for metric type
 */
function getMetricTypeIcon(type: string): string {
  switch (type) {
    case "counter":
      return "[CNT]";
    case "gauge":
      return "[GAU]";
    case "histogram":
      return "[HIS]";
    case "summary":
      return "[SUM]";
    default:
      return "[?]";
  }
}

/**
 * Get icon for trend direction
 */
function getTrendIcon(direction: string): string {
  switch (direction) {
    case "up":
      return "[UP]";
    case "down":
      return "[DOWN]";
    case "stable":
      return "[~]";
    default:
      return "[?]";
  }
}

/**
 * Get icon for error category
 */
function getErrorCategoryIcon(category: string): string {
  switch (category) {
    case "build":
      return "[BUILD]";
    case "test":
      return "[TEST]";
    case "deploy":
      return "[DEPLOY]";
    case "runtime":
      return "[RUNTIME]";
    case "integration":
      return "[INT]";
    case "security":
      return "[SEC]";
    case "performance":
      return "[PERF]";
    case "configuration":
      return "[CFG]";
    default:
      return "[?]";
  }
}

/**
 * Format metric value based on type
 */
function formatMetricValue(value: number, type: string): string {
  switch (type) {
    case "counter":
      return value.toLocaleString();
    case "gauge":
      return value.toFixed(2);
    case "histogram":
    case "summary":
      return value.toFixed(3);
    default:
      return value.toString();
  }
}
