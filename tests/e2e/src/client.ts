/** Thin fetch wrapper against the deployed `/v1` HTTP API, matching docs/API.md. */
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly idToken: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.idToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const parsed = text.length > 0 ? JSON.parse(text) : undefined;
    return { status: res.status, body: parsed as T };
  }

  checks<T>(body: unknown): Promise<{ status: number; body: T }> {
    return this.request('POST', '/v1/checks', body);
  }

  createCabinet<T>(name: string): Promise<{ status: number; body: T }> {
    return this.request('POST', '/v1/cabinets', { name });
  }

  addMedicine<T>(cabinetId: string, body: unknown): Promise<{ status: number; body: T }> {
    return this.request('POST', `/v1/cabinets/${cabinetId}/medicines`, body);
  }

  getCabinet<T>(cabinetId: string): Promise<{ status: number; body: T }> {
    return this.request('GET', `/v1/cabinets/${cabinetId}`);
  }

  deleteMedicine(cabinetId: string, medId: string): Promise<{ status: number; body: undefined }> {
    return this.request('DELETE', `/v1/cabinets/${cabinetId}/medicines/${medId}`);
  }
}
