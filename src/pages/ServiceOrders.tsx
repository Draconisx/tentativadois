import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Search, Printer, X } from 'lucide-react';

interface ServiceOrder {
  id: string;
  order_number: number;
  customer_name: string;
  street_name: string;
  number: string;
  neighborhood: string;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface OrderPrintData {
  order_number: number;
  street_name: string;
  number: string;
  neighborhood: string;
  items: { name: string; quantity: number; price: number }[];
  created_at: string;
  status: string;
}

export const ServiceOrders = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [printData, setPrintData] = useState<OrderPrintData | null>(null);

  // New Order Form State - removed customerName
  const [streetName, setStreetName] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ id: string; quantity: number; name: string; price: number }[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

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
        customer_name: 'Cliente Não Informado', // Default value since field was removed
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
      
      if (stockError) {
        const currentItem = inventory.find(i => i.id === item.id);
        if (currentItem) {
          await supabase
            .from('inventory')
            .update({ quantity: currentItem.quantity - item.quantity })
            .eq('id', item.id);
            
          await supabase.from('transactions').insert([{
            inventory_id: item.id,
            type: 'out',
            quantity: item.quantity
          }]);
        }
      }
    }

    // Prepare print data and show print modal
    setPrintData({
      order_number: order.order_number,
      street_name: order.street_name,
      number: order.number,
      neighborhood: order.neighborhood,
      items: selectedItems,
      created_at: order.created_at,
      status: order.status
    });
    
    setIsModalOpen(false);
    resetForm();
    fetchOrders();
    fetchInventory();
    setIsPrintModalOpen(true);
  };

  const resetForm = () => {
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

  const handlePrint = () => {
    window.print();
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_number.toString().includes(searchTerm)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ordens de Serviço</h1>
          <p className="text-slate-500 mt-1">Gerencie e gere ordens de serviço com itens do estoque.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          Nova Ordem
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por número ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">OS #{order.order_number}</h3>
                    <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                    order.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {order.status === 'pending' ? 'Pendente' : 
                     order.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{order.street_name}, {order.number}</p>
                      <p className="text-xs text-slate-500">{order.neighborhood}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setPrintData({
                        order_number: order.order_number,
                        street_name: order.street_name,
                        number: order.number,
                        neighborhood: order.neighborhood,
                        items: [],
                        created_at: order.created_at,
                        status: order.status
                      });
                      setIsPrintModalOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm"
                  >
                    <Printer size={16} />
                    Imprimir
                  </button>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      className="flex-1 py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      Concluir
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
              <div className="text-slate-400 mb-2">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-500">Nenhuma ordem de serviço encontrada.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal for New Order */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Nova Ordem de Serviço</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Address fields - removed customer name */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-600 rounded"></div>
                    Endereço
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Rua</label>
                      <input
                        type="text"
                        value={streetName}
                        onChange={(e) => setStreetName(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                      <input
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Selected Items */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-600 rounded"></div>
                    Itens Selecionados
                  </h3>
                  <div className="border border-slate-200 rounded-lg p-4 min-h-[100px]">
                    {selectedItems.length > 0 ? (
                      <div className="space-y-2">
                        {selectedItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-400 text-sm py-4">Nenhum item adicionado</p>
                    )}
                  </div>
                </div>

                {/* Available Inventory */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-green-600 rounded"></div>
                    Estoque Disponível
                  </h3>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {inventory.map((item) => {
                      const selected = selectedItems.find(i => i.id === item.id);
                      const available = item.quantity - (selected?.quantity || 0);
                      
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => available > 0 && handleAddItem(item)}
                          disabled={available <= 0}
                          className={`p-3 rounded-lg border text-left transition ${
                            available > 0 
                              ? 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50' 
                              : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">SKU: {item.sku} • Qtd: {item.quantity}</p>
                          <p className="text-xs font-medium text-indigo-600 mt-1">R$ {item.price.toFixed(2)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t mt-6 pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Gerar Ordem de Serviço
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && printData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center print:hidden">
              <h2 className="text-xl font-semibold text-slate-900">Ordem de Serviço #{printData.order_number}</h2>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div ref={printRef} className="p-8">
              {/* Print Header */}
              <div className="text-center mb-8 border-b pb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Ordem de Serviço</h1>
                <p className="text-slate-600">Número: #{printData.order_number}</p>
                <p className="text-sm text-slate-500">
                  Emitido em: {new Date(printData.created_at).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm">
                  Status: <span className={`font-medium ${
                    printData.status === 'pending' ? 'text-yellow-600' : 
                    printData.status === 'completed' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {printData.status === 'pending' ? 'Pendente' : 
                     printData.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </span>
                </p>
              </div>

              {/* Address Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Endereço
                </h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-900">
                    <span className="font-medium">Rua:</span> {printData.street_name}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-medium">Número:</span> {printData.number}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-medium">Bairro:</span> {printData.neighborhood}
                  </p>
                </div>
              </div>

              {/* Items Section */}
              {printData.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Itens
                  </h3>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left px-4 py-2 text-sm font-medium text-slate-700 border">Item</th>
                        <th className="text-center px-4 py-2 text-sm font-medium text-slate-700 border">Quantidade</th>
                        <th className="text-right px-4 py-2 text-sm font-medium text-slate-700 border">Preço Unit.</th>
                        <th className="text-right px-4 py-2 text-sm font-medium text-slate-700 border">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-slate-900 border">{item.name}</td>
                          <td className="px-4 py-2 text-sm text-slate-900 border text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-slate-900 border text-right">
                            R$ {item.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 border text-right">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-6 mt-6 text-center text-sm text-slate-500">
                <p>Obrigado pela preferência!</p>
              </div>
            </div>

            {/* Print Action Buttons - Hidden when printing */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Fechar
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Printer size={18} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0.bg-black\\/50,
          .print\\:hidden {
            display: none !important;
          }
          .fixed.inset-0.bg-black\\/50 .bg-white.rounded-xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            max-height: none;
            overflow: visible;
          }
          .fixed.inset-0.bg-black\\/50 .bg-white.rounded-xl > div:first-child {
            visibility: visible;
          }
          .fixed.inset-0.bg-black\\/50 .bg-white.rounded-xl > div:first-child > div {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
};
