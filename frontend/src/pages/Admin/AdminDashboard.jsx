import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { ShieldCheck, BarChart3, CheckSquare, AlertTriangle, Megaphone, Download, XCircle, Settings, Save, UserCircle, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStr, setFilterStr] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [announceForm, setAnnounceForm] = useState({ title: '', message: '', target_audience: 'all' });

  const [hasTaxAccess, setHasTaxAccess] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', designation: '' });

  const [resolvingId, setResolvingId] = useState(null);
  const [resForm, setResForm] = useState({ response_message: '', fine_amount: 0, override_ctc: '' });

  const [taxConfig, setTaxConfig] = useState({
    slabs: [
      { limit: 0, rate: 0 },
      { limit: 500000, rate: 10 },
      { limit: 1000000, rate: 20 }
    ],
    additional_cess_rate: 0,
    additional_surcharge_rate: 0
  });

  const [graphData, setGraphData] = useState([]);
  const [companyReports, setCompanyReports] = useState({});

  const headers = { Authorization: `Bearer ${user?.token}` };

  const loadData = async () => {
    try {
      const st = await axios.get('http://127.0.0.1:5000/api/admin/stats', { headers });
      setStats(st.data);
      if (activeTab === 'overview') {
        const tr = await axios.get('http://127.0.0.1:5000/api/admin/report/monthly', { headers });
        setGraphData(tr.data.monthlyTrends || []);
        setCompanyReports(tr.data.companyWiseReports || {});
      }
      if (activeTab === 'approvals') {
        const sa = await axios.get('http://127.0.0.1:5000/api/admin/all-salaries', { headers });
        setSalaries(sa.data);
      }
      if (activeTab === 'complaints') {
        const ca = await axios.get('http://127.0.0.1:5000/api/admin/complaints', { headers });
        setComplaints(ca.data);
        const sa = await axios.get('http://127.0.0.1:5000/api/admin/all-salaries', { headers });
        setSalaries(sa.data);
      }
      if (activeTab === 'audit-logs') {
        const al = await axios.get('http://127.0.0.1:5000/api/admin/audit-logs', { headers });
        setAuditLogs(al.data);
      }
      if (activeTab === 'announcements') {
        const an = await axios.get('http://127.0.0.1:5000/api/admin/announcements', { headers });
        setAnnouncements(an.data);
      }
      if (activeTab === 'tax-config' && hasTaxAccess) {
        const tc = await axios.get('http://127.0.0.1:5000/api/admin/tax-config', { headers });
        if (tc.data) setTaxConfig(tc.data);
      }
      if (activeTab === 'profile') {
        const pRes = await axios.get('http://127.0.0.1:5000/api/admin/profile', { headers });
        setProfileForm(pRes.data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    loadData(); 
    setResolvingId(null); 
    setMsg(''); 
    if (activeTab !== 'tax-config') setHasTaxAccess(false);
  }, [activeTab]);

  const handleApprove = async (id) => {
    try {
      await axios.post(`http://127.0.0.1:5000/api/admin/approve-salary/${id}`, {}, { headers });
      loadData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`http://127.0.0.1:5000/api/admin/reject-salary/${id}`, {}, { headers });
      loadData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const openResolver = (c) => {
    if (resolvingId === c._id) return setResolvingId(null);
    setResolvingId(c._id);
    const empSalary = salaries.find(s => s.employee_id?._id === c.employee_id?._id && s.status === 'approved');
    setResForm({
      response_message: 'The Government apologizes for the delay. We are rectifying this immediately.',
      fine_amount: 0,
      override_ctc: empSalary ? empSalary.ctc : '',
      salary_id: empSalary ? empSalary._id : null
    });
  };

  const submitResolution = async () => {
    try {
      await axios.put(`http://127.0.0.1:5000/api/admin/resolve-complaint/${resolvingId}`, {
        response_message: resForm.response_message,
        fine_amount: Number(resForm.fine_amount)
      }, { headers });

      if (resForm.salary_id && resForm.override_ctc) {
        await axios.put(`http://127.0.0.1:5000/api/admin/edit-salary/${resForm.salary_id}`, {
          ctc: Number(resForm.override_ctc)
        }, { headers });
      }

      setResolvingId(null);
      setMsg('Complaint resolved and adjustments applied successfully.');
      loadData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const saveTaxConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://127.0.0.1:5000/api/admin/tax-config', taxConfig, { headers });
      setMsg('Global Tax Engine settings successfully deployed to all regional calculations.');
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleUnlockTaxEngine = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:5000/api/admin/verify-password', { password: accessPassword }, { headers });
      setHasTaxAccess(true);
      setAccessPassword('');
      const tc = await axios.get('http://127.0.0.1:5000/api/admin/tax-config', { headers });
      if (tc.data) setTaxConfig(tc.data);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://127.0.0.1:5000/api/admin/profile', profileForm, { headers });
      setMsg('Admin Profile successfully updated.');
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('GovPay+ Official Salary Report', 14, 15);
    const tableData = salaries
      .filter(s => filterStr === 'all' || s.status === filterStr)
      .map(s => [
        s.employee_id?.name || 'Unknown',
        s.company_id?.name || 'Unknown',
        `${s.month} ${s.year}`,
        `Rs ${s.ctc || 0}`,
        `Rs ${s.monthly_tds || 0}`,
        `Rs ${s.net_salary || 0}`,
        s.status.toUpperCase()
      ]);

    autoTable(doc, {
      startY: 25,
      head: [['Employee', 'Company', 'Period', 'Annual CTC', 'Tax (TDS)', 'Net Pay', 'Status']],
      body: tableData,
    });
    doc.save(`govpay_salary_report_${filterStr}.pdf`);
  };

  const filteredSalaries = salaries.filter(s => {
    const statusMatch = filterStr === 'all' || s.status === filterStr;
    const q = searchQuery.toLowerCase();
    const searchMatch = !q || 
      (s.employee_id?.name || '').toLowerCase().includes(q) || 
      (s.employee_id?.pan || '').toLowerCase().includes(q) || 
      (s.month || '').toLowerCase().includes(q) ||
      (s.company_id?.name || '').toLowerCase().includes(q);
    return statusMatch && searchMatch;
  });

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="w-64 bg-indigo-900 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-indigo-800">
          <div className="flex items-center space-x-3"><ShieldCheck /><h1 className="text-xl font-bold">GovPay+ Admin</h1></div>
          <p className="text-indigo-300 mt-2 text-sm">{user?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-800'}`}><BarChart3 className="mr-3 w-5 h-5" /> Overview</button>
          <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab === 'approvals' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-800'}`}><CheckSquare className="mr-3 w-5 h-5" /> Salary Approvals</button>
          <button onClick={() => setActiveTab('complaints')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab === 'complaints' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-800'}`}><AlertTriangle className="mr-3 w-5 h-5" /> Support & Fines</button>
          <button onClick={() => setActiveTab('audit-logs')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab === 'audit-logs' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-800'}`}><Activity className="mr-3 w-5 h-5" /> System Audit Logs</button>
          <button onClick={() => setActiveTab('announcements')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab === 'announcements' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-800'}`}><Megaphone className="mr-3 w-5 h-5" /> Announcements</button>
          <button onClick={() => setActiveTab('tax-config')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab === 'tax-config' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-800'}`}><Settings className="mr-3 w-5 h-5" /> Tax Engine Setup</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-700 shadow-inner' : 'hover:bg-indigo-800'}`}><UserCircle className="mr-3 w-5 h-5" /> Admin Profile</button>
        </nav>
        <button onClick={logout} className="p-4 bg-indigo-800 hover:bg-indigo-700 mx-4 mb-2 rounded-lg font-bold">Sign Out</button>
        <div className="p-4 border-t border-indigo-800 text-center text-xs mt-auto">
          <p className="text-indigo-400 mb-1">Developed by</p>
          <p className="text-indigo-200 font-bold mb-2 tracking-wide">Preet kakdiya</p>
          <div className="flex justify-center space-x-4">
            <a href="https://github.com/Preetkakdiya" target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-white">GitHub</a>
            <a href="https://www.linkedin.com/in/preet-kakdiya-8b6025295" target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-white">LinkedIn</a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 relative">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 drop-shadow-sm">GovPay+ Regional Admin Portal</h2>

        {msg && <div className="bg-emerald-100 text-emerald-800 p-4 rounded-lg mb-6 font-semibold shadow flex justify-between">{msg} <button onClick={() => setMsg('')} className="text-emerald-500 hover:text-emerald-900">X</button></div>}

        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow border border-indigo-50">
                <h3 className="text-sm font-semibold text-slate-500 tracking-wider uppercase">Registered Companies</h3>
                <p className="text-4xl font-extrabold text-indigo-700 mt-2">{stats.companies}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border border-indigo-50">
                <h3 className="text-sm font-semibold text-slate-500 tracking-wider uppercase">Total Employees</h3>
                <p className="text-4xl font-extrabold text-indigo-700 mt-2">{stats.employees}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border border-indigo-50">
                <h3 className="text-sm font-semibold text-slate-500 tracking-wider uppercase">Pending Approvals</h3>
                <p className="text-4xl font-extrabold text-amber-500 mt-2">{stats.pendingSalaries}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border border-indigo-50">
                <h3 className="text-sm font-semibold text-slate-500 tracking-wider uppercase">Tax Collected</h3>
                <p className="text-4xl font-extrabold text-emerald-600 mt-2">₹{stats.totalTax.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow border border-slate-100 h-96 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Tax Collection Trends</h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData}>
                      <defs>
                        <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val)=>`₹${val/1000}k`} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Area type="monotone" dataKey="taxCollected" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTax)" name="Tax Collected (₹)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow border border-slate-100 h-96 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Salary Disbursement Volume</h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val)=>`₹${val/100000}L`} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Line type="monotone" dataKey="salaryDisbursed" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} name="Gross Salaries (₹)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border border-slate-100 mt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Company Aggregate Footprints</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(companyReports).map(([cName, data]) => (
                  <div key={cName} className="p-4 border border-slate-200 rounded shadow-sm bg-slate-50 transition-transform hover:-translate-y-1">
                    <h4 className="font-bold text-indigo-700 mb-2 truncate">{cName}</h4>
                    <p className="text-sm text-slate-600 flex justify-between"><span className="font-medium">Gross Bound:</span> <span className="font-bold text-slate-800">₹{data.totalGrossPaid?.toLocaleString()}</span></p>
                    <p className="text-sm text-slate-600 flex justify-between"><span className="font-medium">Net Disbursed:</span> <span className="font-bold text-emerald-600">₹{data.totalNetPaid?.toLocaleString()}</span></p>
                    <p className="text-sm text-slate-600 flex justify-between"><span className="font-medium">Tax Withheld:</span> <span className="font-bold text-red-500">₹{data.totalTaxRemitted?.toLocaleString()}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white rounded-xl shadow overflow-hidden border">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <input type="text" placeholder="Search by Name, PAN, Month or Company..." className="p-2 border rounded shadow-sm text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-72 mr-4" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <button onClick={() => setFilterStr('all')} className={`px-3 py-1 rounded text-sm font-medium ${filterStr === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
                <button onClick={() => setFilterStr('pending')} className={`px-3 py-1 rounded text-sm font-medium ${filterStr === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Pending</button>
                <button onClick={() => setFilterStr('approved')} className={`px-3 py-1 rounded text-sm font-medium ${filterStr === 'approved' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Approved</button>
                <button onClick={() => setFilterStr('rejected')} className={`px-3 py-1 rounded text-sm font-medium ${filterStr === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Rejected</button>
              </div>
              <button onClick={downloadPDF} className="flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800">
                <Download className="w-4 h-4 mr-1" /> Download PDF Report
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left tracking-wider text-sm font-semibold text-gray-500">Employee</th>
                  <th className="px-6 py-3 text-left tracking-wider text-sm font-semibold text-gray-500">Month/Year</th>
                  <th className="px-6 py-3 text-left tracking-wider text-sm font-semibold text-gray-500">Annual CTC</th>
                  <th className="px-6 py-3 text-left tracking-wider text-sm font-semibold text-gray-500">Tax Computed (TDS)</th>
                  <th className="px-6 py-3 text-left tracking-wider text-sm font-semibold text-gray-500">Net Salary</th>
                  <th className="px-6 py-3 text-center tracking-wider text-sm font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSalaries.map((rec) => (
                  <tr key={rec._id}>
                    <td className="px-6 py-4">{rec.employee_id?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">{rec.month} {rec.year}</td>
                    <td className="px-6 py-4 text-gray-600">₹{rec.ctc?.toLocaleString() || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-red-500">₹{rec.monthly_tds?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">₹{rec.net_salary || 0}</td>
                    <td className="px-6 py-4 flex justify-center space-x-2">
                      {rec.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(rec._id)} className="bg-emerald-600 text-white px-3 py-1 rounded shadow hover:bg-emerald-700 text-sm font-medium">Approve</button>
                          <button onClick={() => handleReject(rec._id)} className="bg-red-600 text-white p-1 rounded shadow hover:bg-red-700" title="Reject"><XCircle className="w-5 h-5" /></button>
                        </>
                      )}
                      {rec.status === 'approved' && <span className="text-emerald-600 font-bold">Approved</span>}
                      {rec.status === 'rejected' && <span className="text-red-600 font-bold">Rejected</span>}
                    </td>
                  </tr>
                ))}
                {filteredSalaries.length === 0 && <tr><td colSpan="6" className="text-center p-6 text-gray-500">No matching salaries found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'complaints' && (
          <div className="bg-white rounded-xl shadow overflow-hidden border">
            <div className="p-4 bg-slate-50 border-b"><h3 className="font-semibold text-slate-700">Grievances & Government Fines</h3></div>
            <div className="p-6 space-y-4">
              {complaints.filter(c => c.status === 'open').length === 0 && <p className="text-gray-500">No open complaints.</p>}
              {complaints.filter(c => c.status === 'open').map(c => (
                <div key={c._id} className="border rounded shadow-sm overflow-hidden">
                  <div className="p-4 bg-red-50 border-b border-red-200 flex justify-between items-center text-red-900">
                    <div>
                      <span className="font-bold">{c.employee_id?.name || 'Unknown'}:</span> {c.message}
                    </div>
                    <button onClick={() => openResolver(c)} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded shadow hover:bg-red-700">
                      {resolvingId === c._id ? 'Cancel' : 'Review & Resolve'}
                    </button>
                  </div>

                  {resolvingId === c._id && (
                    <div className="p-4 bg-white border-b-4 border-indigo-500">
                      <h4 className="font-semibold text-slate-800 mb-2">Resolution Panel</h4>
                      <div className="space-y-4 max-w-2xl">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Official Response / Apology</label>
                          <textarea className="w-full p-2 border rounded" value={resForm.response_message} onChange={e => setResForm({ ...resForm, response_message: e.target.value })} />
                        </div>
                        <div className="flex gap-4">
                          <div className="w-1/2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Government Fine to Award (₹)</label>
                            <input type="number" className="w-full p-2 border rounded text-emerald-600 font-bold" value={resForm.fine_amount} onChange={e => setResForm({ ...resForm, fine_amount: e.target.value })} />
                          </div>
                          <div className="w-1/2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Corrected Annual CTC (₹)</label>
                            {resForm.salary_id ? (
                              <input type="number" className="w-full p-2 border rounded" value={resForm.override_ctc} onChange={e => setResForm({ ...resForm, override_ctc: e.target.value })} />
                            ) : (
                              <input type="text" className="w-full p-2 border rounded bg-gray-100 text-gray-400" disabled value="No approved salary found to edit" />
                            )}
                          </div>
                        </div>
                        <button onClick={submitResolution} className="bg-indigo-600 text-white font-bold px-6 py-2 rounded shadow hover:bg-indigo-700">Execute Resolution</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit-logs' && (
          <div className="bg-white rounded-xl shadow overflow-hidden border">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 flex items-center"><Activity className="w-5 h-5 mr-2 text-indigo-500" /> System Action Audit Logs</h3>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold uppercase tracking-widest">PRO Feature</span>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">System Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{log.user_id?.name || 'SYSTEM'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.user_id?.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {log.user_id?.role || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded text-xs font-bold font-mono border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{log.details}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No cryptographic audit logs recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tax-config' && (
          <div className="bg-white rounded-xl shadow overflow-hidden border max-w-4xl">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">Dynamic Tax Computation Engine</h3>
            </div>
            
            {!hasTaxAccess ? (
              <div className="p-12 text-center max-w-md mx-auto">
                <ShieldCheck className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-slate-800 mb-2">Restricted Access</h4>
                <p className="text-slate-500 mb-6 font-medium">Please enter your Administrator password to unlock the core tax configurations.</p>
                <form onSubmit={handleUnlockTaxEngine}>
                  <input type="password" required autoFocus className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none text-center font-bold text-lg tracking-widest text-slate-800 mb-4" placeholder="Enter Password" value={accessPassword} onChange={e=>setAccessPassword(e.target.value)} />
                  <button type="submit" className="w-full bg-indigo-600 text-white font-bold p-4 rounded-xl shadow-lg hover:bg-indigo-700">Unlock Engine Editor</button>
                </form>
              </div>
            ) : (
              <div className="p-8">
                <p className="text-slate-500 mb-6">Configure the global tier slabs, tax percentages, and additional templates. Changes take effect instantly for all new Admin Approvals.</p>
                <form onSubmit={saveTaxConfig} className="space-y-6">
                  
                  <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
                    <div className="flex justify-between items-center mb-4 border-b border-indigo-200 pb-2">
                      <h4 className="font-bold text-indigo-900">Dynamic Income Brackets</h4>
                      <button type="button" onClick={() => setTaxConfig({ ...taxConfig, slabs: [...taxConfig.slabs, { limit: 0, rate: 0 }] })} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 shadow flex items-center">+ Add New Bracket</button>
                    </div>

                    <div className="space-y-4">
                      {taxConfig.slabs?.map((slab, index) => (
                        <div key={index} className="flex gap-4 items-center bg-white p-4 rounded shadow border border-indigo-50">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">If Gross Salary &gt; (₹)</label>
                            <input type="number" required className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-300 outline-none" value={slab.limit} onChange={e => {
                              const newSlabs = [...taxConfig.slabs];
                              newSlabs[index].limit = Number(e.target.value);
                              setTaxConfig({ ...taxConfig, slabs: newSlabs });
                            }} disabled={index === 0} />
                            {index === 0 && <span className="text-[10px] text-gray-400 block mt-1">Base threshold fixed at 0</span>}
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Apply Flat Rate (%)</label>
                            <input type="number" required className="w-full p-2 border border-slate-200 rounded text-emerald-600 font-bold focus:ring-2 focus:ring-indigo-300 outline-none" value={slab.rate} onChange={e => {
                              const newSlabs = [...taxConfig.slabs];
                              newSlabs[index].rate = Number(e.target.value);
                              setTaxConfig({ ...taxConfig, slabs: newSlabs });
                            }} />
                          </div>
                          <div className="pt-5">
                            {index > 0 ? (
                              <button type="button" onClick={() => {
                                const newSlabs = taxConfig.slabs.filter((_, i) => i !== index);
                                setTaxConfig({ ...taxConfig, slabs: newSlabs });
                              }} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 border border-red-200 shadow-sm" title="Remove Slab"><XCircle className="w-5 h-5" /></button>
                            ) : (
                              <div className="w-10"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-6 rounded-lg border border-amber-100">
                    <h4 className="font-bold text-amber-900 mb-4">Templated Surcharges & Additional Taxes</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Education Cess (%)</label>
                        <input type="number" step="0.01" required className="w-full p-3 border rounded shadow-sm text-amber-600 font-bold" value={taxConfig.additional_cess_rate} onChange={e => setTaxConfig({ ...taxConfig, additional_cess_rate: e.target.value })} />
                        <p className="text-xs text-amber-600 mt-1">Applied on top of base tax</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Extra Surcharge (%)</label>
                        <input type="number" step="0.01" required className="w-full p-3 border rounded shadow-sm text-amber-600 font-bold" value={taxConfig.additional_surcharge_rate} onChange={e => setTaxConfig({ ...taxConfig, additional_surcharge_rate: e.target.value })} />
                        <p className="text-xs text-amber-600 mt-1">Applied to base tax configuration</p>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-colors flex justify-center items-center">
                    <Save className="w-6 h-6 mr-2" /> Deploy Global Tax Configuration
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow border border-slate-100 max-w-4xl">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4 flex items-center"><Megaphone className="w-6 h-6 mr-3 text-indigo-600" /> Dispatch Global Notice</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await axios.post('http://127.0.0.1:5000/api/admin/announcements', announceForm, { headers });
                  setMsg('Announcement dispatched instantly to all targets!');
                  setAnnounceForm({ title: '', message: '', target_audience: 'all' });
                  const an = await axios.get('http://127.0.0.1:5000/api/admin/announcements', { headers });
                  setAnnouncements(an.data);
                } catch (err) { alert(err.response?.data?.message || err.message); }
              }} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Headline</label>
                  <input type="text" required value={announceForm.title} onChange={e => setAnnounceForm({ ...announceForm, title: e.target.value })} className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="e.g., Q3 Income Tax Policy Update" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Detailed Message Form</label>
                  <textarea required value={announceForm.message} onChange={e => setAnnounceForm({ ...announceForm, message: e.target.value })} className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all" rows="4" placeholder="Enter full announcement body..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Destination Target</label>
                  <select value={announceForm.target_audience} onChange={e => setAnnounceForm({ ...announceForm, target_audience: e.target.value })} className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-indigo-900 font-bold bg-slate-50">
                    <option value="all">Global (All Users & Companies)</option>
                    <option value="company">Employers / Companies Only</option>
                    <option value="employee">Employees & Tax Payers Only</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black tracking-widest py-4 rounded-xl shadow hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg">DISPATCH TRANSMISSION</button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden border max-w-4xl">
               <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                 <h3 className="font-semibold text-slate-700">Dispatch History Ledger</h3>
                 <span className="text-xs font-bold bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full">{announcements.length} Records</span>
               </div>
               <div className="p-6 space-y-4">
                 {announcements.map(an => (
                   <div key={an._id} className="p-5 border-2 border-slate-100 rounded-xl shadow-sm bg-white relative hover:border-indigo-200 transition-colors">
                     <button onClick={async () => {
                       if(!window.confirm('Delete this announcement permanently from all endpoints?')) return;
                       try {
                         await axios.delete(`http://127.0.0.1:5000/api/admin/announcements/${an._id}`, { headers });
                         setAnnouncements(announcements.filter(a => a._id !== an._id));
                       } catch(err) {}
                     }} className="absolute top-5 right-5 text-slate-300 hover:text-red-500 transition-colors"><XCircle className="w-6 h-6"/></button>
                     <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest ${an.target_audience === 'all' ? 'bg-purple-100 text-purple-700' : an.target_audience === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>Target: {an.target_audience}</span>
                     <h4 className="font-extrabold text-slate-900 text-xl mt-3 mb-2">{an.title}</h4>
                     <p className="text-slate-600 leading-relaxed max-w-2xl">{an.message}</p>
                     <p className="text-xs text-slate-400 mt-4 font-mono">{new Date(an.createdAt).toLocaleString()} • Dispatch ID: {an._id.slice(-6).toUpperCase()}</p>
                   </div>
                 ))}
                 {announcements.length === 0 && (
                   <div className="text-center py-10">
                     <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                     <p className="text-slate-500 font-medium">No announcements have been dispatched through the mainframe yet.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow border max-w-2xl">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">Admin Profile & Settings</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Administrator Name</label>
                <input className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none" value={profileForm.name || ''} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Registered Email Address</label>
                <input disabled className="w-full p-3.5 border-2 border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" value={profileForm.email || ''} />
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed directly for security reasons.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Admin Designation</label>
                  <input className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none" value={profileForm.designation || ''} onChange={e => setProfileForm({ ...profileForm, designation: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Contact Phone</label>
                  <input className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none" value={profileForm.phone || ''} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-xl hover:bg-slate-800 flex justify-center items-center text-lg font-black tracking-wide shadow-xl hover:shadow-2xl transition-all">
                <Save className="w-5 h-5 mr-3" /> SAVE PROFILE
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
export default AdminDashboard;
