import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  History, 
  Tags, 
  LogOut, 
  Menu, 
  Boxes,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  active: boolean;
}

const SidebarItem = ({ icon: Icon, label, path, active }: SidebarItemProps) => (
  <Link
    to={path}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
      active 
        ? "bg-indigo-600 text-white" 
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Estoque', path: '/inventory' },
    { icon: Tags, label: 'Categorias', path: '/categories' },
    { icon: FileText, label: 'Ordens de Serviço', path: '/service-orders' },
    { icon: History, label: 'Transações', path: '/transactions' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Boxes size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">StockFlow</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.path}
                {...item}
                active={location.pathname === item.path}
              />
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="px-4 py-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Usuário</p>
              <p className="text-sm truncate mt-1">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 lg:hidden">
          <div className="flex items-center gap-3">
            <Boxes size={24} className="text-indigo-600" />
            <span className="font-bold text-slate-900">StockFlow</span>
          </div>
          <button onClick={() => setIsOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
