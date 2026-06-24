import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { User } from "./types";
import Login from "./components/Login";
import DriverDashboard from "./components/DriverDashboard";
import AdminDashboard from "./components/AdminDashboard";
import CallCenterDashboard from "./components/CallCenterDashboard";
import FleetDashboard from "./components/FleetDashboard";
import { Layout } from "./components/Layout";
import { initializeRuntimeSupabase } from "./services/supabase";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Simple persistence for demo and runtime configuration fetch
  useEffect(() => {
    async function init() {
      await initializeRuntimeSupabase();
      const saved = localStorage.getItem("towassist_user");
      if (saved) {
        setUser(JSON.parse(saved));
      }
      setLoadingConfig(false);
    }
    init();
  }, []);

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide animate-pulse">Conectando con el Servidor y Base de Datos...</p>
      </div>
    );
  }

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem("towassist_user", JSON.stringify(u));
  };

  const handleLogout = async () => {
    if (user && user.role === 'driver') {
      try {
        const { api } = await import("./services/api");
        await api.updateStatus(user.id, "TERMINE TURNO");
      } catch (err) {
        console.warn("Could not set driver status to offline on logout:", err);
      }
    }
    setUser(null);
    localStorage.removeItem("towassist_user");
  };

  const getDefaultRoute = () => {
    if (!user) return "/login";
    switch (user.role) {
      case 'driver': return "/driver";
      case 'call_center': return "/monitoring";
      case 'admin': return "/fleet";
      default: return "/login";
    }
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to={getDefaultRoute()} /> : <Login onLogin={handleLogin} />} 
        />
        
        <Route 
          path="/" 
          element={<Navigate to={getDefaultRoute()} />} 
        />

        {/* Driver Route */}
        <Route 
          path="/driver" 
          element={
            user?.role === 'driver' ? (
              <Layout user={user} onLogout={handleLogout}>
                <DriverDashboard user={user} />
              </Layout>
            ) : <Navigate to="/login" />
          } 
        />

        {/* Monitoring Route */}
        <Route 
          path="/monitoring" 
          element={
            user?.role === 'call_center' ? (
              <Layout user={user} onLogout={handleLogout}>
                <CallCenterDashboard />
              </Layout>
            ) : <Navigate to="/login" />
          } 
        />

        {/* Fleet Route */}
        <Route 
          path="/fleet" 
          element={
            user && (user.role === 'admin' || user.role === 'call_center') ? (
              <Layout user={user} onLogout={handleLogout}>
                <FleetDashboard />
              </Layout>
            ) : <Navigate to="/login" />
          } 
        />

        {/* Admin Config Route */}
        <Route 
          path="/admin" 
          element={
            user?.role === 'admin' ? (
              <Layout user={user} onLogout={handleLogout}>
                <AdminDashboard />
              </Layout>
            ) : <Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  );
}
