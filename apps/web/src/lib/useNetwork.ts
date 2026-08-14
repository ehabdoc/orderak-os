import { useEffect, useState } from 'react';
import { fullSync } from '../db/sync';

export function useNetwork() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      // Try to sync as soon as we come back online
      sync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await fullSync();
    } catch {
      /* ignore — we'll retry */
    } finally {
      setSyncing(false);
    }
  };

  return { online, syncing, sync };
}
