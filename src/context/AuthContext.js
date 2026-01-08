// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión actual + suscripción a cambios
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user ?? null;
      if (isMounted) setUser(currentUser);

      if (currentUser?.id) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("id, full_name, country, role, avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (isMounted) setProfile(prof || null);
      } else {
        if (isMounted) setProfile(null);
      }
      if (isMounted) setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        setProfile(null);
        return;
      }
      // refrescar perfil al cambiar sesión
      supabase
        .from("user_profiles")
        .select("id, full_name, country, role, avatar_url")
        .eq("id", u.id)
        .maybeSingle()
        .then(({ data: prof }) => setProfile(prof || null));
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn: ({ email, password }) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
      signUp: ({ email, password, fullName, country }) =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, country },
          },
        }),
      refreshProfile: async () => {
        if (!user?.id) return null;
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("id, full_name, country, role, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(prof || null);
        return prof || null;
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
