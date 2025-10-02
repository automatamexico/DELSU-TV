// src/pages/LoginPage.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Globe, LogIn, UserPlus, Tv } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { countries } from '../data/countries';

const LoginPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, profile, loading: authLoading } = useAuth();

  // Para manejar la redirección una vez que el perfil esté cargado en el contexto
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const fromPath = location.state?.from?.pathname;

  // signIn compatible con signIn({ email, password }) y signIn(email, password)
  const safeSignIn = async (emailArg, passwordArg) => {
    try {
      await signIn({ email: emailArg, password: passwordArg });
    } catch {
      await signIn(emailArg, passwordArg);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emailSanitized = email.trim().toLowerCase();
      await safeSignIn(emailSanitized, password);
      // No navegamos aún; esperamos a que AuthContext termine de cargar el perfil
      setPendingRedirect(true);
    } catch (error) {
      window.alert('Error al iniciar sesión: ' + (error?.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  // Redirección centralizada: cuando ya hay user/profile y dejó de cargar
  useEffect(() => {
    if (!pendingRedirect) return;
    if (authLoading) return;         // Espera a que AuthContext termine
    if (!user) return;               // Si no hay user, no navegues aún

    // 1) Si venías de una ruta protegida, regresa ahí
    if (fromPath) {
      navigate(fromPath, { replace: true });
    } else {
      // 2) Si es admin -> dashboard; si no, inicio
      if (profile?.role === 'admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
    setPendingRedirect(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRedirect, authLoading, user, profile, fromPath, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emailSanitized = email.trim().toLowerCase();

      // Validación simple de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailSanitized)) {
        window.alert('Correo inválido. Revisa que tenga el formato correcto (ej: nombre@dominio.com).');
        return;
      }

      // Contraseña mínima 6 para alinear con placeholder y Supabase por defecto
      if (password.length < 6) {
        window.alert('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      // signUp compatible con objeto o parámetros sueltos
      try {
        await signUp({ email: emailSanitized, password, fullName, country });
      } catch {
        await signUp(emailSanitized, password, fullName, country);
      }

      setIsRegistering(false);
      window.alert('Registro exitoso. Revisa tu correo si requiere confirmación.');
    } catch (error) {
      window.alert('Error al registrarse: ' + (error?.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 shadow-2xl w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <Tv className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          {isRegistering ? 'Regístrate' : 'Inicia Sesión'}
        </h2>

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
          {isRegistering && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <label htmlFor="fullName" className="block text-gray-300 text-sm font-medium mb-2">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: isRegistering ? 0.2 : 0 }}>
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-2">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ejemplo@dominio.com"
                required
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: isRegistering ? 0.3 : 0.1 }}>
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Min 6 caracteres"
                required
              />
            </div>
          </motion.div>

          {isRegistering && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
              <label htmlFor="country" className="block text-gray-300 text-sm font-medium mb-2">País</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Selecciona tu país</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Procesando...' : (
              isRegistering ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  Registrarme
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </>
              )
            )}
          </motion.button>
        </form>

        <motion.p
            className="text-center text-gray-400 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: isRegistering ? 0.5 : 0.3 }}
          >
          {isRegistering ? (
            <>
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-red-500 hover:text-red-400 font-semibold"
              >
                Inicia Sesión
              </button>
            </>
          ) : (
            <>
              ¿No tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-red-500 hover:text-red-400 font-semibold"
              >
                Regístrate aquí
              </button>
            </>
          )}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
