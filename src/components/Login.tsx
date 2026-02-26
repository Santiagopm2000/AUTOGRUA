import React, { useState } from "react";
import { User } from "../types";
import { Truck, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login logic
    if (email.includes("admin")) {
      onLogin({
        id: "admin-1",
        name: "Admin Central",
        email: email,
        role: "admin",
        status: "DISPONIBLE"
      });
    } else if (email.includes("call")) {
      onLogin({
        id: "call-1",
        name: "Operador Call Center",
        email: email,
        role: "call_center",
        status: "DISPONIBLE"
      });
    } else {
      onLogin({
        id: "driver-1",
        name: "Juan Perez",
        email: email,
        role: "driver",
        status: "TERMINE TURNO"
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Truck className="w-10 h-10 text-zinc-950" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">Bienvenido</h1>
        <p className="text-zinc-500 text-center mb-8">Ingresa tus credenciales para continuar</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Correo Electrónico
            </label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="conductor@towassist.com"
              className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-2xl px-4 py-4 text-lg focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xl py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            ENTRAR <ArrowRight className="w-6 h-6" />
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-600 font-medium uppercase tracking-widest">
            Usa "admin@test.com" para panel administrativo
          </p>
        </div>
      </motion.div>
    </div>
  );
}
