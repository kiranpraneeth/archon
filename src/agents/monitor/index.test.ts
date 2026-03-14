/**
 * Tests for the Monitoring Agent
 */

import { describe, it, expect } from "vitest";
import {
  createMonitorAgent,
  formatMetricsReport,
  formatErrorReport,
  MetricType,
  AlertSeverity,
  HealthStatus,
  ErrorCategory,
  TrendDirection,
  MetricSchema,
  AggregatedErrorSchema,
  AlertSchema,
  HealthCheckSchema,
  MetricTrendSchema,
  MetricsReportSchema,
  ErrorReportSchema,
  type Metric,
  type AggregatedError,
  type Alert,
  type HealthCheck,
  type MetricTrend,
  type MetricsReport,
  type ErrorReport,
  type MonitorConfig,
} from "./index.js";

describe("Monitoring Agent", () => {
  describe("createMonitorAgent", () => {
    it("should create agent with default configuration", () => {
      const agent = createMonitorAgent();

      expect(agent.name).toBe("Monitor");
      expect(agent.role).toBe("Monitoring Agent");
      expect(agent.status).toBe("active");
      expect(agent.version).toBe("0.1.0");
    });

    it("should have correct capabilities", () => {
      const agent = createMonitorAgent();

      expect(agent.capabilities.canModifyFiles).toBe(false);
      expect(agent.capabilities.canExecuteCommands).toBe(true);
      expect(agent.capabilities.canAccessNetwork).toBe(false);
      expect(agent.capabilities.requiresHumanApproval).toBe(false);
    });

    it("should have default config values", () => {
      const agent = createMonitorAgent();

      expect(agent.config.trackBuildMetrics).toBe(true);
      expect(agent.config.trackTestMetrics).toBe(true);
      expect(agent.config.trackDeployMetrics).toBe(true);
      expect(agent.config.aggregateErrors).toBe(true);
      expect(agent.config.enableAlerts).toBe(true);
      expect(agent.config.retentionDays).toBe(30);
      expect(agent.config.outputFormat).toBe("markdown");
    });

    it("should allow config overrides", () => {
      const customConfig: Partial<MonitorConfig> = {
        enableAlerts: false,
        retentionDays: 7,
        outputFormat: "json",
      };

      const agent = createMonitorAgent(customConfig);

      expect(agent.config.enableAlerts).toBe(false);
      expect(agent.config.retentionDays).toBe(7);
      expect(agent.config.outputFormat).toBe("json");
      // Defaults should still apply for non-overridden values
      expect(agent.config.trackBuildMetrics).toBe(true);
      expect(agent.config.trackTestMetrics).toBe(true);
    });

    it("should preserve partial overrides correctly", () => {
      const agent = createMonitorAgent({
        trackBuildMetrics: false,
        aggregateErrors: false,
      });

      expect(agent.config.trackBuildMetrics).toBe(false);
      expect(agent.config.aggregateErrors).toBe(false);
      expect(agent.config.trackTestMetrics).toBe(true);
      expect(agent.config.trackDeployMetrics).toBe(true);
    });
  });

  describe("Type Constants", () => {
    it("should have correct MetricType values", () => {
      expect(MetricType.COUNTER).toBe("counter");
      expect(MetricType.GAUGE).toBe("gauge");
      expect(MetricType.HISTOGRAM).toBe("histogram");
      expect(MetricType.SUMMARY).toBe("summary");
    });

    it("should have correct AlertSeverity values", () => {
      expect(AlertSeverity.CRITICAL).toBe("critical");
      expect(AlertSeverity.WARNING).toBe("warning");
      expect(AlertSeverity.INFO).toBe("info");
    });

    it("should have correct HealthStatus values", () => {
      expect(HealthStatus.HEALTHY).toBe("healthy");
      expect(HealthStatus.DEGRADED).toBe("degraded");
      expect(HealthStatus.UNHEALTHY).toBe("unhealthy");
      expect(HealthStatus.UNKNOWN).toBe("unknown");
    });

    it("should have correct ErrorCategory values", () => {
      expect(ErrorCategory.BUILD).toBe("build");
      expect(ErrorCategory.TEST).toBe("test");
      expect(ErrorCategory.DEPLOY).toBe("deploy");
      expect(ErrorCategory.RUNTIME).toBe("runtime");
      expect(ErrorCategory.INTEGRATION).toBe("integration");
      expect(ErrorCategory.SECURITY).toBe("security");
      expect(ErrorCategory.PERFORMANCE).toBe("performance");
      expect(ErrorCategory.CONFIGURATION).toBe("configuration");
    });

    it("should have correct TrendDirection values", () => {
      expect(TrendDirection.UP).toBe("up");
      expect(TrendDirection.DOWN).toBe("down");
      expect(TrendDirection.STABLE).toBe("stable");
    });
  });

  describe("Zod Schemas", () => {
    describe("MetricSchema", () => {
      it("should validate a valid metric", () => {
        const metric: Metric = {
          name: "request_count",
          type: "counter",
          value: 1000,
          timestamp: "2026-03-13T12:00:00Z",
        };

        const result = MetricSchema.safeParse(metric);
        expect(result.success).toBe(true);
      });

      it("should accept optional fields", () => {
        const metric: Metric = {
          name: "cpu_usage",
          type: "gauge",
          value: 45.5,
          unit: "percent",
          labels: { host: "server-1", env: "prod" },
          timestamp: "2026-03-13T12:00:00Z",
          description: "CPU utilization percentage",
        };

        const result = MetricSchema.safeParse(metric);
        expect(result.success).toBe(true);
      });

      it("should validate all metric types", () => {
        const types = ["counter", "gauge", "histogram", "summary"] as const;
        for (const type of types) {
          const metric: Metric = {
            name: "test",
            type,
            value: 100,
            timestamp: "2026-03-13T12:00:00Z",
          };
          const result = MetricSchema.safeParse(metric);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid type", () => {
        const invalid = {
          name: "test",
          type: "invalid",
          value: 100,
          timestamp: "2026-03-13T12:00:00Z",
        };

        const result = MetricSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("AggregatedErrorSchema", () => {
      it("should validate a valid aggregated error", () => {
        const error: AggregatedError = {
          id: "ERR-001",
          message: "TypeScript compilation failed",
          category: "build",
          count: 5,
          firstSeen: "2026-03-13T10:00:00Z",
          lastSeen: "2026-03-13T12:00:00Z",
          affectedFiles: ["src/index.ts"],
          resolved: false,
        };

        const result = AggregatedErrorSchema.safeParse(error);
        expect(result.success).toBe(true);
      });

      it("should accept optional fields", () => {
        const error: AggregatedError = {
          id: "ERR-002",
          message: "Test failed",
          category: "test",
          count: 1,
          firstSeen: "2026-03-13T11:00:00Z",
          lastSeen: "2026-03-13T11:00:00Z",
          stackTrace: "Error: at line 42",
          affectedFiles: ["src/test.ts", "src/utils.ts"],
          suggestedFix: "Check the assertion",
          resolved: true,
        };

        const result = AggregatedErrorSchema.safeParse(error);
        expect(result.success).toBe(true);
      });

      it("should validate all error categories", () => {
        const categories = [
          "build",
          "test",
          "deploy",
          "runtime",
          "integration",
          "security",
          "performance",
          "configuration",
        ] as const;

        for (const category of categories) {
          const error: AggregatedError = {
            id: "ERR-001",
            message: "Test",
            category,
            count: 1,
            firstSeen: "2026-03-13T10:00:00Z",
            lastSeen: "2026-03-13T10:00:00Z",
            affectedFiles: [],
            resolved: false,
          };
          const result = AggregatedErrorSchema.safeParse(error);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid category", () => {
        const invalid = {
          id: "ERR-001",
          message: "Test",
          category: "invalid",
          count: 1,
          firstSeen: "2026-03-13T10:00:00Z",
          lastSeen: "2026-03-13T10:00:00Z",
          affectedFiles: [],
          resolved: false,
        };

        const result = AggregatedErrorSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("AlertSchema", () => {
      it("should validate a valid alert", () => {
        const alert: Alert = {
          id: "ALERT-001",
          title: "High CPU Usage",
          message: "CPU usage exceeded 90%",
          severity: "warning",
          source: "monitoring-agent",
          triggeredAt: "2026-03-13T12:00:00Z",
          acknowledged: false,
        };

        const result = AlertSchema.safeParse(alert);
        expect(result.success).toBe(true);
      });

      it("should accept optional fields", () => {
        const alert: Alert = {
          id: "ALERT-002",
          title: "Memory Alert",
          message: "Memory usage critical",
          severity: "critical",
          source: "system",
          triggeredAt: "2026-03-13T11:00:00Z",
          resolvedAt: "2026-03-13T11:30:00Z",
          acknowledged: true,
          acknowledgedBy: "admin",
          relatedMetric: "memory_usage",
          threshold: "> 95%",
          currentValue: "97%",
        };

        const result = AlertSchema.safeParse(alert);
        expect(result.success).toBe(true);
      });

      it("should validate all severity levels", () => {
        const severities = ["critical", "warning", "info"] as const;

        for (const severity of severities) {
          const alert: Alert = {
            id: "ALERT-001",
            title: "Test",
            message: "Test",
            severity,
            source: "test",
            triggeredAt: "2026-03-13T12:00:00Z",
            acknowledged: false,
          };
          const result = AlertSchema.safeParse(alert);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid severity", () => {
        const invalid = {
          id: "ALERT-001",
          title: "Test",
          message: "Test",
          severity: "invalid",
          source: "test",
          triggeredAt: "2026-03-13T12:00:00Z",
          acknowledged: false,
        };

        const result = AlertSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("HealthCheckSchema", () => {
      it("should validate a valid health check", () => {
        const check: HealthCheck = {
          name: "database",
          status: "healthy",
          lastChecked: "2026-03-13T12:00:00Z",
        };

        const result = HealthCheckSchema.safeParse(check);
        expect(result.success).toBe(true);
      });

      it("should accept optional fields", () => {
        const check: HealthCheck = {
          name: "api-server",
          status: "degraded",
          message: "Some endpoints slow",
          lastChecked: "2026-03-13T12:00:00Z",
          responseTime: 250,
          details: { endpoints: ["api/v1", "api/v2"] },
        };

        const result = HealthCheckSchema.safeParse(check);
        expect(result.success).toBe(true);
      });

      it("should validate all health statuses", () => {
        const statuses = [
          "healthy",
          "degraded",
          "unhealthy",
          "unknown",
        ] as const;

        for (const status of statuses) {
          const check: HealthCheck = {
            name: "test",
            status,
            lastChecked: "2026-03-13T12:00:00Z",
          };
          const result = HealthCheckSchema.safeParse(check);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid status", () => {
        const invalid = {
          name: "test",
          status: "invalid",
          lastChecked: "2026-03-13T12:00:00Z",
        };

        const result = HealthCheckSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("MetricTrendSchema", () => {
      it("should validate a valid trend", () => {
        const trend: MetricTrend = {
          metricName: "response_time",
          direction: "up",
          changePercent: 15.5,
          period: "24h",
          currentValue: 250,
          previousValue: 216.45,
          anomalyDetected: false,
        };

        const result = MetricTrendSchema.safeParse(trend);
        expect(result.success).toBe(true);
      });

      it("should accept optional forecast", () => {
        const trend: MetricTrend = {
          metricName: "error_rate",
          direction: "down",
          changePercent: -20,
          period: "7d",
          currentValue: 0.02,
          previousValue: 0.025,
          forecast: 0.015,
          anomalyDetected: false,
        };

        const result = MetricTrendSchema.safeParse(trend);
        expect(result.success).toBe(true);
      });

      it("should validate all directions", () => {
        const directions = ["up", "down", "stable"] as const;

        for (const direction of directions) {
          const trend: MetricTrend = {
            metricName: "test",
            direction,
            changePercent: 0,
            period: "1h",
            currentValue: 100,
            previousValue: 100,
            anomalyDetected: false,
          };
          const result = MetricTrendSchema.safeParse(trend);
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid direction", () => {
        const invalid = {
          metricName: "test",
          direction: "invalid",
          changePercent: 0,
          period: "1h",
          currentValue: 100,
          previousValue: 100,
          anomalyDetected: false,
        };

        const result = MetricTrendSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe("MetricsReportSchema", () => {
      it("should validate a minimal metrics report", () => {
        const report: MetricsReport = {
          id: "RPT-001",
          generatedAt: "2026-03-13T12:00:00Z",
          period: {
            start: "2026-03-12T12:00:00Z",
            end: "2026-03-13T12:00:00Z",
          },
          summary: {
            totalMetrics: 0,
            healthyChecks: 0,
            totalChecks: 0,
            activeAlerts: 0,
            resolvedAlerts: 0,
          },
          metrics: [],
          healthChecks: [],
          alerts: [],
          trends: [],
        };

        const result = MetricsReportSchema.safeParse(report);
        expect(result.success).toBe(true);
      });

      it("should validate a complete metrics report", () => {
        const report: MetricsReport = {
          id: "RPT-002",
          generatedAt: "2026-03-13T12:00:00Z",
          period: {
            start: "2026-03-12T12:00:00Z",
            end: "2026-03-13T12:00:00Z",
          },
          summary: {
            totalMetrics: 5,
            healthyChecks: 3,
            totalChecks: 4,
            activeAlerts: 1,
            resolvedAlerts: 2,
          },
          metrics: [
            {
              name: "cpu",
              type: "gauge",
              value: 50,
              timestamp: "2026-03-13T12:00:00Z",
            },
          ],
          healthChecks: [
            {
              name: "db",
              status: "healthy",
              lastChecked: "2026-03-13T12:00:00Z",
            },
          ],
          alerts: [
            {
              id: "A1",
              title: "Test",
              message: "Test",
              severity: "info",
              source: "test",
              triggeredAt: "2026-03-13T11:00:00Z",
              acknowledged: false,
            },
          ],
          trends: [
            {
              metricName: "cpu",
              direction: "stable",
              changePercent: 0,
              period: "24h",
              currentValue: 50,
              previousValue: 50,
              anomalyDetected: false,
            },
          ],
        };

        const result = MetricsReportSchema.safeParse(report);
        expect(result.success).toBe(true);
      });
    });

    describe("ErrorReportSchema", () => {
      it("should validate a minimal error report", () => {
        const report: ErrorReport = {
          id: "ERR-RPT-001",
          generatedAt: "2026-03-13T12:00:00Z",
          period: {
            start: "2026-03-12T12:00:00Z",
            end: "2026-03-13T12:00:00Z",
          },
          summary: {
            totalErrors: 0,
            uniqueErrors: 0,
            resolvedErrors: 0,
            criticalErrors: 0,
          },
          errors: [],
          topAffectedFiles: [],
          errorsByCategory: {},
          recommendations: [],
        };

        const result = ErrorReportSchema.safeParse(report);
        expect(result.success).toBe(true);
      });

      it("should validate a complete error report", () => {
        const report: ErrorReport = {
          id: "ERR-RPT-002",
          generatedAt: "2026-03-13T12:00:00Z",
          period: {
            start: "2026-03-12T12:00:00Z",
            end: "2026-03-13T12:00:00Z",
          },
          summary: {
            totalErrors: 10,
            uniqueErrors: 3,
            resolvedErrors: 2,
            criticalErrors: 1,
          },
          errors: [
            {
              id: "E1",
              message: "Build failed",
              category: "build",
              count: 5,
              firstSeen: "2026-03-12T14:00:00Z",
              lastSeen: "2026-03-13T10:00:00Z",
              affectedFiles: ["src/index.ts"],
              resolved: false,
            },
          ],
          topAffectedFiles: [{ file: "src/index.ts", errorCount: 5 }],
          errorsByCategory: { build: 5, test: 3, runtime: 2 },
          recommendations: ["Fix the TypeScript errors in src/index.ts"],
        };

        const result = ErrorReportSchema.safeParse(report);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("formatMetricsReport", () => {
    const minimalReport: MetricsReport = {
      id: "RPT-001",
      generatedAt: "2026-03-13T12:00:00Z",
      period: {
        start: "2026-03-12T12:00:00Z",
        end: "2026-03-13T12:00:00Z",
      },
      summary: {
        totalMetrics: 5,
        healthyChecks: 3,
        totalChecks: 4,
        activeAlerts: 1,
        resolvedAlerts: 2,
      },
      metrics: [],
      healthChecks: [],
      alerts: [],
      trends: [],
    };

    it("should format header correctly", () => {
      const output = formatMetricsReport(minimalReport);

      expect(output).toContain("# Metrics Report: RPT-001");
      expect(output).toContain("**Generated:** 2026-03-13T12:00:00Z");
      expect(output).toContain(
        "**Period:** 2026-03-12T12:00:00Z to 2026-03-13T12:00:00Z",
      );
    });

    it("should format summary correctly", () => {
      const output = formatMetricsReport(minimalReport);

      expect(output).toContain("## Summary");
      expect(output).toContain("- **Total Metrics:** 5");
      expect(output).toContain("- **Health Checks:** 3/4 passing");
      expect(output).toContain("- **Active Alerts:** 1");
      expect(output).toContain("- **Resolved Alerts:** 2");
    });

    it("should format health checks table", () => {
      const report: MetricsReport = {
        ...minimalReport,
        healthChecks: [
          {
            name: "database",
            status: "healthy",
            lastChecked: "2026-03-13T12:00:00Z",
            responseTime: 15,
          },
          {
            name: "cache",
            status: "degraded",
            lastChecked: "2026-03-13T12:00:00Z",
            responseTime: 250,
          },
          {
            name: "api",
            status: "unhealthy",
            lastChecked: "2026-03-13T12:00:00Z",
          },
        ],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("## Health Checks");
      expect(output).toContain("| Service | Status | Response Time |");
      expect(output).toContain("| database | [OK] healthy | 15ms |");
      expect(output).toContain("| cache | [WARN] degraded | 250ms |");
      expect(output).toContain("| api | [FAIL] unhealthy | - |");
    });

    it("should format all health status icons", () => {
      const statuses = [
        { status: "healthy" as const, icon: "[OK]" },
        { status: "degraded" as const, icon: "[WARN]" },
        { status: "unhealthy" as const, icon: "[FAIL]" },
        { status: "unknown" as const, icon: "[?]" },
      ];

      for (const { status, icon } of statuses) {
        const report: MetricsReport = {
          ...minimalReport,
          healthChecks: [
            {
              name: "test",
              status,
              lastChecked: "2026-03-13T12:00:00Z",
            },
          ],
        };

        const output = formatMetricsReport(report);
        expect(output).toContain(`| test | ${icon} ${status}`);
      }
    });

    it("should format active alerts", () => {
      const report: MetricsReport = {
        ...minimalReport,
        alerts: [
          {
            id: "ALERT-001",
            title: "High CPU Usage",
            message: "CPU exceeded threshold",
            severity: "warning",
            source: "system",
            triggeredAt: "2026-03-13T11:00:00Z",
            acknowledged: false,
            threshold: "> 80%",
            currentValue: "92%",
          },
        ],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("## Active Alerts");
      expect(output).toContain("### [WARNING] High CPU Usage");
      expect(output).toContain("- **Severity:** warning");
      expect(output).toContain("- **Source:** system");
      expect(output).toContain("- **Triggered:** 2026-03-13T11:00:00Z");
      expect(output).toContain("- **Threshold:** > 80%");
      expect(output).toContain("- **Current Value:** 92%");
      expect(output).toContain("> CPU exceeded threshold");
    });

    it("should format all alert severity icons", () => {
      const severities = [
        { severity: "critical" as const, icon: "[CRITICAL]" },
        { severity: "warning" as const, icon: "[WARNING]" },
        { severity: "info" as const, icon: "[INFO]" },
      ];

      for (const { severity, icon } of severities) {
        const report: MetricsReport = {
          ...minimalReport,
          alerts: [
            {
              id: "A1",
              title: "Test Alert",
              message: "Test",
              severity,
              source: "test",
              triggeredAt: "2026-03-13T11:00:00Z",
              acknowledged: false,
            },
          ],
        };

        const output = formatMetricsReport(report);
        expect(output).toContain(`### ${icon} Test Alert`);
      }
    });

    it("should not show resolved alerts in active alerts section", () => {
      const report: MetricsReport = {
        ...minimalReport,
        alerts: [
          {
            id: "ALERT-001",
            title: "Previously Active Now Fixed",
            message: "This was resolved",
            severity: "warning",
            source: "system",
            triggeredAt: "2026-03-13T10:00:00Z",
            resolvedAt: "2026-03-13T11:00:00Z",
            acknowledged: true,
          },
        ],
      };

      const output = formatMetricsReport(report);

      expect(output).not.toContain("## Active Alerts");
      expect(output).not.toContain("Previously Active Now Fixed");
    });

    it("should format metrics table", () => {
      const report: MetricsReport = {
        ...minimalReport,
        metrics: [
          {
            name: "request_count",
            type: "counter",
            value: 1500,
            unit: "requests",
            timestamp: "2026-03-13T12:00:00Z",
          },
          {
            name: "cpu_usage",
            type: "gauge",
            value: 45.5,
            unit: "percent",
            timestamp: "2026-03-13T12:00:00Z",
          },
          {
            name: "response_time",
            type: "histogram",
            value: 0.125,
            unit: "seconds",
            timestamp: "2026-03-13T12:00:00Z",
          },
        ],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("## Metrics");
      expect(output).toContain("| Name | Type | Value | Unit |");
      expect(output).toContain("| request_count | [CNT] | 1,500 | requests |");
      expect(output).toContain("| cpu_usage | [GAU] | 45.50 | percent |");
      expect(output).toContain("| response_time | [HIS] | 0.125 | seconds |");
    });

    it("should format all metric type icons", () => {
      const types = [
        { type: "counter" as const, icon: "[CNT]" },
        { type: "gauge" as const, icon: "[GAU]" },
        { type: "histogram" as const, icon: "[HIS]" },
        { type: "summary" as const, icon: "[SUM]" },
      ];

      for (const { type, icon } of types) {
        const report: MetricsReport = {
          ...minimalReport,
          metrics: [
            {
              name: "test",
              type,
              value: 100,
              timestamp: "2026-03-13T12:00:00Z",
            },
          ],
        };

        const output = formatMetricsReport(report);
        expect(output).toContain(`| test | ${icon}`);
      }
    });

    it("should format trends", () => {
      const report: MetricsReport = {
        ...minimalReport,
        trends: [
          {
            metricName: "response_time",
            direction: "up",
            changePercent: 15.5,
            period: "24h",
            currentValue: 200,
            previousValue: 173.16,
            anomalyDetected: false,
          },
          {
            metricName: "error_rate",
            direction: "down",
            changePercent: -25,
            period: "7d",
            currentValue: 0.02,
            previousValue: 0.027,
            anomalyDetected: true,
          },
          {
            metricName: "cpu_usage",
            direction: "stable",
            changePercent: 0.5,
            period: "1h",
            currentValue: 45,
            previousValue: 44.78,
            anomalyDetected: false,
          },
        ],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("## Trends");
      expect(output).toContain("- **response_time:** [UP] +15.5% (24h)");
      expect(output).toContain(
        "- **error_rate:** [DOWN] -25.0% (7d) [ANOMALY]",
      );
      expect(output).toContain("- **cpu_usage:** [~] +0.5% (1h)");
    });

    it("should format all trend direction icons", () => {
      const directions = [
        { direction: "up" as const, icon: "[UP]" },
        { direction: "down" as const, icon: "[DOWN]" },
        { direction: "stable" as const, icon: "[~]" },
      ];

      for (const { direction, icon } of directions) {
        const report: MetricsReport = {
          ...minimalReport,
          trends: [
            {
              metricName: "test",
              direction,
              changePercent: 0,
              period: "1h",
              currentValue: 100,
              previousValue: 100,
              anomalyDetected: false,
            },
          ],
        };

        const output = formatMetricsReport(report);
        expect(output).toContain(`- **test:** ${icon}`);
      }
    });
  });

  describe("formatErrorReport", () => {
    const minimalReport: ErrorReport = {
      id: "ERR-RPT-001",
      generatedAt: "2026-03-13T12:00:00Z",
      period: {
        start: "2026-03-12T12:00:00Z",
        end: "2026-03-13T12:00:00Z",
      },
      summary: {
        totalErrors: 10,
        uniqueErrors: 3,
        resolvedErrors: 1,
        criticalErrors: 2,
      },
      errors: [],
      topAffectedFiles: [],
      errorsByCategory: {},
      recommendations: [],
    };

    it("should format header correctly", () => {
      const output = formatErrorReport(minimalReport);

      expect(output).toContain("# Error Report: ERR-RPT-001");
      expect(output).toContain("**Generated:** 2026-03-13T12:00:00Z");
      expect(output).toContain(
        "**Period:** 2026-03-12T12:00:00Z to 2026-03-13T12:00:00Z",
      );
    });

    it("should format summary correctly", () => {
      const output = formatErrorReport(minimalReport);

      expect(output).toContain("## Summary");
      expect(output).toContain("- **Total Errors:** 10");
      expect(output).toContain("- **Unique Errors:** 3");
      expect(output).toContain("- **Resolved:** 1");
      expect(output).toContain("- **Critical:** 2");
    });

    it("should format errors by category table", () => {
      const report: ErrorReport = {
        ...minimalReport,
        errorsByCategory: {
          build: 5,
          test: 3,
          runtime: 2,
        },
      };

      const output = formatErrorReport(report);

      expect(output).toContain("## Errors by Category");
      expect(output).toContain("| Category | Count |");
      expect(output).toContain("| [BUILD] build | 5 |");
      expect(output).toContain("| [TEST] test | 3 |");
      expect(output).toContain("| [RUNTIME] runtime | 2 |");
    });

    it("should format all error category icons", () => {
      const categories = [
        { category: "build", icon: "[BUILD]" },
        { category: "test", icon: "[TEST]" },
        { category: "deploy", icon: "[DEPLOY]" },
        { category: "runtime", icon: "[RUNTIME]" },
        { category: "integration", icon: "[INT]" },
        { category: "security", icon: "[SEC]" },
        { category: "performance", icon: "[PERF]" },
        { category: "configuration", icon: "[CFG]" },
      ];

      for (const { category, icon } of categories) {
        const report: ErrorReport = {
          ...minimalReport,
          errorsByCategory: { [category]: 1 },
        };

        const output = formatErrorReport(report);
        expect(output).toContain(`| ${icon} ${category} | 1 |`);
      }
    });

    it("should format top affected files", () => {
      const report: ErrorReport = {
        ...minimalReport,
        topAffectedFiles: [
          { file: "src/index.ts", errorCount: 5 },
          { file: "src/utils.ts", errorCount: 3 },
          { file: "src/api.ts", errorCount: 1 },
        ],
      };

      const output = formatErrorReport(report);

      expect(output).toContain("## Top Affected Files");
      expect(output).toContain("- `src/index.ts` - 5 errors");
      expect(output).toContain("- `src/utils.ts` - 3 errors");
      expect(output).toContain("- `src/api.ts` - 1 error");
    });

    it("should format error details", () => {
      const report: ErrorReport = {
        ...minimalReport,
        errors: [
          {
            id: "ERR-001",
            message: "TypeScript compilation error",
            category: "build",
            count: 5,
            firstSeen: "2026-03-12T14:00:00Z",
            lastSeen: "2026-03-13T10:00:00Z",
            affectedFiles: ["src/index.ts", "src/utils.ts"],
            stackTrace: "Error at line 42\n  at compile()",
            suggestedFix: "Check type definitions",
            resolved: false,
          },
        ],
      };

      const output = formatErrorReport(report);

      expect(output).toContain("## Error Details");
      expect(output).toContain(
        "### [OPEN] [BUILD] TypeScript compilation error",
      );
      expect(output).toContain("- **ID:** ERR-001");
      expect(output).toContain("- **Category:** build");
      expect(output).toContain("- **Occurrences:** 5");
      expect(output).toContain("- **First Seen:** 2026-03-12T14:00:00Z");
      expect(output).toContain("- **Last Seen:** 2026-03-13T10:00:00Z");
      expect(output).toContain(
        "- **Affected Files:** src/index.ts, src/utils.ts",
      );
      expect(output).toContain("Error at line 42");
      expect(output).toContain("**Suggested Fix:** Check type definitions");
    });

    it("should show resolved status for resolved errors", () => {
      const report: ErrorReport = {
        ...minimalReport,
        errors: [
          {
            id: "ERR-002",
            message: "Fixed error",
            category: "test",
            count: 1,
            firstSeen: "2026-03-12T10:00:00Z",
            lastSeen: "2026-03-12T10:00:00Z",
            affectedFiles: [],
            resolved: true,
          },
        ],
      };

      const output = formatErrorReport(report);

      expect(output).toContain("### [RESOLVED] [TEST] Fixed error");
    });

    it("should format recommendations", () => {
      const report: ErrorReport = {
        ...minimalReport,
        recommendations: [
          "Fix TypeScript errors in src/index.ts",
          "Add missing test coverage",
          "Update dependencies to latest versions",
        ],
      };

      const output = formatErrorReport(report);

      expect(output).toContain("## Recommendations");
      expect(output).toContain("- Fix TypeScript errors in src/index.ts");
      expect(output).toContain("- Add missing test coverage");
      expect(output).toContain("- Update dependencies to latest versions");
    });

    it("should handle error without optional fields", () => {
      const report: ErrorReport = {
        ...minimalReport,
        errors: [
          {
            id: "ERR-003",
            message: "Simple error",
            category: "runtime",
            count: 1,
            firstSeen: "2026-03-13T10:00:00Z",
            lastSeen: "2026-03-13T10:00:00Z",
            affectedFiles: [],
            resolved: false,
          },
        ],
      };

      const output = formatErrorReport(report);

      expect(output).toContain("### [OPEN] [RUNTIME] Simple error");
      expect(output).not.toContain("**Suggested Fix:**");
      expect(output).not.toContain("```"); // No stack trace
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty health checks", () => {
      const report: MetricsReport = {
        id: "RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalMetrics: 0,
          healthyChecks: 0,
          totalChecks: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
        },
        metrics: [],
        healthChecks: [],
        alerts: [],
        trends: [],
      };

      const output = formatMetricsReport(report);

      expect(output).not.toContain("## Health Checks");
    });

    it("should handle empty metrics", () => {
      const report: MetricsReport = {
        id: "RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalMetrics: 0,
          healthyChecks: 0,
          totalChecks: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
        },
        metrics: [],
        healthChecks: [],
        alerts: [],
        trends: [],
      };

      const output = formatMetricsReport(report);

      expect(output).not.toContain("## Metrics");
    });

    it("should handle empty trends", () => {
      const report: MetricsReport = {
        id: "RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalMetrics: 0,
          healthyChecks: 0,
          totalChecks: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
        },
        metrics: [],
        healthChecks: [],
        alerts: [],
        trends: [],
      };

      const output = formatMetricsReport(report);

      expect(output).not.toContain("## Trends");
    });

    it("should handle empty errors by category", () => {
      const report: ErrorReport = {
        id: "ERR-RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalErrors: 0,
          uniqueErrors: 0,
          resolvedErrors: 0,
          criticalErrors: 0,
        },
        errors: [],
        topAffectedFiles: [],
        errorsByCategory: {},
        recommendations: [],
      };

      const output = formatErrorReport(report);

      expect(output).not.toContain("## Errors by Category");
    });

    it("should handle empty top affected files", () => {
      const report: ErrorReport = {
        id: "ERR-RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalErrors: 0,
          uniqueErrors: 0,
          resolvedErrors: 0,
          criticalErrors: 0,
        },
        errors: [],
        topAffectedFiles: [],
        errorsByCategory: {},
        recommendations: [],
      };

      const output = formatErrorReport(report);

      expect(output).not.toContain("## Top Affected Files");
    });

    it("should handle empty errors", () => {
      const report: ErrorReport = {
        id: "ERR-RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalErrors: 0,
          uniqueErrors: 0,
          resolvedErrors: 0,
          criticalErrors: 0,
        },
        errors: [],
        topAffectedFiles: [],
        errorsByCategory: {},
        recommendations: [],
      };

      const output = formatErrorReport(report);

      expect(output).not.toContain("## Error Details");
    });

    it("should handle empty recommendations", () => {
      const report: ErrorReport = {
        id: "ERR-RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalErrors: 0,
          uniqueErrors: 0,
          resolvedErrors: 0,
          criticalErrors: 0,
        },
        errors: [],
        topAffectedFiles: [],
        errorsByCategory: {},
        recommendations: [],
      };

      const output = formatErrorReport(report);

      expect(output).not.toContain("## Recommendations");
    });

    it("should handle metric without unit", () => {
      const report: MetricsReport = {
        id: "RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalMetrics: 1,
          healthyChecks: 0,
          totalChecks: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
        },
        metrics: [
          {
            name: "count",
            type: "counter",
            value: 100,
            timestamp: "2026-03-13T12:00:00Z",
          },
        ],
        healthChecks: [],
        alerts: [],
        trends: [],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("| count | [CNT] | 100 | - |");
    });

    it("should handle health check without response time", () => {
      const report: MetricsReport = {
        id: "RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalMetrics: 0,
          healthyChecks: 1,
          totalChecks: 1,
          activeAlerts: 0,
          resolvedAlerts: 0,
        },
        metrics: [],
        healthChecks: [
          {
            name: "service",
            status: "healthy",
            lastChecked: "2026-03-13T12:00:00Z",
          },
        ],
        alerts: [],
        trends: [],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("| service | [OK] healthy | - |");
    });

    it("should handle alert without optional threshold info", () => {
      const report: MetricsReport = {
        id: "RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalMetrics: 0,
          healthyChecks: 0,
          totalChecks: 0,
          activeAlerts: 1,
          resolvedAlerts: 0,
        },
        metrics: [],
        healthChecks: [],
        alerts: [
          {
            id: "A1",
            title: "Simple Alert",
            message: "Something happened",
            severity: "info",
            source: "system",
            triggeredAt: "2026-03-13T11:00:00Z",
            acknowledged: false,
          },
        ],
        trends: [],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("### [INFO] Simple Alert");
      expect(output).not.toContain("- **Threshold:**");
      expect(output).not.toContain("- **Current Value:**");
    });

    it("should format negative trend percentages correctly", () => {
      const report: MetricsReport = {
        id: "RPT-001",
        generatedAt: "2026-03-13T12:00:00Z",
        period: {
          start: "2026-03-12T12:00:00Z",
          end: "2026-03-13T12:00:00Z",
        },
        summary: {
          totalMetrics: 0,
          healthyChecks: 0,
          totalChecks: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
        },
        metrics: [],
        healthChecks: [],
        alerts: [],
        trends: [
          {
            metricName: "errors",
            direction: "down",
            changePercent: -50.5,
            period: "24h",
            currentValue: 10,
            previousValue: 20.2,
            anomalyDetected: false,
          },
        ],
      };

      const output = formatMetricsReport(report);

      expect(output).toContain("- **errors:** [DOWN] -50.5% (24h)");
    });
  });
});
