import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data from the API and tracks loading/error.
 * `reload()` refetches without blanking the current data, so tables don't flash.
 */
export default function useRemote(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);

  const load = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    return fetcher()
      .then((res) => {
        if (id === seq.current) setState({ data: res.data, error: null, loading: false });
        return res;
      })
      .catch((error) => {
        if (id === seq.current) setState((s) => ({ ...s, error, loading: false }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
