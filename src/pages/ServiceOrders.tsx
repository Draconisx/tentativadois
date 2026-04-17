import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Search, 
  FileText, 
  MapPin, 
  User, 
  X,
  CheckCircle2,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface ServiceOrder {
  id: string;
  order_number: number;
  customer_name: string;
  street_name: string;
  number: string;
  neighborhood: string;
  status: 'pending' | 'completed' | 'cancelled';
  total_price: number;
  created_at: string;
}

export const ServiceOrders = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Order Form State
  const [customerName, setCustomerName] = useState('');
  const [streetName, setStreetName] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ id: string; quantity: number; name: string; price: number }[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching orders:', error);
    else setOrders(data || []);
    setLoading(false);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, sku, price, quantity')
      .gt('quantity', 0);

    if (error) console.error('Error fetching inventory:', error);
    else setInventory(data || []);
  };

  const handleAddItem = (item: InventoryItem) => {
    const existing = selectedItems.find(i => i.id === item.id);
    if (existing) {
      if (existing.quantity < item.quantity) {
        setSelectedItems(selectedItems.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ));
      }
    } else {
      setSelectedItems([...selectedItems, { id: item.id, quantity: 1, name: item.name, price: item.price }]);
    }
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um item do estoque.');
      return;
    }

    const totalPrice = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .insert([{
        customer_name: customerName,
        street_name: streetName,
        number: number,
        neighborhood: neighborhood,
        total_price: totalPrice,
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) {
      alert('Erro ao criar ordem de serviço: ' + orderError.message);
      return;
    }

    const orderItems = selectedItems.map(item => ({
      service_order_id: order.id,
      inventory_id: item.id,
      quantity: item.quantity,
      unit_price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('service_order_items')
      .insert(orderItems);

    if (itemsError) {
      alert('Erro ao adicionar itens à ordem: ' + itemsError.message);
      return;
    }

    // Update stock levels
    for (const item of selectedItems) {
      const { error: stockError } = await supabase.rpc('decrement_inventory', {
        row_id: item.id,
        dec_amount: item.quantity
      });
      
      // Fallback if RPC doesn't exist (manual update)
      if (stockError) {
        const currentItem = inventory.find(i => i.id === item.id);
        if (currentItem) {
          await supabase
            .from('inventory')
            .update({ quantity: currentItem.quantity - item.quantity })
            .eq('id', item.id);
            
          // Add transaction record
          await supabase.from('transactions').insert([{
            inventory_id: item.id,
            type: 'out',
            quantity: item.quantity
          }]);
        }
      }
    }

    setIsModalOpen(false);
    resetForm();
    fetchOrders();
    fetchInventory();
  };

  const resetForm = () => {
    setCustomerName('');
    setStreetName('');
    setNumber('');
    setNeighborhood('');
    setSelectedItems([]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ordem?')) return;
    
    const { error } = await supabase
      .from('service_orders')
      .delete()
      .eq('id', id);

    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchOrders();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('service_orders')
      .update({ status })
      .eq('id', id);

    if (error) alert('Erro ao atualizar: ' + error.message);
    else fetchOrders();
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_number.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ordens de Serviço</h1>
          <p className="text-slate-500 mt-1">Gerencie e gere ordens de serviço com itens do estoque.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Nova Ordem
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por cliente ou número da ordem..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-xl text-slate-600">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">OS #{order.order_number}</h3>
                      <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    order.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                    order.status === 'cancelled' ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  )}>
                    {order.status === 'pending' ? 'Pendente' : 
                     order.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-600">
                    <User size={18} className="text-slate-400" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-600">
                    <MapPin size={18} className="text-slate-400 mt-1 shrink-0" />
                    <span className="text-sm leading-tight">
                      {order.street_name}, {order.number} - {order.neighborhood}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-lg font-bold text-indigo-600">
                    R$ {order.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'completed')}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Marcar como concluída"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(order.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="lg:col-span-2 py-20 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-lg">Nenhuma ordem de serviço encontrada.</p>
              <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-600 font-semibold hover:underline">
                Criar primeira ordem
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal for New Order */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900">Nova Ordem de Serviço</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 border-l-4 border-indigo-600 pl-3">Dados do Cliente</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Cliente / Empresa</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Rua</label>
                        <input
                          required
                          type="text"
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          value={streetName}
                          onChange={(e) => setStreetName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Número</label>
                        <input
                          required
                          type="text"
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Bairro</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 border-l-4 border-indigo-600 pl-3 pt-4">Itens Selecionados</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedItems.length > 0 ? (
                      selectedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        Nenhum item adicionado
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 border-l-4 border-indigo-600 pl-3">Estoque Disponível</h3>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Filtrar estoque..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2 h-[450px] overflow-y-auto pr-2">
                    {inventory.map((item) => {
                      const selected = selectedItems.find(i => i.id === item.id);
                      const available = item.quantity - (selected?.quantity || 0);
                      
                      return (
                        <div key={item.id} className="p-3 border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</p>
                              <p className="text-xs text-slate-500">SKU: {item.sku} • Qtd: {item.quantity}</p>
                              <p className="text-sm font-bold text-slate-700 mt-1">R$ {item.price.toFixed(2)}</p>
                            </div>
                            <button
                              type="button"
                              disabled={available <= 0}
                              onClick={() => handleAddItem(item)}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                available <= 0 
                                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                  : "bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                              )}
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Total da Ordem</p>
                <p className="text-3xl font-bold text-indigo-600">
                  R$ {selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
                >
                  Gerar Ordem de Serviço
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;