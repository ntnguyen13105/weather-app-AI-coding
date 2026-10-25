import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../app/context.js';
import { api } from '../lib/api.js';
import { Field } from '../components/Field.jsx';
import { validateFields } from '../lib/form.js';
import { Icon, WeatherIcon } from '../components/Icon.jsx';
import { Feedback, Loading } from '../components/Feedback.jsx';
export function AuthPage({ register = false }) {
  const { user, status, authenticated } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [errors, setErrors] = useState({}),
    [error, setError] = useState(null);
  if (status === 'loading')
    return (
      <main id="main-content" className="auth-page">
        <Loading label="Đang kiểm tra phiên đăng nhập…" />
      </main>
    );
  if (user) return <Navigate to={busy ? '/' : '/tai-khoan'} replace />;
  async function submit(event) {
    event.preventDefault();
    const values = validateFields(
      event.currentTarget,
      {
        email: (value) =>
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
            ? 'Nhập email hợp lệ.'
            : '',
        password: (value) =>
          value.length < (register ? 12 : 1)
            ? register
              ? 'Mật khẩu cần ít nhất 12 ký tự.'
              : 'Nhập mật khẩu của bạn.'
            : '',
        ...(register
          ? {
              displayName: (value) =>
                !value.trim() ? 'Nhập tên hiển thị của bạn.' : '',
              confirmPassword: (value, all) =>
                value !== all.password ? 'Mật khẩu xác nhận chưa khớp.' : '',
            }
          : {}),
      },
      setErrors,
    );
    if (!values) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.request(
        `/auth/${register ? 'register' : 'login'}`,
        {
          method: 'POST',
          body: {
            email: values.email,
            password: values.password,
            ...(register ? { displayName: values.displayName } : {}),
          },
        },
      );
      authenticated(data.user);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-intro">
        <WeatherIcon kind="PARTLY_CLOUDY_DAY" size={130} />
        <h1>
          {register
            ? 'Một nơi cho những thành phố thân quen.'
            : 'Chào mừng bạn trở lại.'}
        </h1>
        <p>
          {register
            ? 'Lưu địa điểm yêu thích, tìm lại những nơi đã xem và theo dõi thời tiết theo cách của bạn.'
            : 'Bầu trời có thể đổi thay. Những nơi bạn quan tâm vẫn luôn ở đây.'}
        </p>
        <Link className="quiet-link" to="/">
          Tiếp tục xem thời tiết <Icon name="arrow" size={16} />
        </Link>
      </div>
      <section className="auth-card glass">
        <h2>{register ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>
        <p className="muted">
          {register
            ? 'Bắt đầu với vài thông tin cơ bản.'
            : 'Truy cập các địa điểm đã lưu của bạn.'}
        </p>
        <form noValidate onSubmit={submit}>
          {register && (
            <Field
              label="Tên hiển thị"
              name="displayName"
              autoComplete="nickname"
              maxLength={80}
              error={errors.displayName}
              required
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            error={errors.email}
            required
          />
          <Field
            label="Mật khẩu"
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            minLength={register ? 12 : 1}
            maxLength={128}
            error={errors.password}
            required
          />
          {register && (
            <>
              <p className="field-hint">
                Ít nhất 12 ký tự. Bạn có thể dùng một cụm từ dễ nhớ.
              </p>
              <Field
                label="Xác nhận mật khẩu"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                error={errors.confirmPassword}
                required
              />
            </>
          )}
          {error && <Feedback error={error} />}
          <button className="button primary full-width" disabled={busy}>
            {busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
            <Icon name="arrow" size={18} />
          </button>
        </form>
        <p className="auth-alternative">
          {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <Link to={register ? '/dang-nhap' : '/dang-ky'}>
            {register ? 'Đăng nhập' : 'Đăng ký ngay'}
          </Link>
        </p>
      </section>
    </main>
  );
}
