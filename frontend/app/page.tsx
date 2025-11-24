'use client';

import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import VoiceInterface from '../components/VoiceInterface';

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
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectWebSocket = () => {
      // Don't connect if component is unmounted
      if (!isMounted) return;

      ws = new WebSocket('ws://localhost:8000/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        if (isMounted) {
          setConnected(true);
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;

        try {
          const data: SystemMetrics = JSON.parse(event.data);
          setMetrics(data);

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
            return newHistory.slice(-30);
          });
        } catch (error) {
          console.error('Failed to parse metrics:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        if (isMounted) {
          setConnected(false);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        if (isMounted) {
          setConnected(false);
          // Only reconnect if component is still mounted
          reconnectTimeout = setTimeout(() => {
            if (isMounted) {
              console.log('🔄 Attempting to reconnect...');
              connectWebSocket();
            }
          }, 3000);
        }
      };
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      isMounted = false;

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (ws) {
        ws.close();
      }
    };
  }, []); // Empty dependency array - only run once

  if (!connected && !metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Connecting to JARVIS...</div>
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">🤖 JARVIS System Monitor</h1>
          <p className="text-gray-400">Real-time system metrics via WebSocket</p>
        </div>
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Voice Interface */}
      <div className="mb-8">
        <VoiceInterface />
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