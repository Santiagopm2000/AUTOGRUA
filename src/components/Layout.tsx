import { ReactNode } from "react";
import { User } from "../types";
import { LogOut, Truck, ShieldCheck } from "lucide-react";

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
}

export function Layout({ user, onLogout, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-xl tracking-tight">TowAssist <span className="text-emerald-500">Pro</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : null}
                {user.role}
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
