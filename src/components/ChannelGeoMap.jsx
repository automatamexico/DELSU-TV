// src/components/ChannelGeoMap.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const WORLD_TOPO =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const fmtNumber = (n) =>
  typeof n === "number"
    ? n.toLocaleString("es-MX")
    : Number(n || 0).toLocaleString("es-MX");

export default function ChannelGeoMap({ channelId, className = "" }) {
  const [rows, setRows] = useState([]);
  const [hover, setHover] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // 🎨 Colores:
  // 0 → azul tenue (igual que antes)
  // 1–3 → rojo
  // 4–10 → verde
  // 11–50 → amarillo
  // 51+ → rosa
  const colorFor = (views) => {
    const v = Number(views || 0);
    if (v <= 0) return "rgba(59,130,246,0.08)";   // azul muy tenue
    if (v <= 3) return "rgba(239,68,68,0.75)";    // rojo
    if (v <= 10) return "rgba(34,197,94,0.75)";   // verde
    if (v <= 50) return "rgba(234,179,8,0.8)";    // amarillo
    return "rgba(236,72,153,0.9)";                // rosa
  };

  return (
    <div
      className={
        "bg-gray-800/60 border border-gray-700 rounded-2xl px-3 pt-1 pb-1 " +
        className
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

      <div className="-mt-6 md:-mt-8 lg:-mt-12">
        <div className="w-full h-[460px] md:h-[560px] lg:h-[660px]">
          <ComposableMap
            projectionConfig={{ scale: 145 }}
            style={{ width: "100%", height: "100%" }}
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
                      onMouseEnter={() => setHover({ name, views })}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        default: {
                          fill: colorFor(views),
                          outline: "none",
                          stroke: "rgba(148,163,184,0.15)",
                          strokeWidth: 0.5,
                        },
                        hover: {
                          fill: "rgb(99,102,241)",
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
      </div>

      <div className="mt-1 -mb-1 text-sm text-gray-300 h-5">
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

      {/* Leyenda con los mismos colores */}
      <div className="mt-2 grid grid-cols-5 gap-2 text-[10px] md:text-[11px] text-gray-300">
        {[
          { l: "0", c: "rgba(59,130,246,0.08)" },   // azul tenue
          { l: "1–3", c: "rgba(239,68,68,0.75)" },  // rojo
          { l: "4–10", c: "rgba(34,197,94,0.75)" }, // verde
          { l: "11–50", c: "rgba(234,179,8,0.8)" }, // amarillo
          { l: "51+", c: "rgba(236,72,153,0.9)" },  // rosa
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
