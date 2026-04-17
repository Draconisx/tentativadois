import { useEffect, useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter,
  Calendar,
  Download,
  Loader2,
  Trash2
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../lib/supabase';

interface Transaction {
  id: string;
  type: 'in' | 'out';
  item: string;
  sku: string;
  quantity: number;
  date: string;
  user: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*, inventory(name, sku)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: Transaction[] = (data || []).map(tx => ({
        id: tx.id,
        type: tx.type,
        item: tx.inventory?.name || 'Item Desconhecido',
        sku: tx.inventory?.sku || 'N/A',
        quantity: tx.quantity,
        date: new Date(tx.created_at).toLocaleString('pt-BR'),
        user: 'Administrador',
        status: 'completed'
      }));

      setTransactions(formattedData);
    } catch (err: any) {
      console.error('Error fetching transactions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro de transação?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchTransactions();
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium">Carregando transações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Histórico de Transações</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhe toda a movimentação de entrada e saída do estoque.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-semibold">
            <Download size={18} />
            Exportar Log
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por item, SKU ou usuário..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm">
              <Calendar size={18} />
              <span>Últimos 30 dias</span>
            </button>
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data e Hora</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalhes do Item</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantidade</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{tx.date}</td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-1.5 font-medium text-sm",
                        tx.type === 'in' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {tx.type === 'in' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {tx.type === 'in' ? 'Entrada' : 'Saída'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{tx.item}</div>
                        <div className="text-xs text-slate-500">SKU: {tx.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold",
                        tx.type === 'in' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{tx.user}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma transação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;