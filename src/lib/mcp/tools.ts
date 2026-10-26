/**
 * AtlasBurn MCP — tool definitions (public contract).
 *
 * All tools are org-scoped (orgId comes from the verified OAuth token, never from
 * arguments) and content-blind. The five data tools are read-only. The two
 * integration tools (request_integration_key / get_setup_code) can only START a key
 * request: nothing is created until the user approves it in the browser with a fresh
 * sign-in, and the key itself is delivered only to the AtlasBurn CLI, never to the
 * assistant or the chat.
 *
 * This module is exactly what `tools/list` advertises (name, description,
 * inputSchema, outputSchema, annotations). It is generated from the hosted server's
 * tool file with the data handlers removed; those run inside the hosted AtlasBurn
 * service and are not part of this repository.
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /**
   * JSON Schema for the tool's result (MCP `outputSchema`, spec 2025-06-18). Lets a
   * client/model understand the SHAPE of what comes back, not just what to send. When
   * present, the server also returns the result as `structuredContent`.
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

/** The data tools: read-only, non-destructive, idempotent, caller's own data only. */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/** Integration tools write a pending request / one-time code, nothing destructive. */
const KEY_FLOW = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
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

// Every data tool may also return `setup` when the account has never received any
// usage data: a short, user-facing note on how to start sending it.
const setupSchema = {
  type: "object",
  description: "Present only when this account has never received usage data: how to start sending it.",
  properties: {
    status: { type: "string", enum: ["no_telemetry"] },
    message: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    docsUrl: { type: "string" },
  },
  required: ["status", "message", "steps", "docsUrl"],
  additionalProperties: false,
};

// --- Output schemas (MCP `outputSchema`) -------------------------------------
// Each mirrors the exact object its handler returns, so a client/model knows the
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
    setup: setupSchema,
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
    setup: setupSchema,
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
    setup: setupSchema,
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
    pausedFeatures: {
      type: "array",
      description: "Features paused on their own after a runaway loop in that feature. Everything else keeps running.",
      items: {
        type: "object",
        properties: {
          featureId: { type: "string" },
          status: { type: "string", description: "THROTTLED | SUSPENDED" },
          triggerType: { type: "string" },
          enforcedUntil: { type: "string", description: "ISO time the feature auto-resumes." },
        },
      },
    },
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
          featureId: { type: "string", description: "Set when only this feature was cut." },
          timestamp: { type: "string" },
        },
      },
    },
    setup: setupSchema,
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
    setup: setupSchema,
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
      "Current safety-guardrail state for this organization: whether guardrails are enabled, the mode, the authoritative enforcement status (ACTIVE / THROTTLED / SUSPENDED), any individual features paused after a runaway loop, configured daily/hourly budgets, and the most recent breach events.",
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
  {
    name: "request_integration_key",
    annotations: { title: "Request an integration key", ...KEY_FLOW },
    description:
      "Start connecting the user's project to AtlasBurn. Creates a one-time request for a NEW ingest key and returns an approval link. Nothing is created until the user opens the link, signs in again and approves; existing keys are never revoked. Give the user the approvalUrl, wait until they say they've approved, then call get_setup_code with the requestId. method: \"sdk\" for Node.js/TypeScript apps (the CLI installs and wires the SDK) or \"proxy\" for any language (AI calls are routed through proxy.atlasburn.com).",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["sdk", "proxy"], description: "\"sdk\" (Node.js/TypeScript) or \"proxy\" (any language)." },
      },
      required: ["method"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        approvalUrl: { type: "string" },
        expiresAt: { type: "string" },
        nextStep: { type: "string" },
      },
      required: ["requestId", "approvalUrl", "expiresAt", "nextStep"],
      additionalProperties: false,
    },
  },
  {
    name: "get_setup_code",
    annotations: { title: "Get setup code", ...KEY_FLOW },
    description:
      "After the user has approved an integration request, returns a one-time setup code (single use, valid 10 minutes) plus the exact commands to run in the root of the user's project. The CLI exchanges the code for the ingest key and writes it to the project's env file itself; the key never appears here. Use the code only in those commands; don't repeat it to the user or save it anywhere else. status \"pending\" means the user hasn't approved yet. For method \"proxy\", after the command runs, update the app's AI client to use the printed proxy base URL and send the AtlasBurn-API-Key header from process.env.ATLASBURN_KEY (or the language's equivalent).",
    inputSchema: {
      type: "object",
      properties: {
        requestId: { type: "string", description: "The requestId returned by request_integration_key." },
      },
      required: ["requestId"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "issued"] },
        method: { type: "string", enum: ["sdk", "proxy"] },
        setupCode: { type: "string" },
        commands: { type: "array", items: { type: "string" } },
        expiresAt: { type: "string" },
        nextStep: { type: "string" },
      },
      required: ["status", "expiresAt", "nextStep"],
      additionalProperties: false,
    },
  },
];

export const TOOLS_BY_NAME: Record<string, McpTool> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t])
);
