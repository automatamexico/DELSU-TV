// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClients'; // ✅ import local al mismo directorio

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;
        setSession(data?.session ?? null);

        if (data?.session?.user) {
          // Ajusta a tu tabla de perfiles si la tienes:
          // const { data: p } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single();
          // setProfile(p);
          setProfile({ role: 'admin' }); // placeholder
        }
      } catch (err) {
        setAuthError(err?.message || String(err));
        setSession(null);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession ?? null);
      if (newSession?.user) {
        // const { data: p } = await supabase.from('profiles').select('*').eq('id', newSession.user.id).single();
        // setProfile(p);
        setProfile({ role: 'admin' });
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (...args) => {
    setAuthError(null);
    try {
      // Soporta ambas firmas: ({email, password}) o (email, password)
      let creds = {};
      if (typeof args[0] === 'object') creds = args[0];
      else creds = { email: args[0], password: args[1] };
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
    } catch (err) {
      setAuthError(err?.message || String(err));
      throw err;
    }
  };

  const signUp = async (...args) => {
    setAuthError(null);
    try {
      let email, password, fullName, country;
      if (typeof args[0] === 'object') ({ email, password, fullName, country } = args[0]);
      else [email, password, fullName, country] = args;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { fullName, country } },
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err?.message || String(err));
      throw err;
    }
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      setAuthError(err?.message || String(err));
    }
  };

  const value = {
    user: session?.user ?? null,
    session,
    profile,
    loading: session === undefined,
    authError,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
