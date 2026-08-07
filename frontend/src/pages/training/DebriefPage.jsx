import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { trainingApi } from '../../services/api.js';
import { getApiErrorMessage, isNotFoundError, logApiError } from '../../utils/apiError.js';

export default function DebriefPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [debrief, setDebrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDebrief() {
      setLoading(true);
      setError('');
      try {
        const { data } = await trainingApi.getDebrief(sessionId);
        setDebrief(data);
      } catch (err) {
        logApiError('debrief', err);
        if (isNotFoundError(err)) {
          setError('Debrief not available yet. End the simulation first to generate your evaluation.');
        } else {
          setError(getApiErrorMessage(err, 'Failed to load debrief'));
        }
      } finally {
        setLoading(false);
      }
    }
    loadDebrief();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading debrief...</p>
      </div>
    );
  }

  if (error || !debrief) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-slate-400 text-center max-w-md">{error || 'Debrief not found'}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm transition"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/train/${sessionId}`)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm transition"
          >
            Return to Simulation
          </button>
        </div>
      </div>
    );
  }

  const objectiveDelta = debrief.skillDeltas?.find((d) => d.skillId === debrief.objective);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Session Debrief</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-indigo-400 text-xs uppercase tracking-wider">Objective</p>
            {debrief.evaluationMode === 'mock' && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300"
                title="The AI service was unavailable; these scores come from a deterministic keyword heuristic and carry low confidence."
              >
                HEURISTIC EVALUATION
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold capitalize mb-4">{debrief.objective?.replace(/_/g, ' ')}</h2>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-slate-500 text-xs">Overall Score</p>
              <p className={`text-4xl font-bold ${debrief.overallScore >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {debrief.overallScore}
              </p>
            </div>
            {objectiveDelta && (
              <div>
                <p className="text-slate-500 text-xs">Skill Change</p>
                <div className="flex items-center gap-2">
                  {objectiveDelta.delta >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`text-2xl font-bold ${objectiveDelta.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {objectiveDelta.previousScore} → {objectiveDelta.newScore}
                  </span>
                </div>
              </div>
            )}
            <div>
              <p className="text-slate-500 text-xs">Duration</p>
              <p className="text-xl font-semibold">{(debrief.durationMinutes ?? 0) < 1 ? '<1 min' : `${debrief.durationMinutes} min`}</p>
            </div>
          </div>
        </div>

        {debrief.coachFeedback && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-indigo-400 mb-2">Coach Feedback</h3>
            <p className="text-slate-300">{debrief.coachFeedback}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Mistakes
            </h3>
            {debrief.mistakes?.length ? (
              <ul className="space-y-2">
                {debrief.mistakes.map((m, i) => (
                  <li key={i} className="text-sm text-slate-400 flex gap-2">
                    <span className="text-amber-400">•</span> {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No major mistakes detected</p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Highlights
            </h3>
            {debrief.highlights?.length ? (
              <ul className="space-y-2">
                {debrief.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-slate-400 flex gap-2">
                    <span className="text-emerald-400">•</span> {h}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Keep practicing to build highlights</p>
            )}
          </div>
        </div>

        {debrief.skillDeltas?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Skill Updates</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {debrief.skillDeltas
                .filter((d) => Math.abs(d.delta) >= 1)
                .slice(0, 12)
                .map((d) => (
                  <div key={d.skillId} className="flex justify-between p-2 rounded-lg bg-slate-800/50 text-sm">
                    <span className="text-slate-400 capitalize truncate">{d.skillId.replace(/_/g, ' ')}</span>
                    <span className={d.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {d.delta > 0 ? '+' : ''}{d.delta}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {debrief.lmsRecommendations?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" /> Recommended LMS Modules
            </h3>
            <div className="space-y-2">
              {debrief.lmsRecommendations.map((rec) => (
                <div key={rec.moduleId} className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-white text-sm font-medium">{rec.title ?? rec.moduleId}</p>
                  <p className="text-slate-500 text-xs mt-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/train')}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
        >
          Start Next Simulation
        </button>
      </main>
    </div>
  );
}
