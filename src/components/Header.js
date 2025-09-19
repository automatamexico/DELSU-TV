import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Search, Menu, ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = ({
  searchTerm,
  onSearchChange,
  onFilterChange,
  filters,
  // ✅ Declaramos onMenuClick como prop y le damos un no-op por defecto
  onMenuClick = () => {}
}) => {
  const [showFilters, setShowFilters] = React.useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <motion.header 
      className="bg-black/95 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="p-2 bg-gradient-to-r from-red-600 to-red-500 rounded-lg">
                <Tv className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">DELSU TV</h1>
                <p className="text-gray-400 text-sm">Canales Independientes</p>
              </div>
            </motion.div>
          </Link>

          <div className="flex items-center gap-4">
            {!user && (
              <Link to="/login" className="text-white hover:text-red-400">
                Iniciar Sesión
              </Link>
            )}

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar canales..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 rounded-full pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 w-64"
              />
            </div>

            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className="hidden md:flex items-center gap-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-full px-4"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              Filtros <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : 'rotate-0'}`} />
            </motion.button>

            {isAdmin && user && (
              <Link to="/dashboard">
                <motion.button
                  className="hidden md:flex items-center gap-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-full px-4"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </motion.button>
              </Link>
            )}

            {user && (
              <motion.button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-full px-4"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <LogOut className="w-5 h-5" />
                Salir
              </motion.button>
            )}

            {/* ✅ Botón móvil que llama a la prop onMenuClick */}
            <motion.button
              onClick={onMenuClick}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        <div className="md:hidden mt-4">
          {!user && (
            <Link to="/login" className="block text-center text-white hover:text-red-400 mb-4">
              Iniciar Sesión
            </Link>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar canales..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-full pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
            />
          </div>
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-full px-4 mt-2 w-full justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            Filtros <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : 'rotate-0'}`} />
          </motion.button>
          {isAdmin && user && (
            <Link to="/dashboard">
              <motion.button
                className="flex items-center gap-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-full px-4 mt-2 w-full justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </motion.button>
            </Link>
          )}
          {user && (
            <motion.button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-full px-4 mt-2 w-full justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-5 h-5" />
              Salir
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div>
                  <label htmlFor="country-filter" className="block text-gray-300 text-sm font-medium mb-1">País:</label>
                  <select
                    id="country-filter"
                    name="country"
                    value={filters.country}
                    onChange={handleFilterChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Todos los países</option>
                    <option value="México">México</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Colombia">Colombia</option>
                    <option value="España">España</option>
                    <option value="Chile">Chile</option>
                    <option value="Perú">Perú</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="language-filter" className="block text-gray-300 text-sm font-medium mb-1">Idioma:</label>
                  <select
                    id="language-filter"
                    name="language"
                    value={filters.language}
                    onChange={handleFilterChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Todos los idiomas</option>
                    <option value="Español">Español</option>
                    <option value="Inglés">Inglés</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;
