import { useCallback, useState } from 'react';

type Refetcher = (() => Promise<unknown> | unknown) | undefined | null | false;

/**
 * Drives a RefreshControl. Pass the refetch function(s) from the screen's data
 * query hook(s); with none given, pulling just shows/hides the spinner (for
 * screens with nothing to refetch, e.g. static or form screens).
 */
export function usePullToRefresh(refetchers?: Refetcher | Refetcher[]) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    const fns = (Array.isArray(refetchers) ? refetchers : [refetchers]).filter(Boolean) as Array<
      () => Promise<unknown> | unknown
    >;
    setRefreshing(true);
    try {
      if (fns.length > 0) {
        await Promise.all(fns.map((fn) => fn()));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchers]);

  return { refreshing, onRefresh };
}
