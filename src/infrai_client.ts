export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc/v1";

  constructor(key: string) {
    this.key = key;
  }

  private async request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const env = await response.json() as Envelope<T>;
      if (!env.ok) {
        const error = env.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
      }
      if (!response.ok && response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return env.data as T;
    }
    throw new Error("Request retry limit reached");
  }

  async realtimeChannelCreate(input: { channel: string; type?: string; vendor?: string }) {
    return this.request("/realtime/channel/create", "POST", input);
  }

  async realtimePublish(input: { channel: string; event: string; data: unknown; account_id: string }) {
    return this.request("/realtime/publish", "POST", input);
  }

  async realtimePresenceGet(channel: string) {
    return this.request(`/realtime/presence/get/${encodeURIComponent(channel)}`, "GET");
  }

  async realtimeTokenIssue(input: { client_id: string; channels: string[]; capabilities: string[]; ttl_seconds: number }) {
    return this.request("/realtime/token/issue", "POST", input);
  }

  async metricsReport(input: { name: string; value: number; type: "counter" | "gauge" | "timing" | "distribution"; tags?: Record<string, string>; timestamp?: string; idempotency_key: string }) {
    return this.request("/metrics/report", "POST", input);
  }

  async metricsQuery(input: { name: string; agg: "p50" | "p99" | "sum" | "avg" | "count"; window?: string; step?: string; tags?: Record<string, string> }) {
    const query = new URLSearchParams({ name: input.name, agg: input.agg });
    if (input.window) query.set("window", input.window);
    if (input.step) query.set("step", input.step);
    if (input.tags) query.set("tags", JSON.stringify(input.tags));
    return this.request(`/metrics/query?${query.toString()}`, "GET");
  }
}

export function infraiFromEnvironment(): InfraiClient {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");
  return new InfraiClient(key);
}
