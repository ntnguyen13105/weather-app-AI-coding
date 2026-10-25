import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { AppProvider } from './AppProvider.jsx';
import { useApp } from './context.js';
import { api } from '../lib/api.js';
vi.mock('../lib/api.js', () => ({
  api: { request: vi.fn(), onExpired: vi.fn(() => () => {}) },
}));
let context;
afterEach(() => vi.unstubAllGlobals());
function Probe() {
  const value = useApp();
  useEffect(() => {
    context = value;
  }, [value]);
  return <p>{value.user?.displayName ?? value.status}</p>;
}
it('clears private state when another tab logs out and broadcasts no user data', async () => {
  let channel;
  class Channel {
    constructor() {
      channel = this;
    }
    postMessage = vi.fn();
    close = vi.fn();
  }
  vi.stubGlobal('BroadcastChannel', Channel);
  api.request.mockResolvedValueOnce({
    data: { id: 'user', displayName: 'Người dùng' },
  });
  const view = render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  await waitFor(() => expect(context.status).toBe('authenticated'));
  act(() => context.endSession());
  expect(channel.postMessage).toHaveBeenCalledWith('logout');
  act(() => context.authenticated({ id: 'other', displayName: 'Khác' }));
  expect(channel.postMessage).toHaveBeenLastCalledWith('changed');
  act(() => channel.onmessage({ data: 'logout' }));
  expect(context.user).toBeNull();
  expect(context.status).toBe('guest');
  view.unmount();
  expect(channel.close).toHaveBeenCalledOnce();
});
it('ignores an old session check that finishes after signing in', async () => {
  let finish;
  api.request.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  act(() =>
    context.authenticated({ id: 'new-user', displayName: 'Tài khoản mới' }),
  );
  await act(async () =>
    finish({ data: { id: 'old-user', displayName: 'Cũ' } }),
  );
  expect(screen.getByText('Tài khoản mới')).toBeTruthy();
});
it('does not restore a history error after signing out', async () => {
  api.request.mockResolvedValueOnce({
    data: { id: 'user', displayName: 'Người dùng' },
  });
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  await waitFor(() => expect(screen.getByText('Người dùng')).toBeTruthy());
  let reject;
  api.request.mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  let pending;
  act(() => {
    pending = context.recordHistory({
      name: 'Hà Nội',
      country: 'VN',
      latitude: 21,
      longitude: 105,
    });
  });
  act(() => context.endSession());
  await act(async () => {
    reject(new Error('Mất kết nối'));
    await pending;
  });
  expect(context.historyFailure).toBeNull();
  expect(context.status).toBe('guest');
});
