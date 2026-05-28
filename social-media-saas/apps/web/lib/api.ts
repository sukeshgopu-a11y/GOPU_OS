const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type LoginResult = {
  accessToken: string;
  user: { id: string; email: string; role: string };
};

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error('Login failed');
  return response.json();
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export async function apiPut<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || `Request failed: ${response.status}`);
  }
  return response.json();
}
