// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClientCore'; // ¡OJO! Importa SIEMPRE del core

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const fetchProfile = useCallback(async (uid) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        // crea el registro si no existe
        const { data: inserted, error: insErr } = await supabase
          .from('user_profiles')
          .insert([{ id: uid, full_name: '', country: '', role: 'user', avatar_url: null }])
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

  useEffect(() => {
    let unsub;
    (async () => {
      try {
        setLoading(true);
        setAuthError('');
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

      unsub = supabase.auth.onAuthStateChange(async (_event, session) => {
        await setFromSession(session);
        setLoading(false);
      }).data.subscription;
    })();

    return () => {
      try { unsub?.unsubscribe(); } catch {}
    };
  }, [setFromSession]);

  const signIn = useCallback(async (...args) => {
    setAuthError('');
    let email, password;
    if (typeof args[0] === 'object') {
      email = args[0]?.email; password = args[0]?.password;
    } else {
      email = args[0]; password = args[1];
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await setFromSession(data.session);
    return data.user;
  }, [setFromSession]);

  const signUp = useCallback(async (...args) => {
    setAuthError('');
    let email, password, fullName = '', country = '';

    if (typeof args[0] === 'object') {
      email = args[0]?.email;
      password = args[0]?.password;
      fullName = args[0]?.fullName || '';
      country = args[0]?.country || '';
    } else {
      email = args[0];
      password = args[1];
      fullName = args[2] || '';
      country = args[3] || '';
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, country, role: 'user' },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;

    if (data.session?.user?.id) {
      await fetchProfile(data.session.user.id);
      return data.user;
    }

    try {
      const { data: sData, error: sErr } = await supabase.auth.signInWithPassword({ email, password });
      if (sErr) throw sErr;
      await setFromSession(sData.session);
      return sData.user;
    } catch (e) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('confirm') || msg.includes('email not confirmed')) {
        throw new Error('Tu cuenta fue creada, pero debes confirmar el correo antes de iniciar sesión. Revisa tu bandeja.');
      }
      throw e;
    }
  }, [fetchProfile, setFromSession]);

  const signOut = useCallback(async () => {
    setAuthError('');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }, []);

  // ====== AJUSTE: usar UPSERT, defensas y logs ======
  const updateProfile = useCallback(async ({ fullName, country }) => {
    if (!user?.id) throw new Error('No user');

    const payload = { id: user.id };
    if (typeof fullName === 'string') payload.full_name = fullName.trim();
    if (typeof country === 'string') payload.country = country.trim();

    // si no cambió nada, no pegamos a la BD
    if (Object.keys(payload).length === 1) {
      console.debug('[profile] Nada que actualizar');
      return profile;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[profile] upsert error:', error);
      throw error;
    }

    setProfile(data);
    return data;
  }, [user?.id, profile]);

  // ====== AJUSTE: subir avatar + UPSERT del avatar_url ======
  const uploadAvatar = useCallback(async (file) => {
    if (!user?.id) throw new Error('No user');
    if (!file) throw new Error('Archivo no válido');

    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase
      .storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
    if (upErr) {
      console.error('[avatar] upload error:', upErr);
      throw upErr;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = pub?.publicUrl;

    const { data, error: updErr } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' })
      .select()
      .single();

    if (updErr) {
      console.error('[avatar] save url error:', updErr);
      throw updErr;
    }

    setProfile(data);
    return publicUrl;
  }, [user?.id]);

  const value = {
    user,
    profile,
    loading,
    authError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    uploadAvatar,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

