import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4001/api';

function App() {
  const [purposes, setPurposes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [newPurpose, setNewPurpose] = useState({ name: '', description: '', dataItems: '' });
  
  const fetchDashboardData = async () => {
    try {
      const purposeRes = await fetch(`${API_URL}/purposes`);
      setPurposes(await purposeRes.json());
      
      const logsRes = await fetch(`${API_URL}/audit`);
      setLogs(await logsRes.json());
    } catch(e) {
      console.error('Failed to fetch data', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreatePurpose = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsArray = newPurpose.dataItems.split(',').map(s => s.trim());
    await fetch(`${API_URL}/purposes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newPurpose, dataItems: itemsArray })
    });
    setNewPurpose({ name: '', description: '', dataItems: '' });
    fetchDashboardData();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Fiduciary Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage processing purposes and audit consent logs (B2B Tool)</p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg text-sm text-blue-700 font-semibold border border-blue-100">
            DPO Portal
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Define Purpose</h2>
                <form onSubmit={handleCreatePurpose} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purpose Name</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newPurpose.name} onChange={e => setNewPurpose({...newPurpose, name: e.target.value})} placeholder="e.g. Loan Processing" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea required className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newPurpose.description} onChange={e => setNewPurpose({...newPurpose, description: e.target.value})} placeholder="Why is this data needed?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Items Required</label>
                    <input required type="text" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newPurpose.dataItems} onChange={e => setNewPurpose({...newPurpose, dataItems: e.target.value})} placeholder="Location, Income, Name (comma separated)" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md transition-colors">Create Purpose</button>
                </form>
             </div>
          </div>
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Active Purposes</h2>
              {purposes.length === 0 ? <p className="text-gray-500">No purposes defined yet.</p> : (
                <ul className="space-y-3">
                  {purposes.map(p => (
                    <li key={p.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex flex-col">
                      <span className="font-bold text-lg text-gray-800">{p.name}</span>
                      <span className="text-gray-600 text-sm mt-1">{p.description}</span>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {JSON.parse(p.dataItems).map((item: string, idx: number) => (
                           <span key={idx} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">{item}</span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Consent Audit Logs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-3 text-sm font-semibold text-gray-600">Artefact ID</th>
                      <th className="p-3 text-sm font-semibold text-gray-600">User Phone</th>
                      <th className="p-3 text-sm font-semibold text-gray-600">Purpose</th>
                      <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-xs font-mono text-gray-500">{log.id.slice(0, 10)}...</td>
                        <td className="p-3 text-sm">{log.customer?.phone || 'Unknown'}</td>
                        <td className="p-3 text-sm">{log.purposeText}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && <p className="text-gray-500 mt-4 text-center">No logs generated yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
