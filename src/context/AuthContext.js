// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // ← usa tu ruta real al cliente

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined); // undefined = cargando
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

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const s = data?.session ?? null;
        if (!mounted) return;
        setSession(s);

        if (s?.user) {
          const p = await fetchProfile(s.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      } catch (err) {
        setAuthError(err?.message || String(err));
        setSession(null);
        setProfile(null);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession ?? null);
      if (newSession?.user) {
        try {
          const p = await fetchProfile(newSession.user.id);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
      mounted = false;
    };
  }, []);

  const signIn = async (...args) => {
    setAuthError(null);
    let creds = typeof args[0] === 'object' ? args[0] : { email: args[0], password: args[1] };
    const { error } = await supabase.auth.signInWithPassword(creds);
    if (error) throw error;
  };

  const signUp = async (...args) => {
    setAuthError(null);
    let email, password, fullName, country;
    if (typeof args[0] === 'object') ({ email, password, fullName, country } = args[0]);
    else [email, password, fullName, country] = args;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { fullName, country }, // se guarda en raw_user_meta_data
      },
    });
    if (error) throw error;

    // Crea/actualiza tu fila en user_profiles al registrarse (si no usas trigger)
    const { data: user } = await supabase.auth.getUser();
    if (user?.user?.id) {
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.user.id,
          full_name: fullName || null,
          country: country || null,
          role: 'user',
        });
    }
  };

  const signOut = async () => {
    setAuthError(null);
    await supabase.auth.signOut();
  };

  const value = {
    user: session?.user ?? null,
    session,
    profile, // ← aquí viene role: 'user' | 'admin'
    loading: session === undefined,
    authError,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
