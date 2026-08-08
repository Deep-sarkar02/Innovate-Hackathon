import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { trainingApi } from '../../services/api.js';
import AppShell from '../../components/layout/AppShell.jsx';
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading debrief...</p>
      </div>
    );
  }

  if (error || !debrief) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-slate-600 text-center max-w-md">{error || 'Debrief not found'}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm transition"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/train/${sessionId}`)}
            className="px-4 py-2 rounded-lg bg-[#24408E] hover:bg-[#1d3574] text-white text-sm transition"
          >
            Return to Simulation
          </button>
        </div>
      </div>
    );
  }

  const objectiveDelta = debrief.skillDeltas?.find((d) => d.skillId === debrief.objective);

  return (
    <AppShell title="Session Debrief">
      <main className="max-w-4xl px-8 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[#24408E] text-xs uppercase tracking-wider font-semibold">Objective</p>
            {debrief.evaluationMode === 'mock' && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700"
                title="The AI service was unavailable; these scores come from a deterministic keyword heuristic and carry low confidence."
              >
                HEURISTIC EVALUATION
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold capitalize mb-4 text-slate-900">{debrief.objective?.replace(/_/g, ' ')}</h2>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-slate-400 text-xs">Overall Score</p>
              <p className={`text-4xl font-bold ${debrief.overallScore >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {debrief.overallScore}
              </p>
            </div>
            {objectiveDelta && (
              <div>
                <p className="text-slate-400 text-xs">Skill Change</p>
                <div className="flex items-center gap-2">
                  {objectiveDelta.delta >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-2xl font-bold ${objectiveDelta.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {objectiveDelta.previousScore} → {objectiveDelta.newScore}
                  </span>
                </div>
              </div>
            )}
            <div>
              <p className="text-slate-400 text-xs">Duration</p>
              <p className="text-xl font-semibold text-slate-900">{(debrief.durationMinutes ?? 0) < 1 ? '<1 min' : `${debrief.durationMinutes} min`}</p>
            </div>
          </div>
        </div>

        {debrief.coachFeedback && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#24408E] mb-2">Coach Feedback</h3>
            <p className="text-slate-700">{debrief.coachFeedback}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Mistakes
            </h3>
            {debrief.mistakes?.length ? (
              <ul className="space-y-2">
                {debrief.mistakes.map((m, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-amber-500">•</span> {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No major mistakes detected</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Highlights
            </h3>
            {debrief.highlights?.length ? (
              <ul className="space-y-2">
                {debrief.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-emerald-600">•</span> {h}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Keep practicing to build highlights</p>
            )}
          </div>
        </div>

        {debrief.skillDeltas?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Skill Updates</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {debrief.skillDeltas
                .filter((d) => Math.abs(d.delta) >= 1)
                .slice(0, 12)
                .map((d) => (
                  <div key={d.skillId} className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                    <span className="text-slate-600 capitalize truncate">{d.skillId.replace(/_/g, ' ')}</span>
                    <span className={d.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {d.delta > 0 ? '+' : ''}{d.delta}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {debrief.lmsRecommendations?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" /> Recommended LMS Modules
            </h3>
            <div className="space-y-2">
              {debrief.lmsRecommendations.map((rec) => (
                <div key={rec.moduleId} className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <p className="text-slate-800 text-sm font-medium">{rec.title ?? rec.moduleId}</p>
                  <p className="text-slate-400 text-xs mt-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/train')}
          className="w-full py-3 rounded-xl bg-[#24408E] hover:bg-[#1d3574] text-white font-semibold transition shadow-sm"
        >
          Start Next Simulation
        </button>
      </main>
    </AppShell>
  );
}
