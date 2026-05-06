export class ServiceClientError extends Error {
  constructor(
    public readonly service: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(`[${service}] ${statusCode}: ${message}`);
    this.name = "ServiceClientError";
  }
}

export interface ServiceClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ServiceClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ServiceClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeout = config.timeout ?? 60_000;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.headers,
    };
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, headers);
  }

  async post<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("POST", path, body, headers);
  }

  async patch<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("PATCH", path, body, headers);
  }

  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("DELETE", path, undefined, headers);
  }

  async postForm<T>(
    path: string,
    formData: FormData,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { signal, clear } = this.createTimeout();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...headers },
        body: formData,
        signal,
      });
      return this.handleResponse<T>(res);
    } finally {
      clear();
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { signal, clear } = this.createTimeout();
    try {
      const res = await fetch(url, {
        method,
        headers: { ...this.defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
      return this.handleResponse<T>(res);
    } finally {
      clear();
    }
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new ServiceClientError("service", res.status, text);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  private createTimeout() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    return {
      signal: controller.signal,
      clear: () => clearTimeout(timer),
    };
  }
}
