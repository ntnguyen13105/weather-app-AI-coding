import { act, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { AppProvider } from './AppProvider.jsx';
import { useApp } from './context.js';
import { api } from '../lib/api.js';
vi.mock('../lib/api.js', () => ({
  api: { request: vi.fn(), onExpired: vi.fn(() => () => {}) },
}));
let context;
function Probe() {
  const value = useApp();
  useEffect(() => {
    context = value;
  }, [value]);
  return <p>{value.user?.displayName ?? value.status}</p>;
}
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
