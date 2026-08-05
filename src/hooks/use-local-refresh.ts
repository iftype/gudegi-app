import { useCallback, useRef, useState } from 'react';

export function useLocalRefresh(refresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const inFlightRef = useRef(false);

  const onRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      inFlightRef.current = false;
      setRefreshing(false);
    }
  }, [refresh]);

  return { refreshing, onRefresh };
}
