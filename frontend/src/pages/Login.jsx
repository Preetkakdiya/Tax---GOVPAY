import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, XCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '', pan: '', newPassword: '' });
  const [forgotMsg, setForgotMsg] = useState({ type: '', text: '' });
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'company') navigate('/company');
      else navigate('/employee');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMsg({ type: '', text: '' });
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/auth/forgot-password', forgotForm);
      setForgotMsg({ type: 'success', text: res.data.message });
      setTimeout(() => setShowForgotModal(false), 3000);
    } catch (err) {
      setForgotMsg({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full"><LogIn className="w-8 h-8 text-blue-600" /></div>
        </div>
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">GovPay+ Sign In</h2>
        <p className="text-center text-slate-500 mb-6">All-In-One Unified Portal</p>
        
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter your email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
          </div>
          <div className="text-right">
            <button type="button" onClick={() => setShowForgotModal(true)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors">Forgot your password? (Recover via PAN)</button>
          </div>
          <button type="submit" className="w-full mt-4 text-white font-semibold py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-lg transition-transform hover:-translate-y-0.5">Secure Login</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">Not registered yet? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Create an account</Link></p>
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm mb-2">Developed by <span className="text-white font-bold tracking-wide">Preet kakdiya</span></p>
        <div className="flex justify-center space-x-6 text-sm font-semibold">
          <a href="https://github.com/Preetkakdiya" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">GitHub</a>
          <a href="https://www.linkedin.com/in/preet-kakdiya-8b6025295" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">LinkedIn</a>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative isolate animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowForgotModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-2"><XCircle className="w-5 h-5" /></button>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Password Recovery</h3>
            <p className="text-sm text-slate-500 mb-6">Enter your Registered Email and Official PAN to securely reset your connection credentials.</p>
            
            {forgotMsg.text && (
              <div className={`p-4 rounded-xl mb-6 text-sm font-bold text-center border ${forgotMsg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Registered Email</label>
                <input type="email" required value={forgotForm.email} onChange={e => setForgotForm({ ...forgotForm, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" placeholder="employee@domain.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Govt. Verification PAN</label>
                <input type="text" required value={forgotForm.pan} onChange={e => setForgotForm({ ...forgotForm, pan: e.target.value })} className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase tracking-widest font-mono font-bold" placeholder="ABCDE1234F" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">New Secure Password</label>
                <input type="password" required value={forgotForm.newPassword} onChange={e => setForgotForm({ ...forgotForm, newPassword: e.target.value })} className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full mt-4 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 shadow-xl transition-transform hover:-translate-y-0.5">Execute Reset</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Login;
