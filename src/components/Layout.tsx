import { ReactNode } from "react";
import { User } from "../types";
import { LogOut, Truck, ShieldCheck, Map, LayoutGrid, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
}

export function Layout({ user, onLogout, children }: LayoutProps) {
  const location = useLocation();

  const leftNav = {
    admin: [
      { name: 'Flota', path: '/fleet', icon: LayoutGrid },
    ],
    call_center: [
      { name: 'Monitoreo', path: '/monitoring', icon: Map },
      { name: 'Flota', path: '/fleet', icon: LayoutGrid },
    ],
    driver: []
  };

  const rightNav = {
    admin: [
      { name: 'Configuración', path: '/admin', icon: Settings },
    ],
    call_center: [],
    driver: []
  };

  const currentLeftNav = leftNav[user.role as keyof typeof leftNav] || [];
  const currentRightNav = rightNav[user.role as keyof typeof rightNav] || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter text-blue-900 uppercase">Axist<span className="text-blue-600">corp</span></span>
            </Link>

            {currentLeftNav.length > 0 && (
              <nav className="flex items-center gap-1">
                {currentLeftNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                          : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {currentRightNav.length > 0 && (
              <nav className="flex items-center gap-1 mr-2 border-r border-slate-200 pr-4">
                {currentRightNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">{user.name}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-black">
                {user.role === 'admin' ? <ShieldCheck className="w-3 h-3 text-blue-600" /> : null}
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-blue-600"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
