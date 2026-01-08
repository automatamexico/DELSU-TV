// src/pages/ProfilePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const AVATAR_BUCKET = "avatars";

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

export default function ProfilePage() {
  const { user, profile } = useAuth(); // profile: { display_name, country, avatar_url, ... }
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [email] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const initials = useMemo(() => {
    if (displayName?.trim()) {
      const parts = displayName.trim().split(/\s+/).slice(0, 2);
      return parts.map((p) => p[0]?.toUpperCase() || "").join("");
    }
    if (email) return email[0]?.toUpperCase() || "U";
    return "U";
  }, [displayName, email]);

  // Refresca campos locales cuando cambie el perfil del contexto
  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setCountry(profile?.country || "");
    setAvatarUrl(profile?.avatar_url || "");
  }, [profile]);

  const handleUpload = async (file) => {
    if (!user?.id || !file) return;
    try {
      setUploading(true);
      setMsg("");

      // 1) Subir al bucket
      const path = `${user.id}/${Date.now()}_${file.name}`.replace(/\s+/g, "_");
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;

      // 2) Obtener URL pública
      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const publicUrl = pub?.publicUrl || "";

      // 3) Persistir en tabla user_profiles
      const { error: updErr } = await supabase
        .from("user_profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
      setMsg("✅ Avatar actualizado.");
    } catch (e) {
      setMsg("⚠️ No se pudo subir el avatar: " + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const onSelectFile = (e) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      setSaving(true);
      setMsg("");

      const payload = {
        display_name: displayName || null,
        country: country || null,
      };

      const { error } = await supabase
        .from("user_profiles")
        .update(payload)
        .eq("user_id", user.id);

      if (error) throw error;

      setMsg("✅ Datos guardados.");
    } catch (e) {
      setMsg("⚠️ No se pudieron guardar los datos: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Perfil</h1>

        {/* Tarjeta principal */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Encabezado con avatar */}
          <div className="p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Avatar */}
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-28 h-28 rounded-full object-cover ring-2 ring-gray-700"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-rose-600/20 ring-2 ring-gray-700 grid place-items-center">
                  <span className="text-3xl font-bold text-rose-300">{initials}</span>
                </div>
              )}
              <label
                className={classNames(
                  "absolute -bottom-2 -right-2 cursor-pointer text-xs",
                  "px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500",
                  "text-white shadow transition"
                )}
              >
                {uploading ? "Subiendo…" : "Cambiar"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onSelectFile}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Datos básicos */}
            <div className="flex-1 w-full">
              <div className="text-white text-lg font-semibold">
                {displayName || "Sin nombre"}
              </div>
              <div className="text-gray-300">{email}</div>
              <div className="text-gray-400 text-sm">{country || "—"}</div>
            </div>
          </div>

          <div className="h-px bg-gray-800" />

          {/* Formulario de edición (nombre / país) */}
          <form className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleSaveInfo}>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">País</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                placeholder="México, Colombia, …"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between mt-2">
              <div className="text-sm text-gray-400">{msg}</div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>

        {/* Tip: muestra ayuda del bucket si no existe */}
        <p className="text-xs text-gray-500 mt-4">
          Nota: asegúrate de tener un bucket público llamado <code>avatars</code> en Supabase
          y una columna <code>avatar_url</code> en <code>user_profiles</code>.
        </p>
      </div>
    </div>
  );
}
