import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Building2, Users, Send, History, Trash2, Edit, Settings, Save, Upload, Megaphone } from 'lucide-react';
import { io } from 'socket.io-client';

const CompanyDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState('manage-employees');
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', pan: '', ctc: '', bank_account: '', ifsc_code: '' });
  const [salForm, setSalForm] = useState({ employee_id: '', month: 'January', year: 2026, ctc: '' });
  const [profileForm, setProfileForm] = useState({ name: '', company_name: '', gstin: '', email: '', industry: '', phone: '', website: '', address: '' });

  const headers = { Authorization: `Bearer ${user?.token}` };

  const loadData = async () => {
    try {
      const eRes = await axios.get('http://127.0.0.1:5000/api/company/employees', { headers });
      setEmployees(eRes.data);
      const sRes = await axios.get('http://127.0.0.1:5000/api/company/salary-history', { headers });
      setSalaryHistory(sRes.data);
      const stRes = await axios.get('http://127.0.0.1:5000/api/company/stats', { headers });
      setStats(stRes.data);
      const aRes = await axios.get('http://127.0.0.1:5000/api/company/announcements', { headers });
      setAnnouncements(aRes.data);
      setSelectedEmployees([]); // Reset selections on data reload
      if (activeTab === 'profile') {
        const pRes = await axios.get('http://127.0.0.1:5000/api/company/profile', { headers });
        setProfileForm(pRes.data);
      }
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { 
    loadData(); 
    setError(null); 
    setMsg(null); 
    
    const socket = io('http://127.0.0.1:5000');
    socket.on('salary_updated', () => loadData());
    socket.on('new_announcement', () => loadData());
    return () => socket.disconnect();
  }, [activeTab]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedEmployees(employees.map(emp => emp._id));
    else setSelectedEmployees([]);
  };

  const handleSelectEmployee = (id) => {
    if (selectedEmployees.includes(id)) setSelectedEmployees(selectedEmployees.filter(eId => eId !== id));
    else setSelectedEmployees([...selectedEmployees, id]);
  };

  const handleBulkRemove = async () => {
    if (!window.confirm(`Are you absolutely sure you want to permanently remove ${selectedEmployees.length} selected employees from your roster?`)) return;
    try {
      await Promise.all(selectedEmployees.map(id => axios.delete(`http://127.0.0.1:5000/api/company/employees/${id}`, { headers })));
      setMsg(`Successfully deleted ${selectedEmployees.length} employees from corporate records.`);
      loadData();
    } catch (err) { setError('Error bulk deleting: ' + (err.response?.data?.message || err.message)); }
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) return setError('CSV must have a header row and data rows.');

      const empData = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 5) {
          empData.push({
            name: cols[0], email: cols[1], password: cols[2], pan: cols[3], ctc: cols[4], bank_account: cols[5] || '', ifsc_code: cols[6] || ''
          });
        }
      }
      try {
        const res = await axios.post('http://127.0.0.1:5000/api/company/employees/bulk', { employees: empData }, { headers });
        setMsg(res.data.message);
        loadData();
      } catch (err) { setError(err.response?.data?.message || err.message); }
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:5000/api/company/employees', empForm, { headers });
      setMsg('Employee added successfully!');
      setEmpForm({ name: '', email: '', password: '', pan: '', ctc: '', bank_account: '', ifsc_code: '' });
      loadData();
    } catch (err) { setError(err.response?.data?.message || err.message); }
  };

  const handleRemoveEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to permanently remove this employee from your roster?")) return;
    try {
      await axios.delete(`http://127.0.0.1:5000/api/company/employees/${id}`, { headers });
      setMsg('Employee removed successfully from company records.');
      loadData();
    } catch (err) { setError(err.response?.data?.message || err.message); }
  };

  const handleEditEmployeeSalary = async (emp) => {
    const newSalary = prompt(`Enter a new Annual CTC for ${emp.name}:`, emp.ctc);
    if (!newSalary || isNaN(newSalary) || newSalary === emp.ctc) return;
    try {
      await axios.put(`http://127.0.0.1:5000/api/company/employees/${emp._id}`, { ctc: newSalary }, { headers });
      setMsg(`Successfully updated Annual CTC for ${emp.name}.`);
      loadData();
    } catch (err) { setError(err.response?.data?.message || err.message); }
  };

  const handleSubmitSalary = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:5000/api/company/submit-salary', salForm, { headers });
      setMsg('Salary submitted for admin approval!');
      setSalForm({ ...salForm, employee_id: '', ctc: '' });
      loadData();
    } catch (err) { setError(err.response?.data?.message || err.message); }
  };

  const handleEditSalary = async (rec) => {
    const newGross = prompt(`Enter new corrected Annual CTC for ${rec.employee_id?.name || 'Employee'}:`, rec.ctc);
    if (!newGross || isNaN(newGross)) return;
    try {
      await axios.put(`http://127.0.0.1:5000/api/company/salary/${rec._id}`, { ctc: newGross }, { headers });
      setMsg('Pending salary declaration updated successfully.');
      loadData();
    } catch (err) { setError(err.response?.data?.message || err.message); }
  };

  const handleAutoGenerate = async () => {
    if (!window.confirm(`Are you sure you want to bulk auto-generate salaries for all employees for ${salForm.month} ${salForm.year}?`)) return;
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/company/auto-generate', { month: salForm.month, year: salForm.year }, { headers });
      setMsg(res.data.message);
      loadData();
    } catch (err) { setError(err.response?.data?.message || err.message); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://127.0.0.1:5000/api/company/profile', profileForm, { headers });
      setMsg('Company Profile strictly updated. Changing your representative name will take effect on next login.');
      loadData();
    } catch (err) { setError(err.response?.data?.message || err.message); }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3"><Building2 /><h1 className="text-xl font-bold">GovPay+</h1></div>
          <p className="text-slate-400 mt-2 text-sm">{user?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('manage-employees')} className={`w-full flex items-center p-3 rounded-lg ${activeTab === 'manage-employees' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Users className="mr-3 w-5 h-5" /> Manage Roster</button>
          <button onClick={() => setActiveTab('submit-salary')} className={`w-full flex items-center p-3 rounded-lg ${activeTab === 'submit-salary' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Send className="mr-3 w-5 h-5" /> Submit Salary</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center p-3 rounded-lg ${activeTab === 'history' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><History className="mr-3 w-5 h-5" /> Salary History</button>
          <button onClick={() => setActiveTab('announcements')} className={`w-full flex items-center p-3 rounded-lg ${activeTab === 'announcements' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>
            <Megaphone className="mr-3 w-5 h-5" /> 
            System Notices
            {announcements.length > 0 && <span className="ml-auto bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{announcements.length}</span>}
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center p-3 rounded-lg ${activeTab === 'profile' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Settings className="mr-3 w-5 h-5" /> Profile & Settings</button>
        </nav>
        <button onClick={logout} className="p-4 bg-slate-800 hover:bg-slate-700 mx-4 mb-2 rounded-lg font-bold">Sign Out</button>
        <div className="p-4 border-t border-slate-800 text-center text-xs mt-auto">
          <p className="text-slate-500 mb-1">Developed by</p>
          <p className="text-slate-300 font-bold mb-2 tracking-wide">Preet kakdiya</p>
          <div className="flex justify-center space-x-4">
            <a href="https://github.com/Preetkakdiya" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">GitHub</a>
            <a href="https://www.linkedin.com/in/preet-kakdiya-8b6025295" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">LinkedIn</a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Company Dashboard</h2>
        {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error} <button onClick={() => setError(null)} className="float-right font-bold">X</button></div>}
        {msg && <div className="bg-green-100 text-green-700 p-4 rounded mb-4 flex justify-between">{msg} <button onClick={() => setMsg(null)} className="font-bold">X</button></div>}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Headcount</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalEmployees}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Payroll (Gross)</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">₹{stats.totalSalary?.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Disbursed (Net)</h3>
              <p className="text-3xl font-bold text-emerald-600 mt-2">₹{stats.totalNetPaid?.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Taxes Remitted</h3>
              <p className="text-3xl font-bold text-red-500 mt-2">₹{stats.totalTaxRemitted?.toLocaleString()}</p>
            </div>
          </div>
        )}

        {activeTab === 'manage-employees' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-semibold mb-4 text-indigo-900 border-b pb-2">Single Employee Onboarding</h3>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full p-2 border rounded bg-slate-50" placeholder="Full Name *" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} required />
                    <input className="w-full p-2 border rounded bg-slate-50" type="email" placeholder="Email *" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} required />
                    <input className="w-full p-2 border rounded bg-slate-50" type="password" placeholder="Temp Password *" value={empForm.password} onChange={e => setEmpForm({ ...empForm, password: e.target.value })} required />
                    <input className="w-full p-2 border rounded bg-slate-50 uppercase" placeholder="PAN Number *" value={empForm.pan} onChange={e => setEmpForm({ ...empForm, pan: e.target.value })} required />
                    <input className="w-full p-2 border rounded bg-slate-50" placeholder="Bank Account (Optional)" value={empForm.bank_account} onChange={e => setEmpForm({ ...empForm, bank_account: e.target.value })} />
                    <input className="w-full p-2 border rounded bg-slate-50 uppercase" placeholder="IFSC Code (Optional)" value={empForm.ifsc_code} onChange={e => setEmpForm({ ...empForm, ifsc_code: e.target.value })} />
                  </div>
                  <input className="w-full p-2 border rounded bg-slate-50" type="number" placeholder="Annual CTC (₹) *" value={empForm.ctc} onChange={e => setEmpForm({ ...empForm, ctc: e.target.value })} required />
                  <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 font-bold shadow">Register to Roster</button>
                </form>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border flex flex-col">
                <h3 className="text-lg font-semibold mb-4 text-indigo-900 border-b pb-2 flex items-center"><Upload className="w-5 h-5 mr-2" /> Bulk CSV Import</h3>
                <p className="text-sm text-gray-600 mb-6">Upload an employee roster in standard CSV format to instantly bulk register your entire workforce.</p>
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl text-center flex-1 flex flex-col justify-center items-center p-6">
                  <p className="text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wide">Required Columns (Exact Order):</p>
                  <code className="text-sm bg-indigo-100 px-3 py-2 rounded-lg text-indigo-900 mb-6 block shadow-inner font-mono text-center">
                    Name, Email, Password, PAN, Salary, Bank Account (Opt), IFSC (Opt)
                  </code>
                  <label className="bg-indigo-600 text-white px-8 py-3 rounded-lg shadow-md cursor-pointer font-bold hover:bg-indigo-700 transition-transform active:scale-95">
                    Select CSV File
                    <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-800">Current Employee Roster</h3>
                {selectedEmployees.length > 0 && (
                  <button onClick={handleBulkRemove} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center font-bold shadow transition-colors animate-fade-in">
                    <Trash2 className="w-5 h-5 mr-2" /> Delete Selected ({selectedEmployees.length})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                          checked={employees.length > 0 && selectedEmployees.length === employees.length}
                          onChange={handleSelectAll} title="Select All" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Info</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PAN / Tax ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bank Details</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Annual CTC</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {employees.map(emp => (
                      <tr key={emp._id} className={selectedEmployees.includes(emp._id) ? "bg-indigo-50" : "hover:bg-slate-50"}>
                        <td className="px-4 py-3">
                          <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedEmployees.includes(emp._id)}
                            onChange={() => handleSelectEmployee(emp._id)} />
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="font-bold text-slate-800 text-sm">{emp.name}</div>
                          {emp.designation && <div className="text-xs font-semibold text-indigo-600 mb-0.5">{emp.designation}</div>}
                          <div className="text-xs text-slate-600 font-medium">{emp.email}</div>
                          {emp.phone && <div className="text-xs text-slate-500">{emp.phone}</div>}
                          {emp.address && <div className="text-[10px] text-slate-400 mt-1 italic truncate" title={emp.address}>{emp.address}</div>}
                        </td>
                        <td className="px-4 py-3 uppercase tracking-wide text-sm">{emp.pan}</td>
                        <td className="px-4 py-3">
                          {emp.bank_account ? (
                            <div>
                              <div className="text-sm font-medium text-indigo-700">{emp.bank_account}</div>
                              <div className="text-xs text-indigo-500 font-mono tracking-widest">{emp.ifsc_code || 'NO IFSC'}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded">Pending Data</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700">₹{emp.ctc}</td>
                        <td className="px-4 py-3 flex justify-center space-x-2">
                          <button onClick={() => handleEditEmployeeSalary(emp)} className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 p-2 rounded transition-colors" title="Edit Annual CTC"><Edit className="w-5 h-5" /></button>
                          <button onClick={() => handleRemoveEmployee(emp._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors" title="Remove Employee"><Trash2 className="w-5 h-5" /></button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && <tr><td colSpan="6" className="text-center p-8 text-gray-500 italic">No employees found in the company roster.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submit-salary' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow border max-w-2xl">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-slate-800">Submit Employee Salary</h3>
                <button type="button" onClick={handleAutoGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-md transition-all uppercase tracking-wide">
                   Auto-Generate Entire Roster
                </button>
              </div>
              <p className="text-sm text-slate-500 font-semibold mb-6 leading-relaxed">Submit individual employee salaries below, or use the "Auto-Generate Entire Roster" button to automatically create default salary submissions for all active employees for {salForm.month} {salForm.year}.</p>
              
              <form onSubmit={handleSubmitSalary} className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Select Employee</label>
                   <select className="w-full p-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-700 shadow-inner" required value={salForm.employee_id} onChange={e => {
                     const selectedEmp = employees.find(emp => emp._id === e.target.value);
                     setSalForm({ ...salForm, employee_id: e.target.value, ctc: selectedEmp ? selectedEmp.ctc : '' });
                   }}>
                     <option value="">-- SELECT EMPLOYEE --</option>
                     {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()} (CTC: ₹{emp.ctc})</option>)}
                   </select>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                     <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Month</label>
                     <select className="w-full p-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:outline-none font-bold text-slate-700 shadow-inner" value={salForm.month} onChange={e => setSalForm({ ...salForm, month: e.target.value })}>
                       {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Year</label>
                     <input type="number" className="w-full p-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:outline-none font-bold text-slate-700 shadow-inner" placeholder="Year" value={salForm.year} onChange={e => setSalForm({ ...salForm, year: e.target.value })} required />
                  </div>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-indigo-600 uppercase tracking-widest mb-2">Submitted Annual CTC (₹)</label>
                   <input type="number" className="w-full p-4 border-2 border-indigo-200 rounded-xl bg-indigo-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-2xl font-black text-indigo-900 shadow-inner" placeholder="0.00" value={salForm.ctc} onChange={e => setSalForm({ ...salForm, ctc: e.target.value })} required />
                </div>
                
                {salForm.ctc && !isNaN(salForm.ctc) && (
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-4">
                    <div>
                      <p className="text-xs text-indigo-500 font-bold uppercase">Monthly Pay</p>
                      <p className="font-bold text-indigo-900">₹{Math.round(salForm.ctc / 12).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-500 font-bold uppercase">Basic (40%)</p>
                      <p className="font-bold text-indigo-900">₹{Math.round(salForm.ctc * 0.40).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-500 font-bold uppercase">HRA (20%)</p>
                      <p className="font-bold text-indigo-900">₹{Math.round(salForm.ctc * 0.20).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-500 font-bold uppercase">Allowances</p>
                      <p className="font-bold text-indigo-900">₹{Math.round(salForm.ctc * 0.40).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-xl hover:bg-slate-800 flex justify-center items-center text-lg font-black tracking-wide shadow-xl hover:shadow-2xl transition-all">
                  SUBMIT SALARY <Send className="w-5 h-5 ml-3" />
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow overflow-hidden border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual CTC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Computed Monthly</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaryHistory.map((rec) => (
                  <tr key={rec._id}>
                    <td className="px-6 py-4">{rec.employee_id?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">{rec.month} {rec.year}</td>
                    <td className="px-6 py-4 font-medium">₹{rec.ctc?.toLocaleString() || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">₹{rec.monthly_salary?.toLocaleString() || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rec.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex justify-center">
                      {rec.status === 'pending' ? (
                        <button onClick={() => handleEditSalary(rec)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded font-bold" title="Edit Salary"><Edit className="w-4 h-4" /></button>
                      ) : (
                        <span className="text-gray-400 text-xs">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {salaryHistory.length === 0 && <tr className="text-center"><td colSpan="5" className="py-4 text-gray-400">No salary records.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="max-w-4xl">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><Megaphone className="w-6 h-6 mr-3 text-indigo-600" /> Administrative Dispatches</h3>
            <div className="space-y-4">
              {announcements.map(an => (
                <div key={an._id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-600 relative hover:shadow-md transition-shadow">
                  <span className="absolute top-4 right-4 text-xs font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full uppercase tracking-wider">{an.target_audience === 'all' ? 'Global Broadcast' : 'Corporate Directive'}</span>
                  <h4 className="font-bold text-slate-900 text-lg mb-2 mr-40">{an.title}</h4>
                  <p className="text-slate-600 leading-relaxed max-w-2xl text-sm">{an.message}</p>
                  <p className="text-xs text-slate-400 mt-4 font-mono border-t border-slate-100 pt-3">{new Date(an.createdAt).toLocaleString()} • Verified Source: GovPay+ Admin</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                  <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">There are currently no official notices for your corporate entity.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white p-8 rounded-xl shadow border max-w-4xl">
            <div className="flex items-center mb-6 border-b pb-3">
              <div className="bg-indigo-100 p-3 rounded-full mr-4">
                <Building2 className="w-8 h-8 text-indigo-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Business Profile & Settings</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-6">

              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Core Identification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registered Company Name *</label>
                    <input className="w-full p-2.5 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={profileForm.company_name || ''} onChange={e => setProfileForm({ ...profileForm, company_name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Official GSTIN (Tax ID) *</label>
                    <input className="w-full p-2.5 border rounded focus:ring-2 focus:ring-indigo-500 outline-none uppercase" value={profileForm.gstin || ''} onChange={e => setProfileForm({ ...profileForm, gstin: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Representative Name *</label>
                    <input className="w-full p-2.5 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={profileForm.name || ''} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />
                  </div>
                  <div className="opacity-75">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registered Account Email</label>
                    <input disabled className="w-full p-2.5 border rounded bg-gray-200 text-gray-500 cursor-not-allowed" value={profileForm.email || ''} title="Contact GovPay Regional Security Admin to change registered email addresses." />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Expanded Business Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry Sector</label>
                    <input placeholder="e.g. Technology, Manufacturing..." className="w-full p-2.5 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={profileForm.industry || ''} onChange={e => setProfileForm({ ...profileForm, industry: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Website</label>
                    <input placeholder="https://..." type="url" className="w-full p-2.5 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={profileForm.website || ''} onChange={e => setProfileForm({ ...profileForm, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone Number</label>
                    <input placeholder="+91..." className="w-full p-2.5 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={profileForm.phone || ''} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registered HQ Address</label>
                    <textarea rows="3" placeholder="Full Registered Corporate Address..." className="w-full p-2.5 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={profileForm.address || ''} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}></textarea>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white font-bold p-4 rounded-xl hover:bg-indigo-700 flex justify-center items-center mt-4 shadow-lg text-lg transition-colors">
                <Save className="w-5 h-5 mr-2" /> Save Profile Configurations
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
export default CompanyDashboard;
