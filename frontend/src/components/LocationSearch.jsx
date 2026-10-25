import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Icon } from './Icon.jsx';
export function LocationSearch({ onSelect, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery),
    [open, setOpen] = useState(Boolean(initialQuery)),
    [active, setActive] = useState(-1);
  const [result, setResult] = useState({ query: '', items: [], error: null });
  const id = useId();
  const wrapper = useRef(null);
  const normalized = query.normalize('NFC').trim().replace(/\s+/g, ' ');
  const items = result.query === normalized ? result.items : [];
  const loading = normalized.length >= 2 && result.query !== normalized;
  useEffect(() => {
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .request(`/weather/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        })
        .then(({ data }) => {
          if (!controller.signal.aborted)
            setResult({ query: normalized, items: data, error: null });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({ query: normalized, items: [], error });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalized]);
  function choose(location) {
    onSelect(location);
    setOpen(false);
    setActive(-1);
  }
  return (
    <div
      className="search"
      ref={wrapper}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label className="sr-only" htmlFor={id}>
        Tìm thành phố
      </label>
      <Icon name="search" />
      <input
        id={id}
        value={query}
        placeholder="Tìm thành phố…"
        autoComplete="off"
        maxLength={100}
        role="combobox"
        aria-expanded={open && normalized.length >= 2}
        aria-controls={`${id}-results`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && items[active] ? `${id}-${active}` : undefined
        }
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
          }
          if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            setActive((i) =>
              items.length
                ? (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) %
                  items.length
                : -1,
            );
          }
          if (e.key === 'Enter' && open && items[active]) {
            e.preventDefault();
            choose(items[active]);
          }
        }}
      />
      {query && (
        <button
          className="icon-button"
          aria-label="Xóa tìm kiếm"
          onClick={() => {
            setQuery('');
            setActive(-1);
            wrapper.current.querySelector('input').focus();
          }}
        >
          <Icon name="close" size={16} />
        </button>
      )}
      {open && normalized.length >= 2 && (
        <div className="search-popover">
          <div
            role="listbox"
            id={`${id}-results`}
            aria-label="Địa điểm tìm thấy"
          >
            {items.map((location, index) => (
              <div
                role="option"
                aria-selected={index === active}
                id={`${id}-${index}`}
                key={location.locationKey}
                className={`search-option ${active === index ? 'active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(location)}
              >
                <Icon name="pin" />
                <div>
                  <strong>{location.name}</strong>
                  <span>
                    {[location.state, location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
                <Icon name="arrow" size={16} />
              </div>
            ))}
          </div>
          <div
            role="status"
            className={items.length ? 'sr-only' : 'search-status'}
          >
            {loading
              ? 'Đang tìm địa điểm…'
              : (result.error?.message ??
                (items.length
                  ? `${items.length} địa điểm tìm thấy. Dùng phím mũi tên để chọn.`
                  : 'Không tìm thấy địa điểm. Thử tên khác hoặc thêm quốc gia.'))}
          </div>
        </div>
      )}
    </div>
  );
}
