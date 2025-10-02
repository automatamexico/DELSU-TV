const submit = async (e) => {
  e.preventDefault();
  setErr('');
  setLoading(true);
  setSteps([]);

  // Log inmediato para comprobar que el click llegó
  const emailSan = email.trim().toLowerCase();
  log('CLICK Entrar recibido', { email: emailSan });

  try {
    // 0) Preflight relajado (informativo)
    log('0) Preflight relajado a Supabase Auth', { SB_URL });
    const pf = await preflightAuthRelaxed();
    log('0.1) Preflight info', pf);

    // 1) Login
    log('1) signInWithPassword…', { email: emailSan });
    const { data: signData, error: signErr } = await withTimeout(
      supabase.auth.signInWithPassword({ email: emailSan, password }),
      10000,
      'signInWithPassword'
    );
    log('1.1) signIn result', { error: signErr?.message, user: signData?.user?.id });
    if (signErr) throw new Error(signErr.message || 'No se pudo iniciar sesión');

    // 2) getUser
    const { data: ures, error: getUserErr } = await withTimeout(
      supabase.auth.getUser(),
      8000,
      'getUser'
    );
    log('2) getUser', { error: getUserErr?.message, user: ures?.user?.id });
    if (getUserErr) throw getUserErr;
    const uid = ures?.user?.id;
    if (!uid) throw new Error('No se obtuvo UID');

    // 3) role
    const { data: prof, error: selErr } = await withTimeout(
      supabase.from('user_profiles').select('role').eq('id', uid).maybeSingle(),
      8000,
      'select profile'
    );
    log('3) SELECT user_profiles', { error: selErr?.message, data: prof });
    if (selErr && selErr.code && selErr.code !== 'PGRST116') {
      throw new Error('Error leyendo perfil: ' + selErr.message);
    }

    let role = prof?.role;
    if (!role) {
      log('3.1) No hay fila → upsert({id})');
      const up = await withTimeout(
        supabase.from('user_profiles')
          .upsert([{ id: uid }], { onConflict: 'id', ignoreDuplicates: true })
          .select('role')
          .maybeSingle(),
        8000,
        'upsert profile'
      );
      log('3.2) upsert result', { error: up.error?.message, data: up.data });
      if (up.error && up.error.code) throw new Error('RLS bloqueó el upsert. Revisa políticas INSERT/SELECT.');
      role = up.data?.role || 'user';
    }

    log('4) Rol final', { role });

    if (role !== 'admin') {
      setErr('Tu cuenta no tiene permisos de administrador.');
      await supabase.auth.signOut();
      return;
    }

    log('5) OK admin → /dashboard');
    navigate('/dashboard', { replace: true });
  } catch (e2) {
    setErr(e2?.message || String(e2));
    log('✖ ERROR', e2?.message || String(e2));
  } finally {
    setLoading(false);
  }
};


