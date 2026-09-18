import { useEffect, useState } from 'react';
import { identifyUser } from '@/lib/api';

const STORAGE_KEY = 'surveyflow-user';

/** Real (not simulated) identity: created via the backend on first visit, persisted locally. */
export function useIdentity() {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await identifyUser(email);
      localStorage.setItem(STORAGE_KEY, user.id);
      setUserId(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(STORAGE_KEY, userId);
  }, [userId]);

  return { userId, signIn, loading, error };
}
