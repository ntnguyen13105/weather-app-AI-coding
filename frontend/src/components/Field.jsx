import { useId, useState } from 'react';
export function Field({ label, name, error, type = 'text', ...props }) {
  const id = useId(),
    [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={type === 'password' ? 'password-input' : ''}>
        <input
          id={id}
          name={name}
          type={type === 'password' && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {type === 'password' && (
          <button
            type="button"
            className="password-toggle"
            aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? 'Ẩn' : 'Hiện'}
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
