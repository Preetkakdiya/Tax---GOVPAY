import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { UserCircle, Receipt, AlertCircle, Download, FileText, Settings, Save, Send, Megaphone } from 'lucide-react';
import { io } from 'socket.io-client';

const EmployeeDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [salaries, setSalaries] = useState([]);
  const [complaintMsg, setComplaintMsg] = useState('');
  const [myComplaints, setMyComplaints] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [msg, setMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileForm, setProfileForm] = useState({ name: '', pan: '', email: '', phone: '', designation: '', bank_account: '', ifsc_code: '', address: '' });

  const headers = { Authorization: `Bearer ${user?.token}` };

  const loadData = async () => {
    try {
      const sRes = await axios.get('http://127.0.0.1:5000/api/employee/my-salary', { headers });
      setSalaries(sRes.data);
      const cRes = await axios.get('http://127.0.0.1:5000/api/employee/complaints', { headers });
      setMyComplaints(cRes.data);
      const aRes = await axios.get('http://127.0.0.1:5000/api/employee/announcements', { headers });
      setAnnouncements(aRes.data);
      if (activeTab === 'profile') {
        const pRes = await axios.get('http://127.0.0.1:5000/api/employee/profile', { headers });
        setProfileForm(pRes.data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    loadData(); 
    setMsg(null); 

    const socket = io('http://127.0.0.1:5000');
    socket.on('salary_updated', () => {
      loadData();
    });
    socket.on('new_announcement', () => {
      loadData();
    });

    return () => socket.disconnect();
  }, [activeTab]);

  const handleFileComplaint = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:5000/api/employee/complaint', { message: complaintMsg }, { headers });
      setComplaintMsg('');
      setMsg('Complaint routed to GovPay+ regional admin successfully.');
      loadData();
    } catch (err) { alert(err.message); }
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://127.0.0.1:5000/api/employee/profile', profileForm, { headers });
      setMsg('Personal Profile gracefully updated. Any changes to Bank Account or IFSC are instantly synchronized with your employer.');
      loadData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const downloadSalarySlip = async (rec) => {
    try {
      setMsg('Generating official PDF from GovPay+ Network...');
      const res = await axios.get(`http://127.0.0.1:5000/api/employee/salary/${rec._id}/pdf`, {
        headers,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GovPay_Salary_${rec.month}_${rec.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      setMsg('Official PDF successfully downloaded.');
    } catch (err) { alert('Error securely downloading PDF document.'); }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="w-64 bg-teal-900 text-white flex flex-col">
        <div className="p-6 border-b border-teal-800">
          <div className="flex items-center space-x-3"><UserCircle/><h1 className="text-xl font-bold">GovPay+ User</h1></div>
          <p className="text-teal-300 mt-2 text-sm">{user?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={()=>setActiveTab('dashboard')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab==='dashboard' ? 'bg-teal-700 shadow-inner' : 'hover:bg-teal-800'}`}><Receipt className="mr-3 w-5 h-5"/> Income Dash</button>
          <button onClick={()=>setActiveTab('announcements')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab==='announcements' ? 'bg-teal-700 shadow-inner' : 'hover:bg-teal-800'}`}>
            <Megaphone className="mr-3 w-5 h-5"/> 
            Public Notices
            {announcements.length > 0 && <span className="ml-auto bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{announcements.length}</span>}
          </button>
          <button onClick={()=>setActiveTab('profile')} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeTab==='profile' ? 'bg-teal-700 shadow-inner' : 'hover:bg-teal-800'}`}><Settings className="mr-3 w-5 h-5"/> Profile Config</button>
        </nav>
        <button onClick={logout} className="p-4 bg-teal-800 hover:bg-teal-700 mx-4 mb-2 rounded-lg font-bold">Sign Out</button>
        <div className="p-4 border-t border-teal-800 text-center text-xs mt-auto">
          <p className="text-teal-500 mb-1">Developed by</p>
          <p className="text-teal-300 font-bold mb-2 tracking-wide">Preet kakdiya</p>
          <div className="flex justify-center space-x-4">
            <a href="https://github.com/Preetkakdiya" target="_blank" rel="noreferrer" className="text-teal-200 hover:text-white">GitHub</a>
            <a href="https://www.linkedin.com/in/preet-kakdiya-8b6025295" target="_blank" rel="noreferrer" className="text-teal-200 hover:text-white">LinkedIn</a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 lg:pr-12">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Your Income Portal</h2>
        
        {msg && <div className="bg-emerald-100 text-emerald-800 p-4 rounded mb-6 flex justify-between font-semibold shadow">{msg} <button onClick={()=>setMsg(null)} className="font-bold text-emerald-500 hover:text-emerald-900">X</button></div>}
        
        {activeTab === 'dashboard' && (
          <>
            <div className="bg-white rounded-xl shadow overflow-hidden border mb-8">
              <div className="p-4 bg-slate-50 border-b"><h3 className="font-semibold text-slate-700">Salary History</h3></div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month/Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Annual CTC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Base</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly TDS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Take Home</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Download</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salaries.map((rec) => (
                    <tr key={rec._id}>
                      <td className="px-6 py-4">{rec.company_id?.name || 'Unknown'}</td>
                      <td className="px-6 py-4">{rec.month} {rec.year}</td>
                      <td className="px-6 py-4 font-bold text-gray-600">₹{rec.ctc?.toLocaleString() || 'N/A'}</td>
                      <td className="px-6 py-4 font-medium text-indigo-600">₹{rec.monthly_salary?.toLocaleString() || 'N/A'}</td>
                      <td className="px-6 py-4 text-red-600 font-bold">₹{rec.monthly_tds?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold text-lg">₹{rec.net_salary?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rec.status === 'approved' ? 'bg-green-100 text-green-800' : (rec.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                          {rec.status === 'pending' ? 'Pending Admin' : rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {rec.status === 'approved' ? (
                          <button onClick={()=>downloadSalarySlip(rec)} className="text-indigo-600 hover:text-indigo-900 border border-indigo-200 p-1 rounded shadow-sm hover:shadow"><Download className="w-5 h-5"/></button>
                        ) : (
                          <span className="text-gray-400 text-sm">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {salaries.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-500">No salary records found.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow border border-red-100">
                <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center"><AlertCircle className="mr-2"/> Report Grievance</h3>
                <p className="text-sm text-gray-600 mb-4">If your employer submitted inaccurate gross salary figures or your tax is incorrectly levied, file an official grievance. The admin will intervene.</p>
                <form onSubmit={handleFileComplaint}>
                  <textarea className="w-full p-3 border rounded-lg focus:ring-red-500 focus:border-red-500 mb-4 h-32 outline-none" placeholder="Describe your issue with salary calculations..." value={complaintMsg} onChange={e=>setComplaintMsg(e.target.value)} required></textarea>
                  <button type="submit" className="w-full bg-red-600 text-white px-6 py-3 rounded-lg shadow hover:bg-red-700 font-bold text-center flex justify-center"><Send className="w-5 h-5 mr-2"/> Submit Complaint</button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center"><FileText className="mr-2"/> Grievance History & Fines</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {myComplaints.length === 0 && <p className="text-sm text-gray-400">You have not submitted any complaints.</p>}
                  {myComplaints.map(c => (
                    <div key={c._id} className={`p-4 border rounded-lg ${c.status==='resolved' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <p className="text-sm text-slate-800 font-medium mb-1">Your Message:</p>
                      <p className="text-sm text-slate-600 mb-3">"{c.message}"</p>
                      
                      <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2">
                        <span className={`text-xs font-bold uppercase ${c.status==='resolved' ? 'text-emerald-600' : 'text-amber-500'}`}>{c.status}</span>
                      </div>

                      {c.status === 'resolved' && (
                        <div className="mt-3 bg-white p-3 rounded-lg border shadow-sm">
                          <p className="text-xs font-bold text-indigo-700 mb-1">Government Admin Response:</p>
                          <p className="text-sm text-slate-700 italic">"{c.response_message}"</p>
                          {c.fine_amount > 0 && (
                            <p className="mt-2 text-sm font-bold text-emerald-700">Gov. Fine Awarded: ₹{c.fine_amount}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'announcements' && (
          <div className="max-w-4xl">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><Megaphone className="w-6 h-6 mr-3 text-amber-500" /> Official Government Communications</h3>
            <div className="space-y-4">
              {announcements.map(an => (
                <div key={an._id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-amber-500 relative hover:shadow-md transition-shadow">
                  <span className="absolute top-4 right-4 text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full uppercase tracking-wider">{an.target_audience === 'all' ? 'Global Broadcast' : 'Employee Directive'}</span>
                  <h4 className="font-bold text-slate-900 text-lg mb-2 mr-32">{an.title}</h4>
                  <p className="text-slate-600 leading-relaxed max-w-2xl">{an.message}</p>
                  <p className="text-xs text-slate-400 mt-4 font-mono border-t border-slate-100 pt-3">{new Date(an.createdAt).toLocaleString()} • Authenticated GovPay+ Gateway</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                  <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">There are currently no official notices for your account block.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white p-8 rounded-xl shadow border max-w-4xl">
            <div className="flex items-center mb-6 border-b pb-3">
              <div className="bg-teal-100 p-3 rounded-full mr-4 shadow-inner">
                <UserCircle className="w-8 h-8 text-teal-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Personal Identity & Profile</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Core Identity constraints</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Legal Full Name *</label>
                    <input className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none" value={profileForm.name || ''} onChange={e=>setProfileForm({...profileForm, name: e.target.value})} required />
                  </div>
                  <div className="opacity-75">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registered Account Email *</label>
                    <input disabled className="w-full p-2.5 border rounded bg-gray-100 text-gray-500 cursor-not-allowed shadow-sm" value={profileForm.email || ''} title="Contact GovPay Security Admin to migrate your email account." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID (PAN Number) *</label>
                    <input className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none uppercase font-semibold text-emerald-800" value={profileForm.pan || ''} onChange={e=>setProfileForm({...profileForm, pan: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input type="date" className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-700" title="DOB coming soon" />
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Banking & Financial Routing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account Number</label>
                    <input placeholder="Enter Account Number" className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono text-slate-800 tracking-wide" value={profileForm.bank_account || ''} onChange={e=>setProfileForm({...profileForm, bank_account: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code / Routing Number</label>
                    <input placeholder="ABCD0123456" className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono text-slate-800 uppercase tracking-wide" value={profileForm.ifsc_code || ''} onChange={e=>setProfileForm({...profileForm, ifsc_code: e.target.value})} />
                  </div>
                </div>
                <p className="text-xs text-teal-600 bg-teal-50 p-2 rounded border border-teal-100 font-medium">Any updates to your Bank Account or IFSC code are automatically synchronized with your Company's payroll roster in real-time.</p>
              </div>

              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Extended Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Designation</label>
                    <input placeholder="e.g. Senior Developer, Manager..." className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none" value={profileForm.designation || ''} onChange={e=>setProfileForm({...profileForm, designation: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone Number</label>
                    <input placeholder="+91..." className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none" value={profileForm.phone || ''} onChange={e=>setProfileForm({...profileForm, phone: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Residential Address</label>
                    <textarea rows="3" placeholder="Enter full permanent residential address..." className="w-full p-2.5 border rounded shadow-sm focus:ring-2 focus:ring-teal-500 outline-none" value={profileForm.address || ''} onChange={e=>setProfileForm({...profileForm, address: e.target.value})}></textarea>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-teal-700 text-white font-bold p-4 rounded-xl shadow-lg hover:bg-teal-800 flex justify-center items-center mt-6 transition-colors text-lg">
                <Save className="w-5 h-5 mr-3" /> Save Comprehensive Details
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
export default EmployeeDashboard;
