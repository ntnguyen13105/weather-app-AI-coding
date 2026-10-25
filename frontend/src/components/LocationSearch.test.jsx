import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../lib/api.js';
import { LocationSearch } from './LocationSearch.jsx';
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it('debounces, avoids short queries and supports keyboard selection', async () => {
  vi.useFakeTimers();
  const location = { locationKey: 'hanoi', name: 'Hà Nội', country: 'VN' };
  const request = vi
    .spyOn(api, 'request')
    .mockResolvedValue({ data: [location] });
  const choose = vi.fn();
  render(<LocationSearch onSelect={choose} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'H' } });
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'Ha' } });
  fireEvent.change(input, { target: { value: 'Hanoi' } });
  await act(() => vi.advanceTimersByTimeAsync(399));
  expect(request).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(choose).toHaveBeenCalledWith(location);
  expect(input.getAttribute('aria-expanded')).toBe('false');
});
it('ignores stale results after the query changes', async () => {
  vi.useFakeTimers();
  let oldResolve;
  vi.spyOn(api, 'request')
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          oldResolve = resolve;
        }),
    )
    .mockResolvedValue({
      data: [{ locationKey: 'b', name: 'Berlin', country: 'DE' }],
    });
  render(<LocationSearch onSelect={() => {}} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Hanoi' } });
  await act(() => vi.advanceTimersByTimeAsync(400));
  fireEvent.change(input, { target: { value: 'Berlin' } });
  await act(() => vi.advanceTimersByTimeAsync(400));
  await act(async () =>
    oldResolve({ data: [{ locationKey: 'a', name: 'Hanoi', country: 'VN' }] }),
  );
  expect(screen.getByRole('option').textContent).toContain('Berlin');
  expect(screen.queryByText('Hanoi')).toBeNull();
});
it('shows empty and failed searches without inventing results', async () => {
  vi.useFakeTimers();
  vi.spyOn(api, 'request')
    .mockResolvedValueOnce({ data: [] })
    .mockRejectedValueOnce(new Error('Tạm gián đoạn'));
  render(<LocationSearch onSelect={() => {}} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Unknown' } });
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(screen.getByRole('status').textContent).toContain('Không tìm thấy');
  fireEvent.change(input, { target: { value: 'Other' } });
  await act(() => vi.advanceTimersByTimeAsync(400));
  expect(screen.getByRole('status').textContent).toContain('Tạm gián đoạn');
});
