// Hook de canales con búsqueda y filtro por categoría
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient"; // tu cliente ya existente

// util: normaliza strings para búsquedas (acentos, mayúsculas, espacios)
const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export function useChannels(userRole = "user") {
  const [allChannels, setAllChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // controles UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // si usas filtros extra, los preservo aunque no los necesitamos aquí
  const [filters, setFilters] = useState({});
  const handleFilterChange = (next) => setFilters((prev) => ({ ...prev, ...next }));

  // carga de canales (sin tocar tu esquema; si ya los cargas en otro sitio, esto no choca)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase
          .from("channels")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;
        if (!mounted) return;

        setAllChannels(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        // si falla, no rompemos la UI
        setErrorMsg("No se pudieron cargar los canales.");
        setAllChannels((v) => v || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userRole]);

  // derivado: aplica búsqueda + categoría
  const channels = useMemo(() => {
    const q = norm(searchTerm);
    const cat = norm(selectedCategory);

    return (allChannels || []).filter((ch) => {
      // categoría
      if (cat && cat !== "todos") {
        const chCat = norm(ch?.category || ch?.categoria || ch?.genre);
        if (!chCat || chCat !== cat) return false;
      }
      // búsqueda (en varios campos habituales)
      if (!q) return true;

      const hay =
        norm(ch?.title || ch?.name || ch?.channel_name).includes(q) ||
        norm(ch?.description || ch?.descripcion || ch?.about).includes(q) ||
        norm(ch?.country || ch?.pais).includes(q);

      return hay;
    });
  }, [allChannels, searchTerm, selectedCategory]);

  return {
    channels,
    loading,
    errorMsg,

    // controles expuestos para Header/CategoryFilter
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,

    // por compatibilidad con tu UI actual
    filters,
    handleFilterChange,
  };
}
