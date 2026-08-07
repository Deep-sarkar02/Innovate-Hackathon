import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Users, Target, BookOpen } from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import { logApiError } from '../../utils/apiError.js';

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

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    Promise.all([analyticsApi.getTeam(), analyticsApi.getLeaderboard()])
      .then(([teamRes, lbRes]) => {
        setTeam(teamRes.data);
        setLeaderboard(lbRes.data);
      })
      .catch((err) => logApiError('admin-analytics', err));
  }, []);

  const trend = team?.teamWeakestSkill?.trend ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Manager Analytics</h1>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Target}
            label="Team Weakest Skill"
            value={team?.teamWeakestSkill?.name ?? '—'}
            sub={team?.teamWeakestSkill ? `Avg: ${team.teamWeakestSkill.averageScore}` : undefined}
            color="bg-amber-500/20 text-amber-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Skill Trend"
            value={trend >= 0 ? `↑${trend}%` : `↓${Math.abs(trend)}%`}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            icon={Users}
            label="Total Sessions"
            value={team?.totalSessions ?? 0}
            sub={`Avg score: ${team?.averageOverallScore ?? 0}`}
            color="bg-indigo-500/20 text-indigo-400"
          />
          <StatCard
            icon={BookOpen}
            label="Recommended Module"
            value={team?.recommendedLmsModule?.title?.split(' ')[0] ?? '—'}
            sub={team?.recommendedLmsModule?.title}
            color="bg-purple-500/20 text-purple-400"
          />
        </div>

        {team?.mostFailedCohort && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="font-semibold mb-2">Most Failed Cohort</h2>
            <p className="text-amber-400 text-lg">{team.mostFailedCohort.cohort}</p>
            <p className="text-slate-400 text-sm">
              {team.mostFailedCohort.failRate}% failure rate across {team.mostFailedCohort.sessions} sessions
            </p>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Rep Leaderboard (Learning Velocity)</h2>
          {leaderboard.length === 0 ? (
            <p className="text-slate-500 text-sm">No rep data yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((rep, i) => (
                <div key={rep.repId} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 w-6 text-sm">#{i + 1}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{rep.name}</p>
                      <p className="text-slate-500 text-xs">{rep.city}</p>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-semibold">{rep.learningVelocity?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
