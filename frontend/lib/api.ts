const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const BACKEND_UNAVAILABLE_ERROR =
  `Failed to reach API at ${API_BASE}. Make sure backend is running and NEXT_PUBLIC_API_BASE_URL is correct.`;

export async function api<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      },
      cache: 'no-store'
    });
  } catch {
    throw new Error(BACKEND_UNAVAILABLE_ERROR);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
