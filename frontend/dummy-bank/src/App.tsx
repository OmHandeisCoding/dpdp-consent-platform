import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4001/api';

function App() {
  const [purposes, setPurposes] = useState<any[]>([]);
  const [phone, setPhone] = useState('9999999999');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/purposes`)
      .then(r => r.json())
      .then(data => {
        setPurposes(data);
        if(data.length > 0) setSelectedPurpose(data[0].id);
      }).catch(e => console.error(e));
  }, []);

  const triggerConsent = async () => {
    setStatusMsg('Initiating consent request...');
    try {
      const res = await fetch(`${API_URL}/consent/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purposeId: selectedPurpose })
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error);
      setStatusMsg(`Success! Consent Request launched. Open your CM App to approve it.`);
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-sky-800 p-8 text-center text-white">
          <h1 className="text-3xl font-extrabold tracking-tight">TrustBank™</h1>
          <p className="mt-2 text-sky-100 font-medium">Your trusted financial partner</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-700">
            <h3 className="font-bold text-slate-900 mb-2">Simulate Data Collection 🚀</h3>
            <p className="mb-2">This is a mock banking site. To use our "Premium Services", we need your consent to collect specific data via the official DPDP Consent Manager.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Your Registered Phone Number (linked to CM)</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-center text-lg" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Service Required (Select Purpose)</label>
              <select value={selectedPurpose} onChange={e=>setSelectedPurpose(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 bg-white">
                {purposes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <button onClick={triggerConsent} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg shadow-md transition-all active:scale-[0.98]">
              Request Consent via CM 🔐
            </button>
            
            {statusMsg && (
              <div className={`p-4 rounded-lg text-sm text-center font-medium ${statusMsg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {statusMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
