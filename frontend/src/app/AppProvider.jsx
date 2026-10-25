import { useCallback, useEffect, useRef, useState } from 'react';
import { AppContext } from './context.js';
import { api } from '../lib/api.js';
import { readUnit, saveUnit, locationInput } from '../lib/format.js';

export function AppProvider({ children }) {
  const sessionRevision = useRef(0);
  const [session, setSession] = useState({
    status: 'loading',
    user: null,
    error: null,
  });
  const [guestUnit, setGuestUnit] = useState(readUnit);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);
  const [historyFailure, setHistoryFailure] = useState(null);
  const unit = session.user?.preferredTemperatureUnit ?? guestUnit;
  const loadSession = useCallback(async () => {
    const revision = ++sessionRevision.current;
    try {
      const result = await api.request('/auth/me', { private: true });
      if (revision !== sessionRevision.current) return;
      setSession({ status: 'authenticated', user: result.data, error: null });
    } catch (error) {
      if (revision !== sessionRevision.current) return;
      if ([401, 403].includes(error.status))
        setSession({ status: 'guest', user: null, error: null });
      else
        setSession((previous) => ({
          ...previous,
          status: previous.user ? 'authenticated' : 'error',
          error,
        }));
    }
  }, []);
  useEffect(() => {
    void loadSession();
    window.addEventListener('focus', loadSession);
    return () => window.removeEventListener('focus', loadSession);
  }, [loadSession]);
  useEffect(
    () =>
      api.onExpired(() => {
        sessionRevision.current++;
        setHistoryFailure(null);
        setSession((previous) => ({
          status: 'guest',
          user: null,
          error: previous.user
            ? new Error(
                'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để lưu địa điểm.',
              )
            : null,
        }));
      }),
    [],
  );
  function authenticated(user) {
    sessionRevision.current++;
    setHistoryFailure(null);
    setSession({ status: 'authenticated', user, error: null });
    setNotice('');
  }
  async function updateProfile(body) {
    const result = await api.request('/users/me', {
      method: 'PATCH',
      body,
      private: true,
    });
    authenticated(result.data);
    return result.data;
  }
  async function changeUnit(next) {
    if (session.user) await updateProfile({ preferredTemperatureUnit: next });
    else {
      saveUnit(next);
      setGuestUnit(next);
    }
  }
  function endSession(message = '') {
    sessionRevision.current++;
    setHistoryFailure(null);
    saveUnit(unit);
    setGuestUnit(unit);
    setSession({ status: 'guest', user: null, error: null });
    setNotice(message);
  }
  async function logout() {
    await api.request('/auth/logout', { method: 'POST' });
    endSession('Bạn đã đăng xuất.');
  }
  async function recordHistory(location) {
    const revision = sessionRevision.current;
    try {
      await api.request('/search-history', {
        method: 'POST',
        private: true,
        body: locationInput(location),
      });
      if (revision !== sessionRevision.current) return;
      setHistoryVersion((v) => v + 1);
      setHistoryFailure(null);
    } catch (error) {
      if (revision !== sessionRevision.current) return;
      setHistoryFailure({ location, error });
    }
  }
  function selectLocation(location) {
    setSelected(location);
    if (session.user) void recordHistory(location);
  }
  return (
    <AppContext.Provider
      value={{
        ...session,
        unit,
        selected,
        selectLocation,
        notice,
        setNotice,
        authenticated,
        updateProfile,
        changeUnit,
        logout,
        endSession,
        loadSession,
        historyVersion,
        historyFailure,
        recordHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
