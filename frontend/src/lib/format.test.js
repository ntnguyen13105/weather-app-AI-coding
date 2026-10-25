import { expect, it } from 'vitest';
import { temperature, localTime, direction, utcLabel } from './format.js';
it('converts original Celsius without losing zero or missing values', () => {
  expect(temperature(0, 'F')).toBe('32°');
  expect(temperature(-40, 'F')).toBe('-40°');
  expect(temperature(null, 'C')).toBe('—');
  expect(temperature(25, 'C')).toBe('25°');
});
it('formats location time rather than browser timezone', () => {
  expect(localTime('2026-10-24T00:00:00Z', 25200)).toBe('07:00');
  expect(utcLabel(19800)).toBe('UTC+5:30');
  expect(direction(360)).toBe('Bắc');
});
