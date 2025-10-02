// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseclients';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // -------- helpers ----------
  const fetchProfile = useCallback(async (uid) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) throw error;

      // si no existe, créalo con rol "user" por defecto
      if (!data) {
        const { data: inserted, error: insErr } = await supabase
          .from('user_profiles')
          .insert([{ id: uid, full_name: '', country: '', role: 'user' }])
          .select()
          .single();
        if (insErr) throw insErr;
        setProfile(inserted);
        return inserted;
      }

      setProfile(data);
      return data;
    } catch (e) {
      console.warn('[auth] fetchProfile error:', e?.message || e);
      setProfile(null);
      return null;
    }
  }, []);

  const setFromSession = useCallback(async (session) => {
    const sUser = session?.user ?? null;
    setUser(sUser);
    if (sUser) {
      await fetchProfile(sUser.id);
    } else {
      setProfile(null);
    }
  }, [fetchProfile]);

  // -------- init + listener ----------
  useEffect(() => {
    let unsub;

    (async () => {
      try {
        setLoading(true);
        setAuthError('');

        // 1) sesión inicial
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        await setFromSession(data.session);
      } catch (e) {
        console.error('[auth] getSession error:', e?.message || e);
        setAuthError(e?.message || 'Failed to fetch');
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }

      // 2) suscripción a cambios de auth
      unsub = supabase.auth.onAuthStateChange(async (_event, session) => {
        // eventos: SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED ...
        await setFromSession(session);
        setLoading(false);
      }).data.subscription;
    })();

    return () => {
      try { unsub?.unsubscribe(); } catch {}
    };
  }, [setFromSession]);

  // -------- acciones públicas ----------
  const signIn = useCallback(async (email, password) => {
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await setFromSession(data.session);
    return data.user;
  }, [setFromSession]);

  const signUp = useCallback(async (email, password, fullName = '', country = '') => {
    setAuthError('');
    // metadata deja rol=user por defecto
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, country, role: 'user' },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;

    // si el proyecto NO requiere confirmación por email y ya hubo sesión:
    if (data.session?.user?.id) {
      await fetchProfile(data.session.user.id);
    }
    return data.user;
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setAuthError('');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // limpiar estado local inmediatamente para que el UI responda
    setUser(null);
    setProfile(null);
  }, []);

  const value = {
    user,
    profile,
    loading,
    authError,
    signIn,
    signUp,
    signOut,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
