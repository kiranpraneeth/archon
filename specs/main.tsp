/**
 * Archon API Specification
 *
 * This is an example TypeSpec specification for the Archon platform.
 * It demonstrates how to use TypeSpec for spec-driven development.
 */

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;
using OpenAPI;

@service({
  title: "Archon API",
  version: "0.1.0",
})
@info({
  description: "AI-Native Developer Experience Platform API",
  contact: {
    name: "Archon Team",
    url: "https://github.com/kiranpraneeth/archon",
  },
  license: {
    name: "MIT",
    url: "https://opensource.org/licenses/MIT",
  },
})
@server("https://api.archon.dev", "Production server")
@server("http://localhost:3000", "Development server")
namespace Archon;

/**
 * Severity levels for code review feedback
 */
enum FeedbackSeverity {
  /**
   * Must fix before merge — bugs, security issues, broken functionality
   */
  blocker,

  /**
   * Should consider — code quality, maintainability, minor issues
   */
  suggestion,

  /**
   * Optional — style preferences, minor improvements
   */
  nitpick,
}

/**
 * Review summary outcomes
 */
enum ReviewSummary {
  /** Code is approved for merge */
  approve,

  /** Changes requested before merge */
  request_changes,

  /** Discussion needed with team */
  needs_discussion,
}

/**
 * A single piece of feedback from a code review
 */
model FeedbackItem {
  /** Severity level of this feedback */
  severity: FeedbackSeverity;

  /** Relative path to the file */
  file: string;

  /** Line number in the file (optional) */
  line?: int32;

  /** Description of the issue */
  message: string;

  /** Explanation of why this matters (optional) */
  explanation?: string;

  /** Suggested fix or approach (optional) */
  suggestedFix?: string;
}

/**
 * Complete code review result
 */
model ReviewResult {
  /** Overall verdict */
  summary: ReviewSummary;

  /** 2-3 sentence summary of the review */
  overview: string;

  /** Array of specific issues found */
  feedback: FeedbackItem[];

  /** What the reviewer liked */
  positives: string[];

  /** Clarifications needed from the author */
  questions: string[];

  /** True if agent thinks a human should also review */
  requiresHumanReview: boolean;

  /** Why human review is needed (optional) */
  humanReviewReason?: string;
}

/**
 * Request to review code changes
 */
model ReviewRequest {
  /** Files to review (relative paths) */
  files: string[];

  /** Optional context about the changes */
  context?: string;

  /** Target branch for the review */
  targetBranch?: string = "main";
}

/**
 * Agent information
 */
model Agent {
  /** Short identifier (e.g., "Reviewer", "Tester") */
  name: string;

  /** Human-readable description */
  role: string;

  /** Lifecycle stage */
  status: "active" | "planned" | "deprecated";

  /** Semantic version */
  version: string;
}

/**
 * Agent capabilities
 */
model AgentCapabilities {
  /** Can the agent write/edit files? */
  canModifyFiles: boolean;

  /** Can the agent run shell commands? */
  canExecuteCommands: boolean;

  /** Can the agent make HTTP requests? */
  canAccessNetwork: boolean;

  /** Must a human approve before agent actions take effect? */
  requiresHumanApproval: boolean;
}

/**
 * Error response
 */
@error
model ErrorResponse {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional error details (optional) */
  details?: string;
}

/**
 * Code Review endpoints
 */
@route("/api/v1/review")
namespace Review {
  /**
   * Submit code for review
   */
  @post
  @route("/submit")
  op submitReview(
    @body request: ReviewRequest
  ): ReviewResult | ErrorResponse;

  /**
   * Get review status
   */
  @get
  @route("/{reviewId}")
  op getReview(
    @path reviewId: string
  ): ReviewResult | ErrorResponse;
}

/**
 * Agent Management endpoints
 */
@route("/api/v1/agents")
namespace Agents {
  /**
   * List all available agents
   */
  @get
  @route("/")
  op listAgents(): {
    agents: Agent[];
  } | ErrorResponse;

  /**
   * Get agent details
   */
  @get
  @route("/{agentName}")
  op getAgent(
    @path agentName: string
  ): {
    agent: Agent;
    capabilities: AgentCapabilities;
  } | ErrorResponse;
}
