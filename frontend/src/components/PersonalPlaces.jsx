import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../app/context.js';
import { useResource } from '../lib/use-resource.js';
import { api } from '../lib/api.js';
import { Icon } from './Icon.jsx';
import { Feedback, Loading } from './Feedback.jsx';
export function GuestPlaces() {
  return (
    <aside className="personal-sidebar">
      <section className="glass guest-card">
        <Icon name="star" size={28} />
        <h2>Những nơi bạn quan tâm</h2>
        <p>
          Lưu thành phố yêu thích và tìm lại các địa điểm gần đây, ở một nơi.
        </p>
        <Link className="button primary" to="/dang-nhap">
          Đăng nhập để lưu <Icon name="arrow" size={16} />
        </Link>
        <Link className="quiet-link" to="/dang-ky">
          Chưa có tài khoản? Đăng ký
        </Link>
      </section>
      <div className="sidebar-note">
        <Icon name="info" />
        <p>Bạn vẫn có thể tìm kiếm và xem thời tiết mà không cần đăng nhập.</p>
      </div>
    </aside>
  );
}
export function PersonalPlaces({ favorites }) {
  const { selectLocation, historyVersion, historyFailure, recordHistory } =
    useApp();
  return (
    <aside className="personal-sidebar">
      <PlaceList
        title="Địa điểm yêu thích"
        icon="star"
        resource={favorites}
        endpoint="/favorites"
        onSelect={selectLocation}
      />
      <HistoryList key={historyVersion} onSelect={selectLocation} />
      {historyFailure && (
        <Feedback
          error={
            new Error(`Chưa lưu được lịch sử. ${historyFailure.error.message}`)
          }
          onRetry={() => recordHistory(historyFailure.location)}
        />
      )}
    </aside>
  );
}
function HistoryList({ onSelect }) {
  const history = useResource('/search-history?pageSize=20', true);
  return (
    <PlaceList
      title="Tìm kiếm gần đây"
      icon="clock"
      resource={history}
      endpoint="/search-history"
      onSelect={onSelect}
    />
  );
}
function PlaceList({ title, icon, resource, endpoint, onSelect }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [confirm, setConfirm] = useState(false);
  async function remove(id) {
    setBusy(true);
    setError(null);
    try {
      await api.request(`${endpoint}${id ? `/${id}` : ''}`, {
        method: 'DELETE',
        private: true,
      });
      resource.reload();
      setConfirm(false);
    } catch (e) {
      setError(e);
      if (e.status === 404) resource.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="places glass">
      <div className="section-heading">
        <h2>
          <Icon name={icon} />
          {title}
        </h2>
        {resource.data?.length > 0 && (
          <span className="count">{resource.data.length}</span>
        )}
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <Feedback error={resource.error} onRetry={resource.reload} />
      ) : resource.data?.length ? (
        <ul className="place-list">
          {resource.data.map((item) => (
            <li key={item.id}>
              <button
                className="place-select"
                onClick={() => onSelect(item.location)}
              >
                <span>
                  <strong>{item.location.name}</strong>
                  <small>
                    {[item.location.state, item.location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </small>
                </span>
                <Icon name="arrow" size={15} />
              </button>
              <button
                className="icon-button remove-place"
                aria-label={`Xóa ${item.location.name} khỏi ${title.toLowerCase()}`}
                disabled={busy}
                onClick={() => remove(item.id)}
              >
                <Icon name="close" size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">
          {endpoint === '/favorites'
            ? 'Nhấn ngôi sao ở địa điểm đang xem để lưu tại đây.'
            : 'Các địa điểm bạn chọn sẽ xuất hiện tại đây.'}
        </p>
      )}
      {endpoint === '/search-history' &&
        resource.data?.length > 0 &&
        (confirm ? (
          <div className="confirm-inline">
            <p>Xóa toàn bộ lịch sử tìm kiếm?</p>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => remove()}
            >
              Xóa lịch sử
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Giữ lại
            </button>
          </div>
        ) : (
          <button className="text-button" onClick={() => setConfirm(true)}>
            Xóa toàn bộ lịch sử
          </button>
        ))}
      {error && <Feedback error={error} />}
    </section>
  );
}
