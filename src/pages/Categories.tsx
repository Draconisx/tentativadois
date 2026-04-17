import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Folder,
  Box,
  ChevronRight,
  Loader2,
  X,
  Trash2,
  Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Category {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  color: string;
}

export const Categories = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'bg-indigo-500'
  });

  const colors = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 
    'bg-amber-500', 'bg-sky-500', 'bg-violet-500'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*');

      if (catError) throw catError;

      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('category_id');

      if (invError) throw invError;

      const counts = (invData || []).reduce((acc: any, item: any) => {
        acc[item.category_id] = (acc[item.category_id] || 0) + 1;
        return acc;
      }, {});

      const formattedData: Category[] = (catData || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        itemCount: counts[cat.id] || 0,
        color: cat.color || 'bg-indigo-500'
      }));

      setCategories(formattedData);
    } catch (err: any) {
      console.error('Error fetching categories:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('categories')
      .insert([formData]);

    if (error) {
      alert('Erro ao adicionar categoria: ' + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ name: '', description: '', color: 'bg-indigo-500' });
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Isso pode afetar produtos vinculados.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchCategories();
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium">Carregando categorias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>
          <p className="text-slate-500 text-sm mt-1">Organize seu estoque em grupos significativos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus size={18} />
          <span className="text-sm font-semibold">Nova Categoria</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar categorias..." 
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-xl bg-opacity-10 flex items-center justify-center", cat.color.replace('bg-', 'text-'))}>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", cat.color)}>
                  <Folder size={24} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900">{cat.name}</h3>
            <p className="text-slate-500 text-sm mt-1 line-clamp-2">{cat.description}</p>
            
            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Box size={16} />
                <span className="text-sm font-medium">{cat.itemCount} Itens</span>
              </div>
              <button className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1 group/btn">
                Ver Itens
                <ChevronRight size={16} className="transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={() => setIsModalOpen(true)}
          className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all min-h-[240px]"
        >
          <div className="p-3 rounded-full bg-slate-50 border border-slate-100">
            <Plus size={24} />
          </div>
          <span className="font-semibold">Adicionar Nova Categoria</span>
        </button>
      </div>

      {/* Modal Nova Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Nova Categoria</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Categoria</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cor Visual</label>
                <div className="flex gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({...formData, color})}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all border-2",
                        color,
                        formData.color === color ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "border-transparent"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Save size={18} />
                  Criar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;