import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
export function useResource(path, isPrivate = false) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [result, setResult] = useState({ key: null, data: null, error: null });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api
      .request(path, { signal: controller.signal, private: isPrivate })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ key, data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, data: null, error });
      });
    return () => controller.abort();
  }, [path, key, isPrivate]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return {
    data: path && result.key === key ? result.data : null,
    error: path && result.key === key ? result.error : null,
    loading: Boolean(path && result.key !== key),
    reload,
  };
}
