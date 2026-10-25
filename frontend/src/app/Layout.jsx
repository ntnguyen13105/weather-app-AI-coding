import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import { Loading } from '../components/Feedback.jsx';
import { useApp } from './context.js';
import { Icon } from '../components/Icon.jsx';
import { LocationSearch } from '../components/LocationSearch.jsx';
import { UnitSwitch } from '../components/UnitSwitch.jsx';
export function Layout() {
  const {
    user,
    status,
    selectLocation,
    notice,
    setNotice,
    error,
    loadSession,
  } = useApp();
  const navigate = useNavigate();
  function choose(location) {
    selectLocation(location);
    navigate('/');
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Weather App · Trang chủ">
          <span className="brand-mark">
            <Icon name="sun" size={26} />
          </span>
          <span>
            Weather<span className="brand-light"> App</span>
          </span>
        </Link>
        <LocationSearch onSelect={choose} />
        <div className="header-actions">
          <UnitSwitch />
          {status === 'loading' ? (
            <span className="muted">Đang tải…</span>
          ) : (
            <Link
              className="account-link"
              aria-label={user ? 'Tài khoản' : 'Đăng nhập'}
              to={user ? '/tai-khoan' : '/dang-nhap'}
            >
              <Icon name="user" />
              <span>{user ? 'Tài khoản' : 'Đăng nhập'}</span>
            </Link>
          )}
        </div>
      </header>
      {(notice || error) && (
        <div className="app-notice" role="status">
          <span>{notice || error.message}</span>
          {error ? (
            <button className="text-button" onClick={loadSession}>
              Kiểm tra lại
            </button>
          ) : (
            <button
              className="icon-button"
              aria-label="Đóng thông báo"
              onClick={() => setNotice('')}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      )}
      <Suspense
        fallback={
          <main id="main-content">
            <Loading label="Đang mở trang…" />
          </main>
        }
      >
        <Outlet />
      </Suspense>
      <footer className="site-footer">
        <span>
          Weather App <span className="footer-dot">·</span> Một góc nhìn về bầu
          trời.
        </span>
        <a href="https://openweathermap.org/" target="_blank" rel="noreferrer">
          Dữ liệu từ OpenWeather <Icon name="arrow" size={14} />
        </a>
      </footer>
    </div>
  );
}
