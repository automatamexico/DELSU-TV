import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar as CalendarIcon, Search, BarChart2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { channels } from '../data/channels'; // Assuming channels data is available

// Mock data for channel views
const generateMockViews = (channelId, startDate, endDate) => {
  const data = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    data.push({
      date: currentDate.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 1000) + 100, // Random views between 100 and 1100
      channelId: channelId
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return data;
};

const ChannelAnalytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'day', 'week', 'month'
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  // Generate mock data for all channels for the selected period
  const allChannelsViews = useMemo(() => {
    const allData = {};
    channels.forEach(channel => {
      allData[channel.id] = generateMockViews(channel.id, startDate, endDate);
    });
    return allData;
  }, [startDate, endDate]);

  // Prepare data for the chart
  const chartData = useMemo(() => {
    if (selectedChannelId) {
      return allChannelsViews[selectedChannelId] || [];
    } else {
      // Aggregate views for all channels if no specific channel is selected
      const aggregated = {};
      Object.values(allChannelsViews).forEach(channelData => {
        channelData.forEach(dayData => {
          if (!aggregated[dayData.date]) {
            aggregated[dayData.date] = { date: dayData.date, views: 0 };
          }
          aggregated[dayData.date].views += dayData.views;
        });
      });
      return Object.values(aggregated).sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  }, [allChannelsViews, selectedChannelId]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    const today = new Date();
    let newStartDate = new Date();
    if (period === 'week') {
      newStartDate.setDate(today.getDate() - 7);
    } else if (period === 'month') {
      newStartDate.setMonth(today.getMonth() - 1);
    } else { // day
      newStartDate = today;
    }
    setStartDate(newStartDate);
    setEndDate(today);
  };

  const handleSearch = () => {
    const foundChannel = channels.find(channel =>
      channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSelectedChannelId(foundChannel ? foundChannel.id : null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-lg"
    >
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <BarChart2 className="w-6 h-6" />
        Estadísticas de Visualizaciones
      </h2>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <motion.button
            onClick={() => handlePeriodChange('day')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${selectedPeriod === 'day' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Último Día
          </motion.button>
          <motion.button
            onClick={() => handlePeriodChange('week')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${selectedPeriod === 'week' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Última Semana
          </motion.button>
          <motion.button
            onClick={() => handlePeriodChange('month')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${selectedPeriod === 'month' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Último Mes
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            className="bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500 w-32"
            dateFormat="yyyy-MM-dd"
          />
          <span className="text-gray-300">-</span>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            className="bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500 w-32"
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar canal por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-md pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <motion.button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 w-full md:w-auto justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Search className="w-5 h-5" />
          Buscar
        </motion.button>
        {selectedChannelId && (
          <motion.button
            onClick={() => { setSearchTerm(''); setSelectedChannelId(null); }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-md flex items-center gap-2 w-full md:w-auto justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5" />
            Limpiar
          </motion.button>
        )}
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
            <XAxis dataKey="date" stroke="#cbd5e0" />
            <YAxis stroke="#cbd5e0" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#a0aec0' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#ef4444"
              activeDot={{ r: 8 }}
              name={selectedChannelId ? channels.find(c => c.id === selectedChannelId)?.name || 'Canal' : 'Vistas Totales'}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default ChannelAnalytics;