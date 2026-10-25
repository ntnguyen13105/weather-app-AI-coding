import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './api.js';
const response = (data, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers(),
  json: async () => data,
});
describe('API session handling', () => {
  it('coalesces refresh and replays each guarded read once', async () => {
    let refreshed = false;
    const transport = vi.fn(async (url) => {
      if (url.endsWith('/auth/csrf'))
        return response({ data: { csrfToken: 'test-csrf' } });
      if (url.endsWith('/auth/refresh')) {
        refreshed = true;
        return response({ data: { user: { id: 'user' } } });
      }
      return refreshed
        ? response({ data: [] })
        : response({ error: { code: 'ACCESS_EXPIRED' } }, 401);
    });
    const client = createApiClient(transport);
    await Promise.all([
      client.request('/favorites', { private: true }),
      client.request('/search-history', { private: true }),
    ]);
    expect(
      transport.mock.calls.filter(([url]) => url.endsWith('/auth/refresh')),
    ).toHaveLength(1);
    expect(
      transport.mock.calls.filter(([url]) => url.endsWith('/favorites')),
    ).toHaveLength(2);
  });
  it('does not retry a mutation after a network failure', async () => {
    const transport = vi.fn(async (url) => {
      if (url.endsWith('/auth/csrf'))
        return response({ data: { csrfToken: 'test' } });
      throw new Error('offline');
    });
    const client = createApiClient(transport);
    await expect(
      client.request('/favorites', {
        method: 'POST',
        private: true,
        body: { name: 'test' },
      }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(
      transport.mock.calls.filter(([url]) => url.endsWith('/favorites')),
    ).toHaveLength(1);
  });
  it('keeps the session when the server is unavailable and clears it for revoked sessions', async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(
        response({ error: { code: 'DATABASE_UNAVAILABLE' } }, 503),
      )
      .mockResolvedValueOnce(
        response({ error: { code: 'SESSION_INVALID' } }, 401),
      );
    const client = createApiClient(transport),
      expired = vi.fn();
    client.onExpired(expired);
    await expect(
      client.request('/auth/me', { private: true }),
    ).rejects.toMatchObject({ status: 503 });
    expect(expired).not.toHaveBeenCalled();
    await expect(
      client.request('/auth/me', { private: true }),
    ).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
  });
});
