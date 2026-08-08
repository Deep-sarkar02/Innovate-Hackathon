import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target, TrendingUp, BookOpen, Play, LogOut, User, BarChart3, Zap, RefreshCw } from 'lucide-react';
import { repApi, trainingApi, lmsApi } from '../../services/api.js';
import SkillRadarChart from '../../components/training/SkillRadarChart.jsx';
import SessionBriefCard from '../../components/training/SessionBriefCard.jsx';
import { getApiErrorMessage, logApiError } from '../../utils/apiError.js';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`inline-flex p-2.5 rounded-xl ${color} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-slate-400 text-sm">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        repApi.getMyProfile(),
        trainingApi.getTodayPlan(),
        lmsApi.getMyRecommendations(),
        trainingApi.listSessions(),
      ]);

      const [profileRes, planRes, recRes, sessionsRes] = results;

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      else logApiError('dashboard/profile', profileRes.reason);

      if (planRes.status === 'fulfilled') setPlan(planRes.value.data);
      else logApiError('dashboard/plan', planRes.reason);

      if (recRes.status === 'fulfilled') setRecommendations(recRes.value.data);
      else logApiError('dashboard/recommendations', recRes.reason);

      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data);
      else logApiError('dashboard/sessions', sessionsRes.reason);

      const allFailed = results.every((r) => r.status === 'rejected');
      if (allFailed) {
        setError(getApiErrorMessage(results[0].reason, 'Unable to reach the training server. Is the backend running?'));
      }
    } catch (err) {
      logApiError('dashboard', err);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  const weakest = profile?.skillGraph
    ?.filter((s) => s.score < 60)
    .sort((a, b) => a.score - b.score)[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading your training dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Adaptive Sales Training</h1>
            <p className="text-slate-400 text-sm">Welcome, {user.name}{profile?.city ? ` · ${profile.city}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'admin' && (
              <Link to="/admin/analytics" className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm">
                <BarChart3 className="w-4 h-4" /> Analytics
              </Link>
            )}
            <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm">
              <User className="w-4 h-4" /> Profile
            </Link>
            <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 text-sm hover:bg-red-500/30 transition shrink-0"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {plan?.sessionBrief && <SessionBriefCard sessionBrief={plan.sessionBrief} />}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Target}
            label="Weakest Skill"
            value={weakest?.name ?? '—'}
            sub={weakest ? `Score: ${weakest.score}` : undefined}
            color="bg-amber-500/20 text-amber-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Learning Velocity"
            value={profile?.learningVelocity?.toFixed(2) ?? '0'}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            icon={Zap}
            label="Sessions Completed"
            value={sessions.length}
            color="bg-indigo-500/20 text-indigo-400"
          />
          <StatCard
            icon={BookOpen}
            label="LMS Modules Due"
            value={recommendations.length}
            color="bg-purple-500/20 text-purple-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Skill Radar</h2>
            <SkillRadarChart
              skills={profile?.skillGraph ?? []}
              highlightIds={plan?.sessionBrief?.objective ? [plan.sessionBrief.objective] : []}
            />
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Start Training</h2>
              <p className="text-slate-400 text-sm mb-4">
                Your planner has assigned today&apos;s simulation. The AI will play the customer.
              </p>
              <button
                onClick={() => navigate('/train')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
              >
                <Play className="w-5 h-5" />
                Begin Simulation
              </button>
            </div>

            {recommendations.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Recommended Modules</h2>
                <div className="space-y-2">
                  {recommendations.map((rec) => (
                    <div key={rec.moduleId} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <p className="text-white text-sm font-medium">{rec.title}</p>
                      <p className="text-slate-500 text-xs mt-1">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Sessions</h2>
            {sessions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No sessions yet. Start your first simulation!</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 6).map((s) => {
                  const id = s.sessionId ?? s._id;
                  return (
                    <div
                      key={id}
                      onClick={() => navigate(`/train/${id}/debrief`)}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 cursor-pointer transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm capitalize">{s.objective?.replace(/_/g, ' ')}</span>
                        <span className={`text-sm font-semibold ${s.overallScore >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {s.overallScore}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
