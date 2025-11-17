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

export default function Dashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch metrics every 2 seconds
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/metrics');
        const data = await response.json();
        setMetrics(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchMetrics();

    // Then fetch every 2 seconds
    const interval = setInterval(fetchMetrics, 2000);

    // Cleanup on unmount
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
        <h1 className="text-4xl font-bold mb-2">JARVIS System Monitor</h1>
        <p className="text-gray-400">Real-time system metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* CPU Usage */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-gray-400 text-sm mb-2">CPU Usage</h3>
          <p className="text-3xl font-bold">{metrics.cpu_usage.toFixed(1)}%</p>
          <p className="text-gray-500 text-sm mt-2">{metrics.cpu_count} cores</p>
        </div>

        {/* Memory Used */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-gray-400 text-sm mb-2">Memory Used</h3>
          <p className="text-3xl font-bold">{metrics.memory_used_gb.toFixed(1)} GB</p>
          <p className="text-gray-500 text-sm mt-2">
            of {metrics.memory_total_gb.toFixed(1)} GB
          </p>
        </div>

        {/* Memory Usage % */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-gray-400 text-sm mb-2">Memory Usage</h3>
          <p className="text-3xl font-bold">{metrics.memory_usage_percent.toFixed(1)}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics.memory_usage_percent}%` }}
            />
          </div>
        </div>

        {/* Memory Available */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-gray-400 text-sm mb-2">Memory Available</h3>
          <p className="text-3xl font-bold">{metrics.memory_available_gb.toFixed(1)} GB</p>
          <p className="text-gray-500 text-sm mt-2">Free memory</p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-gray-500 text-sm text-center">
        Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}