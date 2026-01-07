// src/hooks/useChannels.js
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook de canales: lee de Supabase y normaliza campos.
 * - Convierte stream_url (DB) -> streamUrl (UI)
 */
export function useChannels(userRole) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros básicos que ya usas en HomePage/Header
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [filters, setFilters] = useState({});

  const handleFilterChange = (f) => setFilters((prev) => ({ ...prev, ...f }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('channels')
        .select('id,name,country,description,poster,stream_url,category,language,created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useChannels] Error:', error);
        setChannels([]);
      } else {
        const mapped = (data || []).map((r) => ({
          ...r,
          // normalización clave:
          streamUrl: r.stream_url ?? '', // <- lo que usará el player
        }));
        setChannels(mapped);
      }
      setLoading(false);
    };
    load();
  }, [userRole]);

  return {
    channels,
    loading,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    filters,
    handleFilterChange,
  };
}
