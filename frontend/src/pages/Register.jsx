import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Building, User } from 'lucide-react';

const Register = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'company',
    company_name: '', gstin: '', pan: ''
  });
  const [error, setError] = useState('');
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleTab = (role) => {
    setActiveTab(role);
    setFormData({ ...formData, role });
  };

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await register(formData);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'company') navigate('/company');
      else navigate('/employee');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4 py-12 pt-16">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full"><UserPlus className="w-8 h-8 text-blue-600" /></div>
        </div>
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">Join GovPay+</h2>
        <p className="text-center text-slate-500 mb-6">Select your account type to register</p>
        
        <div className="flex mb-6 border-b border-gray-200">
          <button type="button" onClick={() => handleTab('company')} className={`flex-1 py-3 font-semibold border-b-2 flex justify-center gap-2 ${activeTab === 'company' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><Building className="w-4 h-4"/> Company</button>
          <button type="button" onClick={() => handleTab('employee')} className={`flex-1 py-3 font-semibold border-b-2 flex justify-center gap-2 ${activeTab === 'employee' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}`}><User className="w-4 h-4"/> Employee</button>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" name="name" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Secure Password</label>
            <input type="password" name="password" required className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} />
          </div>
          
          <div className="pt-4 border-t border-slate-100 mt-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">{activeTab === 'company' ? 'Company Details' : 'Verification Details'}</h3>
            <div className="space-y-4">
              {activeTab === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Legal Name</label>
                  <input type="text" name="company_name" required={activeTab==='company'} className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} />
                </div>
              )}
              {activeTab === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your PAN Number</label>
                  <input type="text" name="pan" required={activeTab==='employee'} className="w-full px-4 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-teal-500" onChange={handleChange} />
                </div>
              )}
              {activeTab === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company GSTIN Number</label>
                  <input type="text" name="gstin" required className="w-full px-4 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500" onChange={handleChange} placeholder="Register your Company GSTIN" />
                </div>
              )}
            </div>
          </div>

          <button type="submit" className={`w-full mt-6 text-white font-semibold py-3 px-4 rounded-lg shadow-lg ${activeTab === 'company' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
            Register Account
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-semibold">Sign in here</Link></p>
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm mb-2">Developed by <span className="text-white font-bold tracking-wide">Preet kakdiya</span></p>
        <div className="flex justify-center space-x-6 text-sm font-semibold">
          <a href="https://github.com/Preetkakdiya" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">GitHub</a>
          <a href="https://www.linkedin.com/in/preet-kakdiya-8b6025295" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">LinkedIn</a>
        </div>
      </div>
    </div>
  );
};
export default Register;
