import { useEffect, useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { supabase } from '../lib/supabase';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trendValue}%
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    totalValue: 0,
    activeOrders: 0,
    chartData: []
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: inventory } = await supabase.from('inventory').select('*');
      const { data: orders } = await supabase.from('service_orders').select('*');

      const totalItems = inventory?.length || 0;
      const lowStock = inventory?.filter(item => item.quantity <= item.min_quantity).length || 0;
      const totalValue = inventory?.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0) || 0;
      const activeOrders = orders?.filter(o => o.status === 'pending').length || 0;

      // Mock chart data based on real item counts
      const chartData = [
        { name: 'Seg', stock: totalItems > 0 ? totalItems - 2 : 0, orders: 4 },
        { name: 'Ter', stock: totalItems > 0 ? totalItems - 1 : 0, orders: 3 },
        { name: 'Qua', stock: totalItems > 0 ? totalItems : 0, orders: 5 },
        { name: 'Qui', stock: totalItems > 0 ? totalItems + 1 : 0, orders: 2 },
        { name: 'Sex', stock: totalItems > 0 ? totalItems : 0, orders: 6 },
      ];

      setStats({
        totalItems,
        lowStock,
        totalValue,
        activeOrders,
        chartData: chartData as any
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500">Bem-vindo ao StockFlow. Aqui está o resumo do seu negócio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Produtos" 
          value={stats.totalItems} 
          icon={Package} 
          color="bg-indigo-600"
        />
        <StatCard 
          title="Valor em Estoque" 
          value={`R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          color="bg-emerald-600"
        />
        <StatCard 
          title="Estoque Baixo" 
          value={stats.lowStock} 
          icon={AlertTriangle} 
          color="bg-amber-600"
        />
        <StatCard 
          title="OS Pendentes" 
          value={stats.activeOrders} 
          icon={FileText} 
          color="bg-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Nível de Itens</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="stock" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Itens" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Ordens de Serviço</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} dot={{fill: '#10b981', strokeWidth: 2, r: 4}} activeDot={{r: 6}} name="Ordens" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;