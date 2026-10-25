const messages = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu chưa đúng.',
  EMAIL_ALREADY_EXISTS:
    'Email này đã được đăng ký. Hãy đăng nhập bằng tài khoản của bạn.',
  CURRENT_PASSWORD_INVALID: 'Mật khẩu hiện tại chưa đúng.',
  PASSWORD_UNCHANGED: 'Mật khẩu mới cần khác mật khẩu hiện tại.',
  AUTH_REQUIRED: 'Hãy đăng nhập để tiếp tục.',
  ACCESS_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  SESSION_INVALID:
    'Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.',
  REFRESH_INVALID: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  CSRF_INVALID: 'Phiên thao tác đã thay đổi. Vui lòng thử lại.',
  ORIGIN_FORBIDDEN:
    'Không thể xác nhận nguồn yêu cầu. Hãy mở ứng dụng từ địa chỉ đã cấu hình.',
  DATABASE_UNAVAILABLE:
    'Dịch vụ tài khoản tạm gián đoạn. Vui lòng thử lại sau.',
  WEATHER_UNAVAILABLE:
    'Chưa kết nối được nguồn thời tiết. Vui lòng thử lại sau.',
  WEATHER_TIMEOUT: 'Nguồn thời tiết phản hồi quá chậm. Bạn có thể thử lại.',
  WEATHER_INVALID_RESPONSE:
    'Nguồn thời tiết trả dữ liệu chưa hợp lệ. Vui lòng thử lại sau.',
  WEATHER_UPSTREAM_ERROR:
    'Nguồn thời tiết đang gặp sự cố. Vui lòng thử lại sau.',
  WEATHER_QUOTA_EXCEEDED: 'Nguồn thời tiết đang giới hạn lượt truy cập.',
  RATE_LIMITED: 'Bạn thao tác hơi nhanh. Vui lòng chờ trước khi thử lại.',
  FAVORITE_EXISTS: 'Địa điểm này đã có trong danh sách yêu thích.',
  FAVORITE_LIMIT_REACHED:
    'Bạn đã lưu 50 địa điểm. Hãy xóa một địa điểm trước khi thêm.',
  NOT_FOUND: 'Mục này không còn tồn tại. Hãy tải lại danh sách.',
  VALIDATION_ERROR: 'Vui lòng kiểm tra lại thông tin đã nhập.',
};
export class ApiError extends Error {
  constructor(code, status = 0, retryAfter = 0) {
    super(
      (messages[code] ?? 'Chưa thể hoàn tất yêu cầu. Vui lòng thử lại.') +
        (retryAfter ? ` Thử lại sau ${retryAfter} giây.` : ''),
    );
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
export function createApiClient(fetcher = (...args) => fetch(...args)) {
  let refreshFlight,
    queue = Promise.resolve();
  const listeners = new Set();
  const expired = () => listeners.forEach((fn) => fn());
  async function raw(path, { method = 'GET', body, signal, csrf } = {}) {
    const timeout = AbortSignal.timeout(10000);
    let response;
    try {
      response = await fetcher(`/api/v1${path}`, {
        method,
        credentials: 'same-origin',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError('NETWORK_ERROR');
    }
    if (response.status === 204) return { data: null };
    let result;
    try {
      result = await response.json();
    } catch {
      throw new ApiError('INVALID_RESPONSE', response.status);
    }
    if (!response.ok)
      throw new ApiError(
        result.error?.code ?? 'UNKNOWN',
        response.status,
        Number(response.headers.get('Retry-After')) || 0,
      );
    return result;
  }
  // Serialize cookie-changing operations in this tab and across tabs. Never replay a network failure.
  function sessionLock(fn) {
    const run = () =>
      globalThis.navigator?.locks
        ? navigator.locks.request('weather-session', fn)
        : fn();
    const pending = queue.catch(() => {}).then(run);
    queue = pending;
    return pending;
  }
  async function csrf() {
    return (await raw('/auth/csrf')).data.csrfToken;
  }
  async function refreshUnlocked() {
    try {
      return await raw('/auth/me');
    } catch (error) {
      if (error.status !== 401) throw error;
    }
    const result = await raw('/auth/refresh', {
      method: 'POST',
      csrf: await csrf(),
    });
    return { data: result.data.user };
  }
  function refresh() {
    if (!refreshFlight)
      refreshFlight = sessionLock(refreshUnlocked).finally(() => {
        refreshFlight = null;
      });
    return refreshFlight;
  }
  async function request(path, options = {}) {
    const mutation = options.method && options.method !== 'GET';
    const excluded =
      /^\/auth\/(login|register|logout|refresh)$/.test(path) ||
      path === '/users/me/password';
    const run = async () => {
      try {
        return await raw(path, {
          ...options,
          ...(mutation ? { csrf: await csrf() } : {}),
        });
      } catch (error) {
        if (
          !excluded &&
          options.private &&
          ['AUTH_REQUIRED', 'ACCESS_EXPIRED'].includes(error.code)
        ) {
          try {
            await (mutation ? refreshUnlocked() : refresh());
            return await raw(path, {
              ...options,
              ...(mutation ? { csrf: await csrf() } : {}),
            });
          } catch (refreshError) {
            if ([401, 403].includes(refreshError.status)) expired();
            throw refreshError;
          }
        }
        if (options.private && error.status === 401) expired();
        throw error;
      }
    };
    return mutation ? sessionLock(run) : run();
  }
  return {
    request,
    onExpired: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
export const api = createApiClient();
