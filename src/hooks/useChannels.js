// src/hooks/useChannels.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClientCore';

const CACHE_KEY = 'delsu_channels_v1';
const STALE_MS = 2 * 60 * 1000; // 2 minutos

export function useChannels(userRole = 'user') {
  const [allChannels, setAllChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filters, setFilters] = useState({ country: '', language: '' });

  const abortRef = useRef(null);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // 1) Arranca con cache si existe (instant render)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data?.length) {
          setAllChannels(parsed.data);
          // si el cache es reciente, no bloqueamos con loading
          const fresh = Date.now() - (parsed.ts || 0) < STALE_MS;
          setLoading(!fresh); // si fresco => false; si viejo => true (revalidando)
        }
      }
    } catch {
      // si falla el JSON, ignoramos
    }
  }, []);

  // 2) Revalidate siempre en background (stale-while-revalidate)
  useEffect(() => {
    let didCancel = false;
    (async () => {
      setErrorMsg('');
      // cancela petición anterior si existiera
      try {
        abortRef.current?.abort?.();
      } catch {}
      abortRef.current = new AbortController();

      try {
        // Trae solo columnas necesarias; ajusta si tu tabla cambia
        const { data, error } = await supabase
          .from('channels')
          .select('id,name,country,description,poster,stream_url,category,language')
          .order('name', { ascending: true });

        if (error) throw error;
        if (didCancel) return;

        setAllChannels(Array.isArray(data) ? data : []);
        setLoading(false);

        // Guarda en cache
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: Array.isArray(data) ? data : [] })
          );
        } catch {}
      } catch (e) {
        if (didCancel) return;
        console.warn('[useChannels] fetch error:', e?.message || e);
        setErrorMsg(e?.message || 'Error cargando canales');
        // Si ya teníamos cache, no ponemos loading=true; mantenemos UI
        setLoading((prev) => (allChannels.length ? false : prev));
      }
    })();

    return () => {
      didCancel = true;
      try {
        abortRef.current?.abort?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // se ejecuta una vez (al entrar a Home)

  // 3) Filtro en memoria (rápido) sobre la lista actual (cache o red)
  const channels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allChannels.filter((ch) => {
      // filtro por rol si en tu app hay canales restringidos (ejemplo)
      if (userRole !== 'admin' && ch?.is_admin_only) return false;

      if (selectedCategory && ch?.category !== selectedCategory) return false;
      if (filters.country && ch?.country !== filters.country) return false;
      if (filters.language && ch?.language !== filters.language) return false;

      if (!term) return true;
      const hay =
        (ch?.name || '').toLowerCase().includes(term) ||
        (ch?.description || '').toLowerCase().includes(term) ||
        (ch?.country || '').toLowerCase().includes(term) ||
        (ch?.category || '').toLowerCase().includes(term);
      return hay;
    });
  }, [allChannels, searchTerm, selectedCategory, filters, userRole]);

  return {
    channels,
    loading,
    errorMsg,

    searchTerm,
    setSearchTerm,

    selectedCategory,
    setSelectedCategory,

    filters,
    handleFilterChange,
  };
}
