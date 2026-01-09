// === Reemplaza SOLO esta función en tu AdminLoginPage.jsx ===
function AdminChannelForm() {
  const [form, setForm] = useState({
    name: '',
    country: '',
    description: '',
    category: '',
    posterFile: null,

    // 👇 NUEVO CAMPO
    stream_url: '',

    rokuEnabled: false,
    roku_link_url: '',

    youtubeEnabled: false,
    youtube_url: '',

    facebookEnabled: false,
    facebook_url: '',

    tiktokEnabled: false,
    tiktok_url: '',

    websiteEnabled: false,
    website_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setForm((s) => ({ ...s, posterFile: files?.[0] || null }));
    } else if (type === 'checkbox') {
      setForm((s) => ({ ...s, [name]: checked }));
    } else {
      setForm((s) => ({ ...s, [name]: value }));
    }
  };

  const uploadPoster = async (file) => {
    if (!file) return null;
    const path = `posters/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const up = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '0',
      upsert: true,
    });
    if (up.error) throw up.error;
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    return pub?.publicUrl || null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);
    try {
      // 1) Subir póster si hay
      let posterUrl = null;
      if (form.posterFile) {
        posterUrl = await uploadPoster(form.posterFile);
      }

      // 2) Payload para 'channels'
      const payload = {
        name: form.name.trim(),
        country: form.country.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        poster: posterUrl,

        // 👇 GUARDA EL M3U8 EN stream_url
        stream_url: form.stream_url.trim(),
      };

      // Roku
      if (form.rokuEnabled) {
        payload.roku_icon_url = ICON_URLS.roku;
        payload.roku_link_url = form.roku_link_url?.trim() || null;
      } else {
        payload.roku_icon_url = null;
        payload.roku_link_url = null;
      }

      // YouTube
      if (form.youtubeEnabled) {
        payload.youtube_icon_url = ICON_URLS.youtube;
        payload.youtube_url = form.youtube_url?.trim() || null;
      } else {
        payload.youtube_icon_url = null;
        payload.youtube_url = null;
      }

      // Facebook
      if (form.facebookEnabled) {
        payload.facebook_icon_url = ICON_URLS.facebook;
        payload.facebook_url = form.facebook_url?.trim() || null;
      } else {
        payload.facebook_icon_url = null;
        payload.facebook_url = null;
      }

      // TikTok
      if (form.tiktokEnabled) {
        payload.tiktok_icon_url = ICON_URLS.tiktok;
        payload.tiktok_url = form.tiktok_url?.trim() || null;
      } else {
        payload.tiktok_icon_url = null;
        payload.tiktok_url = null;
      }

      // Website
      if (form.websiteEnabled) {
        payload.website_icon_url = ICON_URLS.website;
        payload.website_url = form.website_url?.trim() || null;
      } else {
        payload.website_icon_url = null;
        payload.website_url = null;
      }

      const { error } = await supabase.from('channels').insert([payload]);
      if (error) throw error;

      setMsg('✅ Canal creado correctamente.');
      // Reset
      setForm((s) => ({
        ...s,
        name: '',
        country: '',
        description: '',
        category: '',
        posterFile: null,
        stream_url: '', // 👈 reset del nuevo campo

        rokuEnabled: false,
        roku_link_url: '',
        youtubeEnabled: false,
        youtube_url: '',
        facebookEnabled: false,
        facebook_url: '',
        tiktokEnabled: false,
        tiktok_url: '',
        websiteEnabled: false,
        website_url: '',
      }));
    } catch (err) {
      setMsg(`❌ Error: ${err.message || String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-5 h-5 text-rose-400" />
        <h3 className="text-xl font-semibold">Alta de nuevo canal</h3>
      </div>

      {msg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            msg.startsWith('✅')
              ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-200'
              : 'bg-red-900/40 border border-red-700 text-red-200'
          }`}
        >
          {msg}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nombre */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Nombre del canal</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Ej. Vision M"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            required
          />
        </div>

        {/* País */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">País</label>
          <input
            name="country"
            value={form.country}
            onChange={onChange}
            placeholder="Ej. México"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            required
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Categoría</label>
          <input
            name="category"
            value={form.category}
            onChange={onChange}
            placeholder="Noticias / Entretenimiento / Música..."
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            required
          />
        </div>

        {/* 👇 NUEVO: M3U8 (stream_url) */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">M3U8 (URL del stream)</label>
          <input
            name="stream_url"
            value={form.stream_url}
            onChange={onChange}
            placeholder="https://tu-cdn.com/tu-canal/playlist.m3u8"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            required
          />
        </div>

        {/* Poster */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Póster</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 bg-gray-700/50 border border-gray-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-700">
              <Upload className="w-4 h-4" />
              <span>Subir imagen</span>
              <input
                type="file"
                accept="image/*"
                onChange={onChange}
                name="posterFile"
                className="hidden"
              />
            </label>
            <span className="text-xs text-gray-400 truncate max-w-[240px]">
              {form.posterFile ? form.posterFile.name : 'Sin archivo seleccionado'}
            </span>
          </div>
        </div>

        {/* Descripción (columna completa) */}
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-300 mb-1">Descripción del canal</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={3}
            placeholder="Describe brevemente el canal…"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>

        {/* ======= Roku ======= */}
        <div className="md:col-span-2 border-t border-gray-700 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              id="rokuEnabled"
              name="rokuEnabled"
              type="checkbox"
              checked={form.rokuEnabled}
              onChange={onChange}
              className="h-4 w-4"
            />
            <label htmlFor="rokuEnabled" className="text-sm text-gray-200 font-medium">
              Roku (usar ícono común y capturar URL del canal en Roku)
            </label>
          </div>
          {form.rokuEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">URL de Roku</label>
                <input
                  name="roku_link_url"
                  value={form.roku_link_url}
                  onChange={onChange}
                  placeholder="https://channelstore.roku.com/..."
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>
              <div className="text-xs text-gray-400 flex items-end">
                Ícono que se guardará: <span className="ml-2 underline break-all">{ICON_URLS.roku}</span>
              </div>
            </div>
          )}
        </div>

        {/* ======= Redes ======= */}
        <div className="md:col-span-2 border-t border-gray-700 pt-4 space-y-5">
          {/* YouTube */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="youtubeEnabled"
                name="youtubeEnabled"
                type="checkbox"
                checked={form.youtubeEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="youtubeEnabled" className="text-sm text-gray-200 font-medium">
                YouTube
              </label>
            </div>
            {form.youtubeEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="youtube_url"
                  value={form.youtube_url}
                  onChange={onChange}
                  placeholder="https://youtube.com/@tu-canal"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.youtube}</span>
                </div>
              </div>
            )}
          </div>

          {/* Facebook */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="facebookEnabled"
                name="facebookEnabled"
                type="checkbox"
                checked={form.facebookEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="facebookEnabled" className="text-sm text-gray-200 font-medium">
                Facebook
              </label>
            </div>
            {form.facebookEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="facebook_url"
                  value={form.facebook_url}
                  onChange={onChange}
                  placeholder="https://facebook.com/tu-pagina"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.facebook}</span>
                </div>
              </div>
            )}
          </div>

          {/* TikTok */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="tiktokEnabled"
                name="tiktokEnabled"
                type="checkbox"
                checked={form.tiktokEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="tiktokEnabled" className="text-sm text-gray-200 font-medium">
                TikTok
              </label>
            </div>
            {form.tiktokEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="tiktok_url"
                  value={form.tiktok_url}
                  onChange={onChange}
                  placeholder="https://www.tiktok.com/@tu-cuenta"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.tiktok}</span>
                </div>
              </div>
            )}
          </div>

          {/* Website */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                id="websiteEnabled"
                name="websiteEnabled"
                type="checkbox"
                checked={form.websiteEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="websiteEnabled" className="text-sm text-gray-200 font-medium">
                Sitio web
              </label>
            </div>
            {form.websiteEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="website_url"
                  value={form.website_url}
                  onChange={onChange}
                  placeholder="https://tusitio.com"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                <div className="text-xs text-gray-400 flex items-end">
                  Ícono: <span className="ml-2 underline break-all">{ICON_URLS.website}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-5 py-2.5 rounded-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            {submitting ? 'Guardando…' : 'Crear canal'}
          </button>
        </div>
      </form>
    </div>
  );
}
