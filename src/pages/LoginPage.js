// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");

    try {
      // 1) Login
      const { data: signRes, error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signErr) throw new Error(signErr.message || "No se pudo iniciar sesión.");

      // 2) Obtener user actual
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(userErr.message || "No se pudo obtener el usuario.");
      const uid = userRes?.user?.id;
      if (!uid) throw new Error("No se obtuvo UID de la sesión.");

      // 3) Leer role desde user_profiles
      const { data: prof, error: profErr } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (profErr && profErr.code && profErr.code !== "PGRST116") {
        throw new Error("Error leyendo perfil: " + (profErr.message || profErr.code));
      }

      // Si no hay fila, trátalo como "user" (o crea una por detrás si quieres)
      const role = prof?.role || "user";

      // 4) Redirección por rol
      if (role === "admin") {
        navigate("/admin", { replace: true, state: { from: location } });
      } else {
        navigate("/dashboard", { replace: true, state: { from: location } });
      }
    } catch (err) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 text-white">
        <h1 className="text-2xl font-semibold text-center mb-6">Iniciar sesión</h1>

        {errorMsg ? (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-200">
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Correo</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-rose-500/40"
                placeholder="admin@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Contraseña</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-rose-500/40"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 font-medium hover:bg-rose-700 disabled:opacity-60"
          >
            <LogIn className="h-5 w-5" />
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
