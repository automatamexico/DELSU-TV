import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useViews = (channelId, startDate, endDate) => {
  const [viewsData, setViewsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViews();
  }, [channelId, startDate, endDate]);

  const fetchViews = async () => {
    if (!channelId) {
      setViewsData([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('views')
      .select('date, views_count')
      .eq('channel_id', channelId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching views:', error);
      setViewsData([]);
    } else {
      // Transform data for chart
      const transformed = (data || []).map(item => ({
        date: item.date,
        views: item.views_count
      }));
      setViewsData(transformed);
    }
    setLoading(false);
  };

  const addView = async (channelId, date, viewsCount = 1) => {
    const { error } = await supabase
      .from('views')
      .upsert({
        channel_id: channelId,
        date: date,
        views_count: viewsCount
      });

    if (error) {
      console.error('Error adding view:', error);
    } else {
      fetchViews(); // Refetch to update
    }
  };

  return { viewsData, loading, addView, refetch: fetchViews };
};