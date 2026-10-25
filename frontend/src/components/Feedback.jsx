export function Feedback({ error, onRetry }) {
  return (
    <div className="feedback" role="alert">
      <p>{error.message}</p>
      {onRetry && (
        <button className="button secondary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function Loading({ label = 'Đang tải dữ liệu…' }) {
  return (
    <div className="loading" role="status">
      <span className="loading-dot" />
      {label}
    </div>
  );
}
