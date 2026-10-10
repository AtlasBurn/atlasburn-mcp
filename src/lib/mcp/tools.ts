/**
 * AtlasBurn MCP — read-only tool definitions.
 *
 * All tools are read-only, org-scoped (orgId comes from the verified OAuth token,
 * never from arguments), and content-blind. Each returns a plain JSON-serializable
 * object; the server wraps it as MCP text content plus `structuredContent`.
 *
 * This module is the public tool CONTRACT — exactly what `tools/list` advertises
 * (name, description, inputSchema, outputSchema, annotations). The data handlers
 * run inside the hosted AtlasBurn service and are not part of this repository.
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /**
   * JSON Schema for the tool's result (MCP `outputSchema`, spec 2025-06-18). Lets a
   * client/model understand the SHAPE of what comes back, not just what to send. When
   * present, the route also returns the result as `structuredContent`.
   */
  outputSchema?: Record<string, unknown>;
  /** MCP tool annotations (also required by OpenAI's Apps SDK submission). */
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

/**
 * Every AtlasBurn tool is read-only, non-destructive, idempotent, and reads only
 * the caller's own AtlasBurn data (not an open/external world). OpenAI's directory
 * requires readOnlyHint/destructiveHint/openWorldHint to be explicit.
 */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const windowSchema = {
  type: "object",
  properties: {
    windowDays: {
      type: "integer",
      minimum: 1,
      maximum: 365,
      description: "Look-back window in days (default 30).",
    },
  },
  additionalProperties: false,
};

const noArgsSchema = { type: "object", properties: {}, additionalProperties: false };

// --- Output schemas (MCP `outputSchema`) -------------------------------------
// Each mirrors the exact object the tool returns, so a client/model knows the
// shape of the result. Top level is strict (keys are constructed here); nested
// engine objects stay lenient so a new engine field never breaks validation.

const costSummaryOutput = {
  type: "object",
  properties: {
    windowDays: { type: "integer", description: "Look-back window in days." },
    connected: { type: "boolean", description: "Whether AtlasBurn has an active connection for this org." },
    hasEvents: { type: "boolean", description: "Whether any usage events exist in the window." },
    lastEventAt: { type: ["string", "null"], description: "ISO timestamp of the most recent event, or null." },
    totalCostUsd: { type: "number", description: "Total AI spend in USD over the window." },
    promptTokens: { type: "integer", description: "Total prompt/input tokens." },
    completionTokens: { type: "integer", description: "Total completion/output tokens." },
    requests: { type: "integer", description: "Total request count." },
    requestsPerSecond: { type: "number", description: "Average requests/second over the active window." },
  },
  required: ["windowDays", "connected", "hasEvents", "lastEventAt", "totalCostUsd", "promptTokens", "completionTokens", "requests", "requestsPerSecond"],
  additionalProperties: false,
};

const modelUsageShape = {
  type: "object",
  properties: {
    cost: { type: "number" },
    promptTokens: { type: "integer" },
    completionTokens: { type: "integer" },
    requests: { type: "integer" },
    avgLatencyMs: { type: "number" },
  },
};

const featureUsageShape = {
  type: "object",
  properties: {
    cost: { type: "number" },
    requests: { type: "integer" },
    riskContribution: { type: "number" },
    status: { type: "string", enum: ["PROTECTED", "BREACHED"] },
    trend: { type: "number", description: "Cost trend ratio; >2.0 flags a burn surge." },
    costPerRequest: { type: "number" },
  },
};

const costBreakdownOutput = {
  type: "object",
  properties: {
    windowDays: { type: "integer" },
    byModel: { type: "object", description: "Per-model spend, keyed by model id.", additionalProperties: modelUsageShape },
    byFeature: { type: "object", description: "Per-feature spend + risk, keyed by featureId.", additionalProperties: featureUsageShape },
  },
  required: ["windowDays", "byModel", "byFeature"],
  additionalProperties: false,
};

const runwayForecastOutput = {
  type: "object",
  properties: {
    windowDays: { type: "integer" },
    ready: { type: "boolean", description: "True when enough economic inputs exist for a full forecast." },
    note: { type: "string", description: "Present only when not ready — what's missing." },
    economics: {
      type: "object",
      description: "Unit economics; fields are absent until the inputs/history exist.",
      properties: {
        mrr: { type: "number" },
        currentDailyBurn: { type: "number" },
        burnVolatility: { type: "number" },
        churnRate: { type: "number" },
        monthlyGrowthRate: { type: "number" },
        capitalReserves: { type: "number" },
        projectedMonthlyBill: { type: "number" },
        budgetRunwayDays: { type: "number" },
      },
    },
    systemicRisk: {
      type: "object",
      properties: {
        outageProb: { type: "number" },
        retryCascadeProb: { type: "number" },
        scenarioImpactUsd: { type: "number" },
        spikeAlerts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              featureId: { type: "string" },
              severity: { type: "string", enum: ["CRITICAL", "WARNING"] },
              message: { type: "string" },
              costImpact: { type: "number" },
            },
          },
        },
      },
    },
  },
  required: ["windowDays", "ready", "economics", "systemicRisk"],
  additionalProperties: false,
};

const guardrailStatusOutput = {
  type: "object",
  properties: {
    enabled: { type: "boolean" },
    mode: { type: ["string", "null"], description: "e.g. alert / soft_stop / hard_stop." },
    status: { type: ["string", "null"], description: "Authoritative enforcement status: ACTIVE | THROTTLED | SUSPENDED." },
    dailyBudgetUsd: { type: ["number", "null"] },
    hourlyBudgetUsd: { type: ["number", "null"] },
    recentBreaches: {
      type: "array",
      description: "Up to 5 most recent breach events, newest first.",
      items: {
        type: "object",
        properties: {
          triggerType: { type: "string" },
          observedValue: { type: "number" },
          thresholdValue: { type: "number" },
          action: { type: "string" },
          actionTaken: { type: "string" },
          timestamp: { type: "string" },
        },
      },
    },
  },
  required: ["enabled", "mode", "status", "dailyBudgetUsd", "hourlyBudgetUsd", "recentBreaches"],
  additionalProperties: false,
};

const runtimeSignalsOutput = {
  type: "object",
  properties: {
    windowDays: { type: "integer" },
    signals: {
      type: ["object", "null"],
      description: "Behavioral signals, or null when none are available for the window yet.",
      properties: {
        tokenVolume: { type: "number" },
        requestRate: { type: "number" },
        retryRate: { type: "number" },
        loopProbability: { type: "number", description: "0–1 probability the traffic looks like a runaway/looping agent." },
        contextExpansionRate: { type: "number" },
        modelMix: { type: "object", additionalProperties: { type: "number" }, description: "Share of requests per model (0–1)." },
      },
    },
    note: { type: "string" },
  },
  required: ["windowDays", "signals"],
  additionalProperties: false,
};

export const TOOLS: McpTool[] = [
  {
    name: "get_cost_summary",
    annotations: { title: "Cost summary", ...READ_ONLY },
    description:
      "Total AI spend and token usage for this AtlasBurn organization over a window (default 30 days): cost, prompt/completion tokens, request count, and requests/second.",
    inputSchema: windowSchema,
    outputSchema: costSummaryOutput,
  },
  {
    name: "get_cost_breakdown",
    annotations: { title: "Cost breakdown", ...READ_ONLY },
    description:
      "AI spend attribution for this organization, broken down by model and by product feature, over a window (default 30 days). Shows where the cost is actually going.",
    inputSchema: windowSchema,
    outputSchema: costBreakdownOutput,
  },
  {
    name: "get_runway_forecast",
    annotations: { title: "Runway forecast", ...READ_ONLY },
    description:
      "Capital runway and burn economics for this organization: projected monthly bill, current daily burn, capital reserves, budget runway (days), MRR, burn volatility, and systemic-risk probabilities. Fields may be null until enough economic inputs/history exist.",
    inputSchema: windowSchema,
    outputSchema: runwayForecastOutput,
  },
  {
    name: "get_guardrail_status",
    annotations: { title: "Guardrail status", ...READ_ONLY },
    description:
      "Current safety-guardrail state for this organization: whether guardrails are enabled, the mode, the authoritative enforcement status (ACTIVE / THROTTLED / SUSPENDED), configured daily/hourly budgets, and the most recent breach events.",
    inputSchema: noArgsSchema,
    outputSchema: guardrailStatusOutput,
  },
  {
    name: "get_runtime_signals",
    annotations: { title: "Runtime signals", ...READ_ONLY },
    description:
      "Behavioral runtime signals for this organization over a window (default 30 days): request rate, retry rate, loop probability, context-expansion rate, token volume, and model mix. Use this to tell whether anything looks like a runaway/looping agent.",
    inputSchema: windowSchema,
    outputSchema: runtimeSignalsOutput,
  },
];

export const TOOLS_BY_NAME: Record<string, McpTool> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t])
);
