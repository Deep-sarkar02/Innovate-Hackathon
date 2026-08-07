import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cohortApi } from '../../services/api.js';
import { logApiError } from '../../utils/apiError.js';

export default function AdminCohortsPage() {
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState([]);

  useEffect(() => {
    cohortApi.list().then(({ data }) => setCohorts(data)).catch((err) => logApiError('admin-cohorts', err));
  }, []);

  const grouped = cohorts.reduce((acc, c) => {
    if (!acc[c.cohortId]) acc[c.cohortId] = [];
    acc[c.cohortId].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Cohort Versions</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {Object.entries(grouped).map(([cohortId, versions]) => (
          <div key={cohortId} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">{cohortId}</h2>
            <div className="space-y-3">
              {versions.sort((a, b) => b.version - a.version).map((v) => (
                <div key={v._id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Version {v.version}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${v.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {v.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">{v.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v.commonObjections?.map((o) => (
                      <span key={o} className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-300">{o.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
