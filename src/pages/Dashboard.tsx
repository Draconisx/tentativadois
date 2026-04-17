import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, FileText, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalInventory: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockItems: number;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalInventory: 0,
    totalOrders: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [inventoryRes, ordersRes] = await Promise.all([
        supabase.from('inventory').select('id, quantity'),
        supabase.from('service_orders').select('id, status'),
      ]);

      const inventory = inventoryRes.data || [];
      const orders = ordersRes.data || [];

      const totalInventory = inventory.reduce((acc, item) => acc + (item.quantity || 0), 0);
      const lowStockItems = inventory.filter(item => (item.quantity || 0) < 5).length;
      const pendingOrders = orders.filter(order => order.status === 'pending').length;

      setStats({
        totalInventory,
        totalOrders: orders.length,
        pendingOrders,
        lowStockItems,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: Package, label: 'Total em Estoque', value: stats.totalInventory, color: 'bg-blue-500' },
    { icon: FileText, label: 'Total de Ordens', value: stats.totalOrders, color: 'bg-green-500' },
    { icon: AlertCircle, label: 'Ordens Pendentes', value: stats.pendingOrders, color: 'bg-yellow-500' },
    { icon: TrendingUp, label: 'Estoque Baixo', value: stats.lowStockItems, color: 'bg-red-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral do seu estoque e ordens</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
