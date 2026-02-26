import React, { useState } from "react";
import { User } from "../types";
import { Truck, ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../services/api";

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const user = await api.login(email);
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/30">
            <Truck className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-center mb-2 tracking-tighter text-slate-900 uppercase">Axist<span className="text-blue-600">corp</span></h1>
        <p className="text-slate-400 text-center mb-10 font-medium">Gestión Inteligente de Flotas</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">
              Acceso Corporativo
            </label>
            <input 
              type="email" 
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@axistcorp.com"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg focus:border-blue-600 focus:bg-white focus:outline-none transition-all text-slate-900 font-medium disabled:opacity-50"
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xl py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-blue-600/20 uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Ingresar"} <ArrowRight className="w-6 h-6" />
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
            Sistema de Gestión de Asistencia Vial
          </p>
        </div>
      </motion.div>
    </div>
  );
}
