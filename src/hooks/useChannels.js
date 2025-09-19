import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export const useChannels = (userRole) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [filters, setFilters] = useState({
    country: '',
    language: ''
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    let query = supabase.from('channels').select('*').order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching channels:', error);
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  };

  const addChannel = async (newChannelData) => {
    if (userRole !== 'admin') return;

    const { data, error } = await supabase
      .from('channels')
      .insert([{
        ...newChannelData,
        created_by: supabase.auth.getUser()?.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding channel:', error);
    } else {
      setChannels(prev => [data, ...prev]);
    }
  };

  const deleteChannel = async (channelId) => {
    if (userRole !== 'admin') return;

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (error) {
      console.error('Error deleting channel:', error);
    } else {
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
    }
  };

  const updateChannel = async (channelId, updates) => {
    if (userRole !== 'admin') return;

    const { data, error } = await supabase
      .from('channels')
      .update(updates)
      .eq('id', channelId)
      .select()
      .single();

    if (error) {
      console.error('Error updating channel:', error);
    } else {
      setChannels(prev => prev.map(channel => 
        channel.id === channelId ? data : channel
      ));
    }
  };

  const filteredChannels = useMemo(() => {
    let filtered = channels;

    // Filter by category
    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter(channel => channel.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(channel =>
        channel.name.toLowerCase().includes(search) ||
        channel.description?.toLowerCase().includes(search) ||
        channel.category.toLowerCase().includes(search)
      );
    }

    // Filter by country
    if (filters.country) {
      filtered = filtered.filter(channel => channel.country === filters.country);
    }

    // Filter by language
    if (filters.language) {
      filtered = filtered.filter(channel => channel.language === filters.language);
    }

    return filtered;
  }, [channels, searchTerm, selectedCategory, filters]);

  const handleFilterChange = (name, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  return {
    channels: filteredChannels,
    allChannels: channels,
    loading,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    filters,
    handleFilterChange,
    addChannel,
    deleteChannel,
    updateChannel,
    refetch: fetchChannels
  };
};