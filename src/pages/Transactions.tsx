import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: string;
  inventory_id: string;
  type: 'in' | 'out';
  quantity: number;
  created_at: string;
  inventory?: {
    name: string;
    sku: string;
  };
}

export const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        inventory:inventory_id (
          name,
          sku
        )
      `)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching transactions:', error);
    else setTransactions(data || []);
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Transações</h1>
        <p className="text-slate-500 mt-1">Histórico de movimentações de estoque</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Tipo</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Produto</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">SKU</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Quantidade</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Data</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'in' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {transaction.type === 'in' ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )}
                      {transaction.type === 'in' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {transaction.inventory?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {transaction.inventory?.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{transaction.quantity}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              Nenhuma transação encontrada.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
