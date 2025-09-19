// src/pages/LoginPage.jsx
import React, { useState } from 'react';
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
  const [userType, setUserType] = useState('user');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();

  // ✅ Helper: intenta ambas firmas de signIn sin que tengas que modificar tu AuthContext
  const safeSignIn = async (emailArg, passwordArg) => {
    // 1) Primero intenta con objeto
    try {
      await signIn({ email: emailArg, password: passwordArg });
      return;
    } catch (e1) {
      // 2) Si falla, intenta con parámetros sueltos
      try {
        await signIn(emailArg, passwordArg);
        return;
      } catch (e2) {
        // Lanza el error real de la segunda llamada
        throw e2;
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await safeSignIn(email, password);

      // Si ProtectedRoute te mandó aquí, vuelve a donde ibas:
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Si no hay "from", usa tu lógica de tipo de usuario:
      if (userType === 'admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      window.alert('Error al iniciar sesión: ' + (error?.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validación básica de contraseña
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{6,12}$/;
      if (!passwordRegex.test(password)) {
        window.alert('La contraseña debe tener entre 6 y 12 caracteres, y contener al menos una letra y un número.');
        return;
      }

      // Firma flexible también para signUp si tu contexto usa objeto
      try {
        await signUp({ email, password, fullName, country });
      } catch {
        await signUp(email, password, fullName, country);
      }

      setIsRegistering(false);
      window.alert('Registro exitoso. Verifica tu email para confirmar.');
    } catch (error) {
      window.alert('Error al registrarse: ' + (error?.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: isRegistering ? 0.2 : 0 }}
          >
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: isRegistering ? 0.3 : 0.1 }}
          >
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Mín. 6, Máx. 12 caracteres alfanuméricos"
                required
              />
            </div>
          </motion.div>

          {isRegistering && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
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

          {!isRegistering && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <label htmlFor="userType" className="block text-gray-300 text-sm font-medium mb-2">Tipo de Acceso</label>
              <select
                id="userType"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
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
