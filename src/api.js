const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  }
  return data;
}
