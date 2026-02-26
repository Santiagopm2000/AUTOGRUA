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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-500" />
              <span className="font-bold text-xl tracking-tight hidden sm:inline">TowAssist <span className="text-emerald-500">Pro</span></span>
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
                          ? 'bg-emerald-500 text-zinc-950' 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
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
              <nav className="flex items-center gap-1 mr-2 border-r border-zinc-800 pr-4">
                {currentRightNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isActive 
                          ? 'bg-zinc-100 text-zinc-950' 
                          : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
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
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : null}
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
