// src/components/ChannelGeoMap.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// TopoJSON público (solo lectura)
const WORLD_TOPO =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const fmtNumber = (n) =>
  typeof n === "number"
    ? n.toLocaleString("es-MX")
    : Number(n || 0).toLocaleString("es-MX");

export default function ChannelGeoMap({ channelId, className = "" }) {
  const [rows, setRows] = useState([]);
  const [hover, setHover] = useState(null); // { name, views }
  const [loading, setLoading] = useState(true);

  // Carga agregados por país para este canal
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!channelId) return;

        const { data, error } = await supabase
          .from("channel_views_geo")
          .select("country_name, views_count")
          .eq("channel_id", channelId);
        if (error) throw error;
        if (alive) setRows(data || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[GeoMap] supabase", e);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [channelId]);

  // índice por nombre de país (los nombres vienen de Netlify geo, p.ej. "Mexico", "United States")
  const viewsByCountryName = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const name = (r?.country_name || "").trim();
      const v = Number(r?.views_count || 0);
      if (!name) continue;
      map.set(name.toLowerCase(), (map.get(name.toLowerCase()) || 0) + v);
    }
    return map;
  }, [rows]);

  // Escala simple por cuantiles (5 rangos)
  const colorFor = (views) => {
    const v = Number(views || 0);
    if (v <= 0) return "rgba(59,130,246,0.08)"; // azul muy tenue
    if (v <= 3) return "rgba(59,130,246,0.25)";
    if (v <= 10) return "rgba(59,130,246,0.45)";
    if (v <= 50) return "rgba(59,130,246,0.65)";
    return "rgba(59,130,246,0.9)"; // azul fuerte
  };

  return (
    <div
      className={
        // p-3 => px-3 pt-1 pb-3 para reducir aire arriba
        "bg-gray-800/60 border border-gray-700 rounded-2xl px-3 pt-1 pb-3 " + className
      }
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold">Audiencia por país</h3>
        {loading ? (
          <span className="text-xs text-gray-400">Cargando…</span>
        ) : (
          <span className="text-xs text-gray-400">
            Países: {rows?.length || 0}
          </span>
        )}
      </div>

      {/* Mapa responsivo (subido con margen negativo) */}
      <div className="w-full -mt-3 md:-mt-4 lg:-mt-6">
        <ComposableMap
          projectionConfig={{ scale: 145 }}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={WORLD_TOPO}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = (geo.properties?.name || "").trim();
                const views = viewsByCountryName.get(name.toLowerCase()) || 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() =>
                      setHover({
                        name,
                        views,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={{
                      default: {
                        fill: colorFor(views),
                        outline: "none",
                        stroke: "rgba(148,163,184,0.15)",
                        strokeWidth: 0.5,
                      },
                      hover: {
                        fill: "rgb(99,102,241)", // indigo al hover
                        outline: "none",
                      },
                      pressed: {
                        fill: "rgb(79,70,229)",
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip simple */}
      <div className="mt-2 text-sm text-gray-300 h-5">
        {hover ? (
          <span>
            {hover.name}: <strong>{fmtNumber(hover.views)}</strong> reproducciones
          </span>
        ) : (
          <span className="text-gray-500">
            Pasa el mouse sobre un país para ver reproducciones.
          </span>
        )}
      </div>

      {/* Leyenda */}
      <div className="mt-3 grid grid-cols-5 gap-2 text-[11px] text-gray-300">
        {[
          { l: "0", c: "rgba(59,130,246,0.08)" },
          { l: "1–3", c: "rgba(59,130,246,0.25)" },
          { l: "4–10", c: "rgba(59,130,246,0.45)" },
          { l: "11–50", c: "rgba(59,130,246,0.65)" },
          { l: "51+", c: "rgba(59,130,246,0.9)" },
        ].map((b) => (
          <div key={b.l} className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-3 rounded"
              style={{ background: b.c }}
            />
            <span>{b.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
