import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/Admin/AdminDashboard';
import CompanyDashboard from './pages/Company/CompanyDashboard';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';

const FirstLoginOverlay = () => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  
  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/auth/reset-first-password', { newPassword });
      localStorage.setItem('govpay_user', JSON.stringify(res.data));
      window.location.reload();
    } catch (err) { setError(err.response?.data?.message || 'Failed to update password'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border-t-4 border-indigo-600">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Password Update Required</h2>
        <p className="text-slate-600 mb-6 font-medium leading-relaxed">As this is your first time logging into the GovPay+ network, you are required to change your temporary assigned password.</p>
        <form onSubmit={handleReset}>
          {error && <p className="text-red-600 mb-4 font-bold bg-red-50 p-2 rounded">{error}</p>}
          <input type="password" placeholder="Enter New Password" autoFocus className="w-full py-4 px-4 bg-slate-50 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none text-xl font-bold text-slate-800 mb-6" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength="6" />
          <button type="submit" className="w-full bg-indigo-600 text-white font-black p-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 text-lg">UPDATE & UNLOCK DASHBOARD</button>
        </form>
      </div>
    </div>
  );
};

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  
  // Hardcoded Security Lock completely blocking UI access until reset
  if (user.isFirstLogin === true) return <FirstLoginOverlay />;
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/admin/*" element={
          <PrivateRoute role="admin">
            <AdminDashboard />
          </PrivateRoute>
        } />
        
        <Route path="/company/*" element={
          <PrivateRoute role="company">
            <CompanyDashboard />
          </PrivateRoute>
        } />
        
        <Route path="/employee/*" element={
          <PrivateRoute role="employee">
            <EmployeeDashboard />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
