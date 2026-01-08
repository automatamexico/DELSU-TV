// src/pages/ProfilePage.jsx
import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth(); // asume { user } viene de AuthContext (auth.user)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("México");
  const [avatarUrl, setAvatarUrl] = useState("");

  const fileRef = useRef(null);

  // Carga el perfil
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true);
      setErrorMsg("");
      const { data, error } = await supabase
        .from("user_profiles")        // <-- nombre tabla
        .select("full_name, country, avatar_url")
        .eq("id", user.id)            // <-- PK = id (NO user_id)
        .single();

      if (!ignore) {
        if (error && error.code !== "PGRST116") {
          setErrorMsg("No se pudo cargar el perfil.");
        } else if (data) {
          setFullName(data.full_name || "");
          setCountry(data.country || "México");
          setAvatarUrl(data.avatar_url || "");
        }
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [user?.id]);

  const onPickFile = () => fileRef.current?.click();

  // Subir avatar al bucket 'avatars' y actualizar avatar_url
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setErrorMsg("");
    setOkMsg("");
    setSaving(true);
    try {
      // ruta única: <uid>/avatar_<timestamp>.<ext>
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase
        .storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
        });

      if (upErr) throw upErr;

      // URL pública (si tu bucket no es público, usa createSignedUrl)
      const { data: urlData } = supabase
        .storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = urlData?.publicUrl || "";

      // upsert en perfiles (usa id, NO user_id)
      const { error: upsertErr } = await supabase
        .from("user_profiles")
        .upsert(
          {
            id: user.id,                // clave
            avatar_url: publicUrl,
            full_name: fullName || null,
            country: country || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }          // conflicto por id
        );

      if (upsertErr) throw upsertErr;

      setAvatarUrl(publicUrl);
      setOkMsg("Avatar actualizado.");
    } catch (err) {
      setErrorMsg(
        "No se pudo subir el avatar: " +
          (err?.message || "error desconocido")
      );
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setErrorMsg("");
    setOkMsg("");
    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert(
          {
            id: user.id,               // clave
            full_name: fullName || null,
            country: country || null,
            avatar_url: avatarUrl || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (error) throw error;
      setOkMsg("Perfil actualizado.");
    } catch (err) {
      setErrorMsg("No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = fullName?.trim() || "Sin nombre";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <motion.h1
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Perfil
        </motion.h1>

        <motion.div
          className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Cabecera */}
          <div className="p-4 sm:p-6 flex gap-4">
            <div className="relative">
              <img
                src={
                  avatarUrl ||
                  "https://api.dicebear.com/7.x/initials/svg?seed=" +
                    encodeURIComponent(user?.email || "U")
                }
                alt="avatar"
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border border-gray-700"
              />
              <button
                type="button"
                onClick={onPickFile}
                disabled={saving}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-full shadow disabled:opacity-60"
              >
                Cambiar
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-lg truncate">
                {displayName}
              </div>
              <div className="text-sm text-gray-300 truncate">
                {user?.email}
              </div>
              <div className="text-sm text-gray-400 mt-1">{country || "—"}</div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={onSave} className="p-4 sm:p-6 border-t border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 outline-none focus:border-rose-500/60"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">País</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="México"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 outline-none focus:border-rose-500/60"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || loading}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              {okMsg && (
                <span className="text-green-400 text-sm">{okMsg}</span>
              )}
              {errorMsg && (
                <span className="text-amber-400 text-sm">{errorMsg}</span>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
