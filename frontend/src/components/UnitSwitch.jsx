import { useState } from 'react';
import { useApp } from '../app/context.js';
export function UnitSwitch() {
  const { unit, changeUnit } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function select(value) {
    if (value === unit) return;
    setBusy(true);
    setError(null);
    try {
      await changeUnit(value);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="unit-control">
      <div className="unit-switch" role="group" aria-label="Đơn vị nhiệt độ">
        {['C', 'F'].map((value) => (
          <button
            key={value}
            aria-pressed={unit === value}
            disabled={busy}
            onClick={() => select(value)}
          >
            °{value}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="unit-error">
          {error.message}
        </p>
      )}
    </div>
  );
}
