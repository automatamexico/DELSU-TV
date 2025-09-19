import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Tv, LayoutDashboard, List, X, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChannels } from '../hooks/useChannels';
import ChannelAnalytics from '../components/ChannelAnalytics';
import { categories } from '../data/channels';

const DashboardPage = () => {
  const { profile } = useAuth();
  const userRole = profile?.role;
  const navigate = useNavigate();
  const { 
    allChannels: channels, 
    addChannel, 
    deleteChannel, 
    updateChannel, 
    loading: channelsLoading 
  } = useChannels(userRole);

  const [newChannel, setNewChannel] = useState({
    name: '',
    country: '',
    description: '',
    poster: '',
    streamUrl: '',
    category: '',
    language: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewChannel(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingChannel(prev => ({ ...prev, [name]: value }));
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if (newChannel.name && newChannel.streamUrl && newChannel.poster) {
      const channelData = {
        ...newChannel,
        category: newChannel.category || 'Otros',
        language: newChannel.language || 'Español'
      };
      await addChannel(channelData);
      setNewChannel({
        name: '',
        country: '',
        description: '',
        poster: '',
        streamUrl: '',
        category: '',
        language: ''
      });
      setShowAddForm(false);
    } else {
      alert('Por favor, completa al menos el nombre, URL del stream y URL del póster.');
    }
  };

  const handleEditChannel = async (channel) => {
    setEditingChannel({ ...channel });
    setShowEditForm(true);
  };

  const handleUpdateChannel = async (e) => {
    e.preventDefault();
    await updateChannel(editingChannel.id, editingChannel);
    setShowEditForm(false);
    setEditingChannel(null);
  };

  const handleDeleteChannel = async (channelId) => {
    if (confirm('¿Estás seguro de que quieres eliminar este canal?')) {
      await deleteChannel(channelId);
    }
  };

  if (userRole !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen">Acceso denegado. Solo administradores.</div>;
  }

  if (channelsLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <motion.header 
        className="bg-black/95 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-50 py-4"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-red-600 to-red-500 rounded-lg">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">DELSU TV Dashboard</h1>
              <p className="text-gray-400 text-sm">Gestiona tus canales</p>
            </div>
          </div>
          <motion.button
            onClick={() => navigate('/')}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white px-4 py-2 rounded-full flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Tv className="w-5 h-5" />
            Ir a DELSU TV
          </motion.button>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Analytics Section */}
        <ChannelAnalytics />

        {/* Channels Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <List className="w-6 h-6" />
              Canales Actuales ({channels.length})
            </h2>
            <motion.button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PlusCircle className="w-5 h-5" />
              {showAddForm ? 'Cerrar Formulario' : 'Agregar Nuevo Canal'}
            </motion.button>
          </div>

          {/* Add Channel Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                onSubmit={handleAddChannel}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden"
              >
                <div className="col-span-full">
                  <h3 className="text-xl font-semibold text-white mb-4">Detalles del Nuevo Canal</h3>
                </div>
                <div>
                  <label htmlFor="name" className="block text-gray-300 text-sm font-medium mb-1">Nombre del Canal:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newChannel.name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: Mi Canal de Noticias"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="streamUrl" className="block text-gray-300 text-sm font-medium mb-1">URL del Stream (M3U8):</label>
                  <input
                    type="url"
                    id="streamUrl"
                    name="streamUrl"
                    value={newChannel.streamUrl}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: https://ejemplo.com/stream.m3u8"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="poster" className="block text-gray-300 text-sm font-medium mb-1">URL del Póster:</label>
                  <input
                    type="url"
                    id="poster"
                    name="poster"
                    value={newChannel.poster}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: https://ejemplo.com/poster.jpg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-gray-300 text-sm font-medium mb-1">País:</label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={newChannel.country}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: México"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-gray-300 text-sm font-medium mb-1">Categoría:</label>
                  <select
                    id="category"
                    name="category"
                    value={newChannel.category}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.filter(cat => cat !== 'Todos').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="language" className="block text-gray-300 text-sm font-medium mb-1">Idioma:</label>
                  <input
                    type="text"
                    id="language"
                    name="language"
                    value={newChannel.language}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: Español"
                  />
                </div>
                <div className="col-span-full">
                  <label htmlFor="description" className="block text-gray-300 text-sm font-medium mb-1">Descripción:</label>
                  <textarea
                    id="description"
                    name="description"
                    value={newChannel.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Una breve descripción del canal..."
                  ></textarea>
                </div>
                <div className="col-span-full flex justify-end">
                  <motion.button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PlusCircle className="w-5 h-5" />
                    Guardar Canal
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Edit Channel Form */}
          <AnimatePresence>
            {showEditForm && editingChannel && (
              <motion.form
                onSubmit={handleUpdateChannel}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden"
              >
                <div className="col-span-full">
                  <h3 className="text-xl font-semibold text-white mb-4">Editar Canal</h3>
                </div>
                <div>
                  <label htmlFor="edit-name" className="block text-gray-300 text-sm font-medium mb-1">Nombre del Canal:</label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={editingChannel.name}
                    onChange={handleEditInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-streamUrl" className="block text-gray-300 text-sm font-medium mb-1">URL del Stream (M3U8):</label>
                  <input
                    type="url"
                    id="edit-streamUrl"
                    name="streamUrl"
                    value={editingChannel.streamUrl}
                    onChange={handleEditInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-poster" className="block text-gray-300 text-sm font-medium mb-1">URL del Póster:</label>
                  <input
                    type="url"
                    id="edit-poster"
                    name="poster"
                    value={editingChannel.poster}
                    onChange={handleEditInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-country" className="block text-gray-300 text-sm font-medium mb-1">País:</label>
                  <input
                    type="text"
                    id="edit-country"
                    name="country"
                    value={editingChannel.country}
                    onChange={handleEditInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-category" className="block text-gray-300 text-sm font-medium mb-1">Categoría:</label>
                  <select
                    id="edit-category"
                    name="category"
                    value={editingChannel.category}
                    onChange={handleEditInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.filter(cat => cat !== 'Todos').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-language" className="block text-gray-300 text-sm font-medium mb-1">Idioma:</label>
                  <input
                    type="text"
                    id="edit-language"
                    name="language"
                    value={editingChannel.language}
                    onChange={handleEditInputChange}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="col-span-full">
                  <label htmlFor="edit-description" className="block text-gray-300 text-sm font-medium mb-1">Descripción:</label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={editingChannel.description || ''}
                    onChange={handleEditInputChange}
                    rows="3"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  ></textarea>
                </div>
                <div className="col-span-full flex justify-end gap-2">
                  <motion.button
                    type="button"
                    onClick={() => { setShowEditForm(false); setEditingChannel(null); }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Edit className="w-4 h-4" />
                    Actualizar Canal
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Channels List */}
          <div className="space-y-4">
            {channels.map((channel) => (
              <motion.div
                key={channel.id}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <img src={channel.poster} alt={channel.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                <div className="flex-grow">
                  <h3 className="text-lg font-bold text-white">{channel.name}</h3>
                  <p className="text-gray-400 text-sm">{channel.country} | {channel.category} | {channel.language}</p>
                  <p className="text-gray-500 text-xs line-clamp-1">{channel.description}</p>
                </div>
                <motion.button
                  onClick={() => handleEditChannel(channel)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </motion.button>
                <motion.button
                  onClick={() => handleDeleteChannel(channel.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                  Eliminar
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardPage;