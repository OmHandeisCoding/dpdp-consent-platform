import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/api';

function App() {
  const [phone, setPhone] = useState('9999999999'); // Default mock logged-in user
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activeConsents, setActiveConsents] = useState<any[]>([]);

  const fetchUserData = async () => {
    try {
      const pendingRes = await fetch(`${API_URL}/users/${phone}/requests`);
      setPendingRequests(await pendingRes.json());

      const activeRes = await fetch(`${API_URL}/users/${phone}/consents`);
      setActiveConsents(await activeRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn]);

  const handleApprove = async (id: string) => {
    await fetch(`${API_URL}/requests/${id}/approve`, { method: 'POST' });
    fetchUserData();
  };
  
  const handleDeny = async (id: string) => {
    await fetch(`${API_URL}/requests/${id}/deny`, { method: 'POST' });
    fetchUserData();
  };

  const handleWithdraw = async (id: string) => {
    await fetch(`${API_URL}/consents/${id}/revoke`, { method: 'POST' });
    fetchUserData();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-indigo-900 mb-2">Consent Manager</h1>
            <p className="text-gray-500">Your remote control for data privacy</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-center text-lg" placeholder="10 digit phone" />
            </div>
            <button onClick={() => setIsLoggedIn(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors">
              Login via OTP (Simulated)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-indigo-900 text-white p-6 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Principal Dashboard</h1>
            <p className="opacity-80 text-sm mt-1">Logged in as {phone}</p>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="bg-indigo-800 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">Logout</button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-6 space-y-8 mt-6">
        
        {/* Pending Requests */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded text-sm">{pendingRequests.length}</span>
            Pending Consent Requests
          </h2>
          {pendingRequests.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
              No pending requests! You're all caught up.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-xl shadow-sm border border-amber-200 border-l-4 border-l-amber-400">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{req.fiduciary?.name || 'Unknown Fiduciary'}</h3>
                      <p className="text-sm text-gray-600 mt-1">is requesting access to your data</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm border">
                    <p className="font-semibold text-gray-700 mb-1">Purpose of processing:</p>
                    <p className="text-gray-600 mb-3">{req.purposeText}</p>
                    
                    <p className="font-semibold text-gray-700 mb-1">Data requested:</p>
                    <div className="flex gap-2 flex-wrap">
                      {JSON.parse(req.dataItems).map((item: string, idx: number) => (
                        <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{item}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button onClick={() => handleApprove(req.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors">Approve</button>
                    <button onClick={() => handleDeny(req.id)} className="px-6 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium py-2 rounded-lg transition-colors">Deny</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Consents */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">{activeConsents.length}</span>
            Active Consents
          </h2>
          {activeConsents.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
              You haven't given any consents yet.
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeConsents.map(consent => (
                 <div key={consent.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-gray-800">{consent.fiduciary?.name || 'Unknown'}</h3>
                   </div>
                   <p className="text-xs text-gray-500 mb-3 line-clamp-1">{consent.purposeText}</p>
                   <div className="flex gap-1 mb-4 flex-wrap">
                      {JSON.parse(consent.dataItems).map((item: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-[2px] rounded border">{item}</span>
                      ))}
                   </div>
                   <div className="flex justify-between items-end mt-auto pt-2 border-t">
                      <span className="text-[10px] text-gray-400 font-mono" title={consent.signature}>ID: {consent.id.slice(0, 8)}...</span>
                      <button onClick={() => handleWithdraw(consent.id)} className="text-sm text-red-600 hover:text-red-800 font-semibold underline underline-offset-2">Withdraw</button>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;
