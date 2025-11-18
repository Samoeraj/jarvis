'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SystemMetrics {
  memory_total_gb: number;
  memory_used_gb: number;
  memory_available_gb: number;
  memory_usage_percent: number;
  cpu_usage: number;
  cpu_count: number;
  timestamp: string;
}

interface HistoryPoint {
  time: string;
  cpu: number;
  memory: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/metrics');
        const data = await response.json();
        setMetrics(data);
        setLoading(false);

        // Add to history (keep last 30 data points = 60 seconds)
        const timestamp = new Date(data.timestamp);
        const timeString = timestamp.toLocaleTimeString();
        
        setHistory((prev) => {
          const newHistory = [
            ...prev,
            {
              time: timeString,
              cpu: parseFloat(data.cpu_usage.toFixed(1)),
              memory: parseFloat(data.memory_usage_percent.toFixed(1)),
            },
          ];
          
          // Keep only last 30 points
          return newHistory.slice(-30);
        });
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading JARVIS...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-2xl">Failed to load metrics</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🤖 JARVIS System Monitor</h1>
        <p className="text-gray-400">Real-time system metrics dashboard</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* CPU Usage */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
          <h3 className="text-gray-400 text-sm mb-2">CPU Usage</h3>
          <p className="text-3xl font-bold text-blue-400">{metrics.cpu_usage.toFixed(1)}%</p>
          <p className="text-gray-500 text-sm mt-2">{metrics.cpu_count} cores</p>
        </div>

        {/* Memory Used */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors">
          <h3 className="text-gray-400 text-sm mb-2">Memory Used</h3>
          <p className="text-3xl font-bold text-green-400">{metrics.memory_used_gb.toFixed(1)} GB</p>
          <p className="text-gray-500 text-sm mt-2">
            of {metrics.memory_total_gb.toFixed(1)} GB
          </p>
        </div>

        {/* Memory Usage % */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
          <h3 className="text-gray-400 text-sm mb-2">Memory Usage</h3>
          <p className="text-3xl font-bold text-purple-400">{metrics.memory_usage_percent.toFixed(1)}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics.memory_usage_percent}%` }}
            />
          </div>
        </div>

        {/* Memory Available */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors">
          <h3 className="text-gray-400 text-sm mb-2">Memory Available</h3>
          <p className="text-3xl font-bold text-yellow-400">{metrics.memory_available_gb.toFixed(1)} GB</p>
          <p className="text-gray-500 text-sm mt-2">Free memory</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* CPU History Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4">CPU Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                stroke="#60A5FA" 
                strokeWidth={2}
                name="CPU %"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Memory History Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4">Memory Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="memory" 
                stroke="#34D399" 
                strokeWidth={2}
                name="Memory %"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-gray-500 text-sm text-center">
        Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}