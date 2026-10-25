import { lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout.jsx';
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage.jsx').then((module) => ({
    default: module.DashboardPage,
  })),
);
const AuthPage = lazy(() =>
  import('../pages/AuthPage.jsx').then((module) => ({
    default: module.AuthPage,
  })),
);
const AccountPage = lazy(() =>
  import('../pages/AccountPage.jsx').then((module) => ({
    default: module.AccountPage,
  })),
);
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dang-nhap" element={<AuthPage key="login" />} />
        <Route path="/dang-ky" element={<AuthPage key="register" register />} />
        <Route path="/tai-khoan" element={<AccountPage />} />
        <Route
          path="*"
          element={
            <main id="main-content" className="account-page">
              <h1>Không tìm thấy trang</h1>
              <Link to="/">Về Weather App</Link>
            </main>
          }
        />
      </Route>
    </Routes>
  );
}
