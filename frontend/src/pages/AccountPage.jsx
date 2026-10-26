import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../app/context.js';
import { api } from '../lib/api.js';
import { Field } from '../components/Field.jsx';
import { validateFields } from '../lib/form.js';
import { Feedback, Loading } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
export function AccountPage() {
  const app = useApp();
  if (app.status === 'loading')
    return (
      <main id="main-content" className="account-page">
        <Loading />
      </main>
    );
  if (app.status === 'error')
    return (
      <main id="main-content" className="account-page">
        <Feedback error={app.error} onRetry={app.loadSession} />
      </main>
    );
  if (!app.user) return <Navigate to="/dang-nhap" replace />;
  return <AccountForms key={app.user.id} />;
}
function AccountForms() {
  const { user, updateProfile, logout, endSession } = useApp(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(null),
    [message, setMessage] = useState(''),
    [errors, setErrors] = useState({});
  async function profile(event) {
    event.preventDefault();
    const values = validateFields(
      event.currentTarget,
      {
        displayName: (value) =>
          !value.trim() ? 'Tên hiển thị không được để trống.' : '',
      },
      setErrors,
    );
    if (!values) return;
    setBusy('profile');
    setError(null);
    setMessage('');
    try {
      await updateProfile({
        displayName: values.displayName,
        preferredTemperatureUnit: values.preferredTemperatureUnit,
      });
      setMessage('Đã lưu thông tin của bạn.');
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }
  async function password(event) {
    event.preventDefault();
    const values = validateFields(
      event.currentTarget,
      {
        currentPassword: (value) => (!value ? 'Nhập mật khẩu hiện tại.' : ''),
        newPassword: (value) =>
          value.length < 12 ? 'Mật khẩu mới cần ít nhất 12 ký tự.' : '',
        confirmPassword: (value, all) =>
          value !== all.newPassword ? 'Mật khẩu xác nhận chưa khớp.' : '',
      },
      setErrors,
    );
    if (!values) return;
    setBusy('password');
    setError(null);
    setMessage('');
    try {
      await api.request('/users/me/password', {
        method: 'PATCH',
        private: true,
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      });
      endSession(
        'Đã đổi mật khẩu và đăng xuất mọi phiên. Hãy đăng nhập bằng mật khẩu mới.',
      );
      navigate('/dang-nhap', { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }
  async function leave() {
    setBusy('logout');
    setError(null);
    try {
      await logout();
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }
  return (
    <main id="main-content" className="account-page">
      <div className="page-heading">
        <div>
          <h1>Tài khoản của bạn</h1>
          <p className="muted">Thông tin cá nhân và lựa chọn hiển thị.</p>
        </div>
        <button
          className="button secondary"
          disabled={Boolean(busy)}
          onClick={leave}
        >
          {busy === 'logout' ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </button>
      </div>
      {message && (
        <p className="success-message" role="status">
          <Icon name="check" />
          {message}
        </p>
      )}
      {error && <Feedback error={error} />}
      <div className="account-grid">
        <section className="glass account-card">
          <h2>Thông tin cá nhân</h2>
          <form noValidate onSubmit={profile}>
            <Field
              label="Email"
              name="email"
              type="email"
              value={user.email}
              readOnly
              autoComplete="email"
            />
            <Field
              label="Tên hiển thị"
              name="displayName"
              defaultValue={user.displayName}
              maxLength={80}
              error={errors.displayName}
              autoComplete="nickname"
            />
            <div className="field">
              <label htmlFor="profile-unit">Đơn vị nhiệt độ</label>
              <select
                key={user.preferredTemperatureUnit}
                id="profile-unit"
                name="preferredTemperatureUnit"
                defaultValue={user.preferredTemperatureUnit}
              >
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
              </select>
            </div>
            <button className="button primary" disabled={Boolean(busy)}>
              {busy === 'profile' ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </form>
        </section>
        <section className="glass account-card">
          <h2>Đổi mật khẩu</h2>
          <p className="muted">
            Sau khi đổi mật khẩu, bạn sẽ đăng xuất trên tất cả thiết bị.
          </p>
          <form noValidate onSubmit={password}>
            <Field
              label="Mật khẩu hiện tại"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              error={errors.currentPassword}
            />
            <Field
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              error={errors.newPassword}
            />
            <Field
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              error={errors.confirmPassword}
            />
            <button className="button secondary" disabled={Boolean(busy)}>
              {busy === 'password' ? 'Đang đổi…' : 'Đổi mật khẩu'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
