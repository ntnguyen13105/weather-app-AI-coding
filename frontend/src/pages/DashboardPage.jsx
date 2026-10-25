import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../app/context.js';
import { api } from '../lib/api.js';
import { useResource } from '../lib/use-resource.js';
import { locationInput } from '../lib/format.js';
import { Icon, WeatherIcon } from '../components/Icon.jsx';
import { LocationSearch } from '../components/LocationSearch.jsx';
import { CurrentWeather } from '../components/CurrentWeather.jsx';
import { Forecast } from '../components/Forecast.jsx';
import { GuestPlaces, PersonalPlaces } from '../components/PersonalPlaces.jsx';
import { Feedback, Loading } from '../components/Feedback.jsx';
export function DashboardPage() {
  const { user } = useApp();
  return <Dashboard key={user?.id ?? 'guest'} />;
}
function Dashboard() {
  const { selected, selectLocation, user, unit } = useApp();
  const [quick, setQuick] = useState(''),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState(null);
  const query = selected
    ? `lat=${selected.latitude}&lon=${selected.longitude}`
    : null;
  const current = useResource(query ? `/weather/current?${query}` : null),
    forecast = useResource(query ? `/weather/forecast?${query}` : null);
  const alerts = useResource('/weather/alerts');
  const favorites = useResource(user ? '/favorites?pageSize=50' : null, true);
  const favorite = favorites.data?.find(
    (item) => item.location.locationKey === selected?.locationKey,
  );
  const theme = current.data?.condition.icon?.endsWith('NIGHT')
    ? 'night'
    : current.data?.condition.icon === 'CLEAR_DAY'
      ? 'clear'
      : current.data?.condition.icon === 'RAIN'
        ? 'rain'
        : 'neutral';
  async function toggleFavorite() {
    setBusy(true);
    setSaveError(null);
    try {
      await api.request(favorite ? `/favorites/${favorite.id}` : '/favorites', {
        method: favorite ? 'DELETE' : 'POST',
        ...(favorite ? {} : { body: locationInput(selected) }),
        private: true,
      });
      favorites.reload();
    } catch (error) {
      setSaveError(error);
      if (error.status === 409) favorites.reload();
    } finally {
      setBusy(false);
    }
  }
  const favoriteAction = user ? (
    <button
      className={`favorite-toggle ${favorite ? 'saved' : ''}`}
      disabled={busy || favorites.loading || Boolean(favorites.error)}
      onClick={toggleFavorite}
      aria-label={
        favorite ? 'Bỏ yêu thích địa điểm này' : 'Lưu địa điểm yêu thích'
      }
      aria-pressed={Boolean(favorite)}
    >
      <Icon name="star" />
      {busy ? 'Đang lưu…' : favorite ? 'Đã lưu' : 'Lưu địa điểm'}
    </button>
  ) : (
    <Link className="favorite-toggle" to="/dang-nhap">
      <Icon name="star" />
      Lưu địa điểm
    </Link>
  );
  return (
    <main id="main-content" className={`dashboard theme-${theme}`}>
      <div className="dashboard-title">
        <span>Thời tiết & những kế hoạch của bạn</span>
        <span className="muted">
          <Icon name="sun" size={16} />Ở đây, ở đó, khắp mọi nơi
        </span>
      </div>
      <div className="dashboard-grid">
        <div className="weather-main">
          {!selected ? (
            <section className="welcome glass">
              <WeatherIcon kind="PARTLY_CLOUDY_DAY" size={160} />
              <h1>
                Hôm nay,
                <br />
                bầu trời thế nào?
              </h1>
              <p>
                Tìm một thành phố để xem thời tiết hiện tại
                <br className="desktop-break" /> và chuẩn bị cho những ngày sắp
                tới.
              </p>
              <LocationSearch
                key={quick}
                initialQuery={quick}
                onSelect={selectLocation}
              />
              <div className="suggestions">
                <span>Thử tìm</span>
                {['Hà Nội', 'Đà Nẵng', 'Hồ Chí Minh'].map((city) => (
                  <button key={city} onClick={() => setQuick(city)}>
                    {city}
                    <Icon name="arrow" size={13} />
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              {current.loading ? (
                <section className="glass current-placeholder">
                  <h1>{selected.name}</h1>
                  <Loading label="Đang cập nhật thời tiết…" />
                </section>
              ) : current.error ? (
                <section className="glass current-placeholder">
                  <h1>{selected.name}</h1>
                  <Feedback error={current.error} onRetry={current.reload} />
                </section>
              ) : (
                current.data && (
                  <CurrentWeather
                    data={current.data}
                    location={selected}
                    unit={unit}
                    favoriteAction={favoriteAction}
                  />
                )
              )}
              {saveError && <Feedback error={saveError} />}
              {forecast.loading ? (
                <section className="glass forecast">
                  <h2>Dự báo sắp tới</h2>
                  <Loading />
                </section>
              ) : forecast.error ? (
                <section className="glass forecast">
                  <h2>Dự báo sắp tới</h2>
                  <Feedback error={forecast.error} onRetry={forecast.reload} />
                </section>
              ) : (
                forecast.data && <Forecast data={forecast.data} unit={unit} />
              )}
            </>
          )}
          <section className="alerts-panel" aria-labelledby="alerts-heading">
            <Icon name="info" size={22} />
            <div>
              <h2 id="alerts-heading">Thông tin cảnh báo</h2>
              {alerts.loading ? (
                <p>Đang kiểm tra nguồn cảnh báo…</p>
              ) : alerts.error ? (
                <Feedback error={alerts.error} onRetry={alerts.reload} />
              ) : alerts.data?.status === 'UNSUPPORTED' ? (
                <p>
                  Nguồn dữ liệu hiện tại chưa hỗ trợ cảnh báo thời tiết nghiêm
                  trọng. Bạn nên theo dõi thêm thông báo từ cơ quan khí tượng
                  địa phương.
                </p>
              ) : (
                <p>Chưa xác định được trạng thái cảnh báo từ nguồn dữ liệu.</p>
              )}
            </div>
          </section>
        </div>
        {user ? <PersonalPlaces favorites={favorites} /> : <GuestPlaces />}
      </div>
    </main>
  );
}
