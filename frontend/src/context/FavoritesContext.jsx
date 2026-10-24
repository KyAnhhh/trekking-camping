import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { favoriteService } from '../api/favoriteService';
import { errorMessage } from '../utils/tour';

const FavoritesContext = createContext(null);
export const useFavorites = () => useContext(FavoritesContext);
export function FavoritesProvider({ children }) {
  const { user } = useContext(AuthContext);
  // Remount all private favorite state when the authenticated session changes.
  return <SessionFavorites key={user?.token || 'guest'} signedIn={!!user}>{children}</SessionFavorites>;
}
function SessionFavorites({ signedIn, children }) {
  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(signedIn);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState([]);
  const locks = useRef(new Set());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    favoriteService.ids(controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setIds(data.data);
    }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [signedIn, reload]);
  const toggle = async (id) => {
    if (!signedIn || loading || error || locks.current.has(id)) return;
    locks.current.add(id); setPending([...locks.current]);
    const saved = ids.includes(id);
    try {
      await (saved ? favoriteService.remove(id) : favoriteService.save(id));
      if (alive.current) {
        setIds(current => saved ? current.filter(x => x !== id) : [...new Set([...current, id])]);
        setRevision(n => n + 1);
      }
    } finally {
      locks.current.delete(id);
      if (alive.current) setPending([...locks.current]);
    }
  };
  return <FavoritesContext.Provider value={{ ids, loading, error, pending, revision, toggle,
    retry: () => setReload(n => n + 1) }}>{children}</FavoritesContext.Provider>;
}
