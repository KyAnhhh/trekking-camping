import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithDedupe, getCache, normalizeKey, setCache, subscribeCache } from '../utils/cache';

/**
 * Enhanced data fetching hook with Caching, SWR, and Deduplication.
 * 
 * @param {Function} loader - async function () => data
 * @param {Object|string} [options] - caching options or string cache key
 * @param {string|Array} [options.key] - unique cache key (e.g. 'tours', ['tour', slug])
 * @param {number} [options.ttl=300000] - time-to-live in ms (default 5m)
 * @param {boolean} [options.swr=true] - stale-while-revalidate flag
 * @param {boolean} [options.persist=false] - persist in sessionStorage for F5 reload (only for public data)
 */
export default function useResource(loader, options = {}) {
  const opts = typeof options === 'string' ? { key: options } : options || {};
  const {
    key = null,
    ttl = 300000,
    swr = true,
    persist = false,
  } = opts;

  const normKey = normalizeKey(key);

  // Initialize state with cache if available
  const [state, setState] = useState(() => {
    if (normKey) {
      const cached = getCache(normKey, { allowStale: true });
      if (cached && cached.data !== null && cached.data !== undefined) {
        return { data: cached.data, loading: false, error: '', isRevalidating: !cached.fresh };
      }
    }
    return { data: null, loading: true, error: '', isRevalidating: false };
  });

  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // Listen to external cache invalidations
  useEffect(() => {
    if (!normKey) return;
    return subscribeCache((updatedKey, newData) => {
      if (updatedKey === '*' || updatedKey === normKey || normKey.startsWith(updatedKey + ':')) {
        if (newData === null) {
          // Cache invalidated, trigger reload
          setRevision((v) => v + 1);
        } else if (newData !== undefined) {
          setState((prev) => ({ ...prev, data: newData, loading: false, error: '' }));
        }
      }
    });
  }, [normKey]);

  useEffect(() => {
    let active = true;

    const cached = normKey ? getCache(normKey, { allowStale: true }) : null;
    const hasData = cached && cached.data !== null && cached.data !== undefined;

    if (hasData) {
      setState({
        data: cached.data,
        loading: false,
        error: '',
        isRevalidating: !cached.fresh || revision > 0,
      });

      // If data is fresh and this is not a manual reload, do not hit network
      if (cached.fresh && revision === 0) {
        return () => {
          active = false;
        };
      }
    } else {
      setState((prev) => ({
        data: prev.data,
        loading: !prev.data,
        error: '',
        isRevalidating: false,
      }));
    }

    const fetcher = () => loaderRef.current();
    const requestPromise = normKey ? fetchWithDedupe(normKey, fetcher) : fetcher();

    requestPromise
      .then((data) => {
        if (!active) return;
        if (normKey && data !== undefined && data !== null) {
          setCache(normKey, data, { ttl, persist });
        }
        setState({ data, loading: false, error: '', isRevalidating: false });
      })
      .catch((error) => {
        if (!active) return;
        setState((prev) => ({
          data: prev.data || null,
          loading: false,
          isRevalidating: false,
          error: prev.data
            ? ''
            : (error?.response?.data?.message || error?.message || 'Không thể tải dữ liệu. Kiểm tra kết nối và thử lại.'),
        }));
      });

    return () => {
      active = false;
    };
  }, [normKey, revision, ttl, persist, swr]);

  return { ...state, reload };
}
