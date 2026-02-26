import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { User } from "./types";
import Login from "./components/Login";
import DriverDashboard from "./components/DriverDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { Layout } from "./components/Layout";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Simple persistence for demo
  useEffect(() => {
    const saved = localStorage.getItem("towassist_user");
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem("towassist_user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("towassist_user");
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
        />
        
        <Route 
          path="/" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                {user.role === 'driver' ? <DriverDashboard user={user} /> : <AdminDashboard />}
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </Router>
  );
}
