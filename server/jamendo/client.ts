interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class JamendoApiError extends Error {
  statusCode: number;
  endpoint: string;

  constructor(message: string, statusCode = 502, endpoint = '') {
    super(message);
    this.name = 'JamendoApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

export class JamendoClient {
  private cache = new Map<string, CacheEntry<unknown>>();
  private rateWindow = new Map<string, number[]>();
  private authFailureUntil = 0;

  get clientId(): string {
    return (process.env.JAMENDO_CLIENT_ID ?? '').trim();
  }

  get baseUrl(): string {
    return (
      process.env.JAMENDO_API_BASE_URL ?? 'https://api.jamendo.com/v3.0'
    ).replace(/\/$/, '');
  }

  get isLiveConfigured(): boolean {
    return this.clientId.length > 0 && Date.now() > this.authFailureUntil;
  }

  checkRateLimit(key: string, maxRequests = 45, windowMs = 60_000): boolean {
    const now = Date.now();
    const recent = (this.rateWindow.get(key) ?? []).filter(
      (ts) => now - ts < windowMs
    );
    if (recent.length >= maxRequests) {
      this.rateWindow.set(key, recent);
      return false;
    }
    recent.push(now);
    this.rateWindow.set(key, recent);
    return true;
  }

  getCached<T>(cacheKey: string): T | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    return entry.value as T;
  }

  setCached<T>(cacheKey: string, value: T, ttlSeconds: number): void {
    const safeTtl = Math.max(15, ttlSeconds);
    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + safeTtl * 1000,
    });
  }

  clearCache(): void {
    this.cache.clear();
    this.authFailureUntil = 0;
  }

  getCacheStats() {
    let valid = 0;
    const now = Date.now();
    for (const entry of this.cache.values()) {
      if (entry.expiresAt > now) valid++;
    }
    return {
      entries: valid,
      liveConfigured: this.isLiveConfigured,
      baseUrl: this.baseUrl,
    };
  }

  async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined>,
    ttlSeconds = 300
  ): Promise<{ data: T; cached: boolean }> {
    if (!this.isLiveConfigured) {
      throw new JamendoApiError(
        'JAMENDO_CLIENT_ID is not configured on the server.',
        503,
        endpoint
      );
    }

    const searchParams = new URLSearchParams({
      client_id: this.clientId,
      format: 'json',
    });

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') {
        searchParams.set(k, String(v));
      }
    }

    const cacheKey = `${endpoint}?${searchParams.toString()}`;
    const cached = this.getCached<T>(cacheKey);
    if (cached) {
      return { data: cached, cached: true };
    }

    const url = `${this.baseUrl}${endpoint}?${searchParams.toString()}`;
    const maxAttempts = 2;
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8500);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeout);

        if (res.status === 429 || res.status >= 500) {
          throw new JamendoApiError(
            `Jamendo API responded with HTTP ${res.status}`,
            res.status,
            endpoint
          );
        }

        if (!res.ok) {
          const nonRetryable = new JamendoApiError(
            `Jamendo API error HTTP ${res.status}`,
            res.status,
            endpoint
          );
          if (res.status === 401 || res.status === 403) {
            this.authFailureUntil = Date.now() + 60_000;
          }
          throw Object.assign(nonRetryable, { noRetry: true });
        }

        const json = (await res.json()) as {
          headers?: { status?: string; code?: number; error_message?: string };
        } & T;

        if (json.headers?.status === 'failed') {
          if (json.headers.code === 5) {
            this.authFailureUntil = Date.now() + 60_000;
          }
          const failedErr = new JamendoApiError(
            json.headers.error_message || 'Jamendo API returned failed status',
            502,
            endpoint
          );
          throw Object.assign(failedErr, { noRetry: true });
        }

        this.setCached(cacheKey, json as T, ttlSeconds);
        return { data: json as T, cached: false };
      } catch (err) {
        clearTimeout(timeout);
        lastErr = err instanceof Error ? err : new Error(String(err));
        if ((err as { noRetry?: boolean })?.noRetry) {
          break;
        }
        if (attempt < maxAttempts - 1) {
          const backoffMs = 200 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }

    throw lastErr instanceof JamendoApiError
      ? lastErr
      : new JamendoApiError(
          lastErr?.message || 'Failed to connect to Jamendo API',
          502,
          endpoint
        );
  }
}

export const jamendoClient = new JamendoClient();
