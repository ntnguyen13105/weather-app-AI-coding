import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AppContext } from '../app/context.js';
import { UnitSwitch } from './UnitSwitch.jsx';
it('keeps the server unit and reports failure when saving fails', async () => {
  const changeUnit = vi.fn().mockRejectedValue(new Error('Chưa lưu được'));
  render(
    <AppContext.Provider value={{ unit: 'C', changeUnit }}>
      <UnitSwitch />
    </AppContext.Provider>,
  );
  fireEvent.click(screen.getByRole('button', { name: '°F' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('Chưa lưu được'),
  );
  expect(
    screen.getByRole('button', { name: '°C' }).getAttribute('aria-pressed'),
  ).toBe('true');
});
