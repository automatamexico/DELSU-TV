// src/pages/ProfilePage.jsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient"; // ⬅️ ajusta si tu ruta es distinta (p.ej. ../lib/supabaseClient)

export default function ProfilePage() {
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    country: "México",
    display_name: "",
    avatar_url: "",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Cargar usuario y su perfil
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      setUser(auth.user);

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("full_name,country,display_name,avatar_url")
        .eq("id", auth.user.id) // ⬅️ usa id, no user_id
        .maybeSingle();

      if (!error && profile) {
        setForm((f) => ({ ...f, ...profile }));
      }
    })();
  }, []);

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    try {
      setErrorMsg("");
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Subimos a avatars/<uid>/avatar_<ts>.<ext>
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
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

      // Obtenemos URL pública (si el bucket es público)
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("No se pudo obtener la URL pública del avatar.");

      // Guardamos en la tabla por id (no user_id)
      const { error: updErr } = await supabase
        .from("user_profiles")
        .upsert(
          { id: user.id, avatar_url: publicUrl },
          { onConflict: "id" }
        );
      if (updErr) throw updErr;

      setForm((f) => ({ ...f, avatar_url: publicUrl }));
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.message?.includes("user_id")
          ? "La tabla usa 'id' como clave. Ya ajustamos el guardado para usar 'id'."
          : (err?.message || "Error al subir el avatar.")
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      setErrorMsg("");
      setSaving(true);

      const payload = {
        id: user.id, // clave primaria
        full_name: form.full_name || null,
        country: form.country || null,
        display_name: form.display_name || null,
        avatar_url: form.avatar_url || null,
      };

      // upsert asegura crear/actualizar por id
      const { error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-8 bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <h1 className="text-2xl font-semibold mb-6">Perfil</h1>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/40">
        {/* Header */}
        <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative">
            <img
              src={
                form.avatar_url ||
                "https://placehold.co/160x160/png?text=Avatar"
              }
              alt="Avatar"
              className="h-28 w-28 rounded-full object-cover ring-2 ring-gray-800"
            />
            <button
              type="button"
              onClick={onPickFile}
              disabled={uploading}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 text-sm rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-60"
            >
              {uploading ? "Subiendo…" : "Cambiar"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="flex-1">
            <div className="text-lg font-semibold">
              {form.display_name || "Sin nombre"}
            </div>
            <div className="text-gray-300 text-sm mt-1">
              {user?.email || "—"}
            </div>
            <div className="text-gray-400 text-sm">
              {form.country || "—"}
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={onSave} className="border-t border-gray-800 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre</label>
            <input
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Tu nombre"
              value={form.full_name || ""}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">País</label>
            <input
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="País"
              value={form.country || ""}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>

          {errorMsg ? (
            <div className="md:col-span-2 text-amber-400 text-sm">
              {errorMsg}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
