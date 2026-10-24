import { useState } from 'react';

export function SetupPage() {
  const [state, setState] = useState({
    phase: 'idle',
    message: 'Chưa kiểm tra kết nối.',
  });

  async function checkConnection() {
    setState({ phase: 'loading', message: 'Đang kiểm tra kết nối…' });
    try {
      const response = await fetch('/api/v1/health/ready', {
        signal: AbortSignal.timeout(6000),
      });
      const result = await response.json();
      if (!response.ok || result.data?.status !== 'ready')
        throw new Error('unavailable');
      setState({
        phase: 'success',
        message: 'React đã kết nối NestJS. PostgreSQL đã sẵn sàng.',
      });
    } catch {
      setState({
        phase: 'error',
        message:
          'Chưa kết nối được hệ thống. Kiểm tra backend và PostgreSQL, rồi thử lại.',
      });
    }
  }

  return (
    <main>
      <p className="eyebrow">GIAI ĐOẠN 3 · KHỞI TẠO</p>
      <h1>Weather App</h1>
      <p>Nền tảng cho ứng dụng thời tiết tiếng Việt của bạn.</p>
      <section aria-labelledby="connection-heading">
        <h2 id="connection-heading">Kiểm tra môi trường phát triển</h2>
        <p>
          Trang này kiểm tra kết nối thực tế. Dự báo thời tiết và tài khoản sẽ
          được triển khai ở các giai đoạn tiếp theo.
        </p>
        <button
          type="button"
          onClick={checkConnection}
          disabled={state.phase === 'loading'}
        >
          {state.phase === 'loading' ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
        </button>
        <p role="status" aria-live="polite" className={`status ${state.phase}`}>
          {state.message}
        </p>
      </section>
      <footer>
        OpenWeather Free · Chưa gọi dịch vụ thời tiết trong giai đoạn này.
      </footer>
    </main>
  );
}
