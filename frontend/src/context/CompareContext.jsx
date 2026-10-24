import { createContext, useContext, useEffect, useState } from 'react';

const CompareContext = createContext(null);
const storageKey = 'trek.compare.v1';
function restored() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter((row, i) => row && typeof row.slug === 'string' && row.slug.length > 0 && row.slug.length <= 250
      && typeof row.title === 'string' && row.title.length <= 500 && rows.findIndex(r => r?.slug === row.slug) === i).slice(0, 3);
  } catch { return []; }
}
export function CompareProvider({ children }) {
  const [selected, setSelected] = useState(restored);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(selected)); } catch { /* Selection still works without storage. */ }
  }, [selected]);
  const remove = slug => setSelected(rows => rows.filter(row => row.slug !== slug));
  const toggle = tour => setSelected(rows => {
    if (rows.some(row => row.slug === tour.slug)) return rows.filter(row => row.slug !== tour.slug);
    if (!tour.slug || rows.length >= 3) return rows;
    return [...rows, { slug: tour.slug, title: tour.title || tour.slug }];
  });
  return <CompareContext.Provider value={{ selected, toggle, remove, clear: () => setSelected([]) }}>{children}</CompareContext.Provider>;
}
export const useCompare = () => useContext(CompareContext);
