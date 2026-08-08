import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, TrendingUp, BookOpen, Play, LogOut, User, BarChart3,
  Flame, RefreshCw, Lock, Check, ChevronRight, Sparkles,
} from 'lucide-react';
import { repApi, trainingApi, lmsApi, cohortApi } from '../../services/api.js';
import SessionBriefCard from '../../components/training/SessionBriefCard.jsx';
import { getApiErrorMessage, logApiError } from '../../utils/apiError.js';

/**
 * LMS learning home ("Learn").
 *
 * Mental model borrowed from the best learning products:
 *  - A visible CURRICULUM PATH you move along (Duolingo units / Khan course
 *    map): the five cohort rungs from the real funnel, ordered easiest to
 *    hardest by actual close rate, with locked / current / completed states.
 *  - MASTERY LEVELS per skill (Khan Academy): Novice → Developing →
 *    Proficient → Mastered — shown only for skills the Observer has actually
 *    measured. Unmeasured skills are ghosted, never faked.
 *  - Today's lesson + streak (Duolingo): one clear next action.
 *  - Lessons due + grade book (Canvas): modules to study, past evaluations.
 */

const LADDER = ['east_belt_middle', 'premium_school', 'board_year', 'mainstream_middle', 'early_grade_value'];

const MASTERY = [
  { min: 80, label: 'Mastered', color: 'text-emerald-400', bar: 'bg-emerald-500' },
  { min: 60, label: 'Proficient', color: 'text-sky-400', bar: 'bg-sky-500' },
  { min: 40, label: 'Developing', color: 'text-amber-400', bar: 'bg-amber-500' },
  { min: 0, label: 'Novice', color: 'text-rose-400', bar: 'bg-rose-500' },
];

const pretty = (s) => String(s ?? '').replace(/_/g, ' ');

function masteryOf(score) {
  return MASTERY.find((m) => score >= m.min) ?? MASTERY[MASTERY.length - 1];
}

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

function PathRung({ cohort, state, isCurrent }) {
  const meta = cohort?.meta ?? {};
  return (
    <div
      className={`relative min-w-[220px] flex-1 rounded-2xl border p-4 transition ${
        state === 'locked'
          ? 'border-slate-800 bg-slate-900/40 opacity-55'
          : isCurrent
            ? 'border-indigo-500/60 bg-indigo-950/40 ring-1 ring-indigo-500/30'
            : 'border-emerald-600/40 bg-slate-900'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
          state === 'done' ? 'bg-emerald-500/20 text-emerald-400'
            : isCurrent ? 'bg-indigo-500/25 text-indigo-300' : 'bg-slate-800 text-slate-500'
        }`}
        >
          {state === 'done' ? <Check className="w-4 h-4" /> : state === 'locked' ? <Lock className="w-3.5 h-3.5" /> : <Sparkles className="w-4 h-4" />}
        </span>
        {isCurrent && <span className="text-[10px] uppercase tracking-wider text-indigo-300">Current unit</span>}
        {state === 'done' && <span className="text-[10px] uppercase tracking-wider text-emerald-400">Completed</span>}
      </div>
      <p className="text-white text-sm font-semibold capitalize leading-tight">{pretty(cohort?.cohortId)}</p>
      {meta.saleRate != null && (
        <p className="text-xs text-slate-500 mt-1">
          Real close rate {(meta.saleRate * 100).toFixed(1)}% · {Math.round((meta.volumeShare ?? 0) * 100)}% of calls
        </p>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {(cohort?.commonObjections ?? []).slice(0, 2).map((o) => (
          <span key={o} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] capitalize">{pretty(o)}</span>
        ))}
      </div>
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
  const [cohorts, setCohorts] = useState([]);
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
        cohortApi.list(),
      ]);
      const [profileRes, planRes, recRes, sessionsRes, cohortsRes] = results;

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      else logApiError('dashboard/profile', profileRes.reason);
      if (planRes.status === 'fulfilled') setPlan(planRes.value.data);
      else logApiError('dashboard/plan', planRes.reason);
      if (recRes.status === 'fulfilled') setRecommendations(recRes.value.data);
      else logApiError('dashboard/recommendations', recRes.reason);
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data);
      else logApiError('dashboard/sessions', sessionsRes.reason);
      if (cohortsRes.status === 'fulfilled') setCohorts(cohortsRes.value.data);
      else logApiError('dashboard/cohorts', cohortsRes.reason);

      if (results.every((r) => r.status === 'rejected')) {
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

  // ── Derived learning state ────────────────────────────────────────────
  const graph = profile?.skillGraph ?? [];
  // Measured = the Observer has scored this skill at least once for this rep.
  const measured = graph.filter((s) => s.sessionCount > 0);
  const unmeasured = graph.filter((s) => !s.sessionCount);
  const masteredCount = measured.filter((s) => s.score >= 80).length;

  const activeCohorts = LADDER
    .map((id) => cohorts.find((c) => c.cohortId === id && c.isActive))
    .filter(Boolean);
  const currentCohortId = plan?.sessionBrief?.cohortId;
  const currentIdx = Math.max(0, LADDER.indexOf(currentCohortId));

  // Streak: consecutive days with >=1 completed lesson (today may be pending)
  const days = new Set(sessions.map((s) => new Date(s.createdAt).toDateString()));
  let streak = 0;
  for (let i = 0; i <= 60; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak += 1;
    else if (i > 0) break;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading your learning path...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600">
              <GraduationCap className="w-5 h-5 text-white" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Sales Academy</h1>
              <p className="text-slate-500 text-xs">On-job training · {user.name}{profile?.city ? ` · ${profile.city}` : ''}</p>
            </div>
          </div>
          <nav className="flex items-center gap-1" aria-label="Primary">
            <span className="px-3 py-2 rounded-lg bg-slate-800/70 text-white text-sm">Learn</span>
            <button onClick={() => navigate('/train')} className="px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm">Practice</button>
            {user.role === 'admin' && (
              <Link to="/admin/analytics" className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm">
                <BarChart3 className="w-4 h-4" /> Classroom
              </Link>
            )}
            <Link to="/profile" aria-label="Profile" className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm">
              <User className="w-4 h-4" />
            </Link>
            <button onClick={logout} aria-label="Logout" className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={loadData} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 text-sm hover:bg-red-500/30 transition shrink-0">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {/* ── Today's lesson ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-end justify-between mb-3 gap-4">
            <div>
              <h2 className="text-white text-xl font-bold">Today&apos;s lesson</h2>
              <p className="text-slate-500 text-sm">Assigned by your learning plan from your weakest measured skills</p>
            </div>
            <button
              onClick={() => navigate('/train')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shrink-0"
            >
              <Play className="w-4 h-4" /> Start lesson
            </button>
          </div>
          {plan?.sessionBrief && <SessionBriefCard sessionBrief={plan.sessionBrief} />}
        </section>

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Flame} label="Day streak" value={streak} sub={streak === 0 ? 'Practice today to start one' : 'Keep it alive today'} color="bg-orange-500/20 text-orange-400" />
          <StatCard icon={GraduationCap} label="Skills mastered" value={`${masteredCount}/${measured.length || '—'}`} sub="Measured skills at 80+" color="bg-emerald-500/20 text-emerald-400" />
          <StatCard icon={TrendingUp} label="Lessons completed" value={sessions.length} color="bg-indigo-500/20 text-indigo-400" />
          <StatCard icon={BookOpen} label="Lessons due" value={recommendations.length} sub="From your skill gaps" color="bg-purple-500/20 text-purple-400" />
        </div>

        {/* ── Curriculum path ────────────────────────────────────────── */}
        <section>
          <h2 className="text-white text-xl font-bold mb-1">Your curriculum</h2>
          <p className="text-slate-500 text-sm mb-4">
            Five customer segments from the real sales funnel, ordered easiest → hardest by actual close rate. Master the current unit to unlock the next.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {activeCohorts.map((c, i) => (
              <PathRung
                key={c.cohortId}
                cohort={c}
                isCurrent={i === currentIdx}
                state={i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'locked'}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Mastery (measured skills only) ───────────────────────── */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-white">Skill mastery</h2>
              <div className="flex gap-3">
                {MASTERY.slice().reverse().map((m) => (
                  <span key={m.label} className={`text-[10px] uppercase tracking-wide ${m.color}`}>{m.label}</span>
                ))}
              </div>
            </div>
            {measured.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center">
                Complete your first lesson — mastery appears once the Observer has evidence to score you.
              </p>
            ) : (
              <div className="space-y-3">
                {[...measured].sort((a, b) => a.score - b.score).map((s) => {
                  const m = masteryOf(s.score);
                  return (
                    <div key={s.skillId}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm text-white capitalize">{s.name ?? pretty(s.skillId)}</span>
                        <span className={`text-xs font-semibold ${m.color}`}>{m.label} · {s.score}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${m.bar} transition-all`} style={{ width: `${s.score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {unmeasured.length > 0 && (
              <p className="text-xs text-slate-600 mt-4">
                {unmeasured.length} more skills not yet measured — they unlock as your lessons exercise them.
              </p>
            )}
          </div>

          {/* ── Lessons due + grade book ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">Lessons due</h2>
              {recommendations.length === 0 ? (
                <p className="text-slate-500 text-sm">Nothing due — your plan will assign modules as gaps appear.</p>
              ) : (
                <div className="space-y-2">
                  {recommendations.map((rec) => (
                    <div key={rec.moduleId} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-white text-sm font-medium">{rec.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{rec.reason}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">Grade book</h2>
              {sessions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No evaluations yet.</p>
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
                          <span className="text-white text-sm capitalize">{pretty(s.objective)}</span>
                          <span className={`text-sm font-semibold ${s.overallScore >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {s.overallScore ?? '—'}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">
                          {new Date(s.createdAt).toLocaleDateString()}
                          {s.evaluationMode === 'mock' ? ' · heuristic' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
