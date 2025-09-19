// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // usa tu ruta real

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, country, role')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const s = data?.session ?? null;
        if (!mounted) return;
        setSession(s);
        if (s?.user) setProfile(await fetchProfile(s.user.id));
      } catch (e) {
        setAuthError(e.message || String(e));
        setSession(null);
        setProfile(null);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
      setSession(newSession ?? null);
      if (newSession?.user) {
        try {
          setProfile(await fetchProfile(newSession.user.id));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const signIn = async (...args) => {
    setAuthError(null);
    const creds = typeof args[0] === 'object' ? args[0] : { email: args[0], password: args[1] };
    const { error } = await supabase.auth.signInWithPassword(creds);
    if (error) throw error;
  };

  const signUp = async (...args) => {
    setAuthError(null);
    let email, password, fullName, country;
    if (typeof args[0] === 'object') ({ email, password, fullName, country } = args[0]);
    else [email, password, fullName, country] = args;

    // Guarda datos en raw_user_meta_data para que el TRIGGER los use
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { fullName, country } }
    });
    if (error) throw error;

    // Si NO usas confirmación por email, ya estás logueado: crea tu fila (por si el trigger no corriera)
    if (data.session?.user?.id) {
      await supabase.from('user_profiles').upsert({
        id: data.session.user.id,
        full_name: fullName || null,
        country: country || null,
        role: 'user'
      });
    }
  };

  const signOut = async () => {
    setAuthError(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      profile,              // ← aquí viene role: 'user' | 'admin'
      loading: session === undefined,
      authError,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

