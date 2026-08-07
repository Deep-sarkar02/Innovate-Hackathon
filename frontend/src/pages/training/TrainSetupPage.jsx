import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Globe } from 'lucide-react';
import { trainingApi } from '../../services/api.js';
import { logApiError } from '../../utils/apiError.js';
import SessionBriefCard from '../../components/training/SessionBriefCard.jsx';
import DifficultyDimensions from '../../components/training/DifficultyDimensions.jsx';
import { LANGUAGES, VOICE_GENDERS } from '../../config/sessionPreferences.js';

function OptionChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function TrainSetupPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [language, setLanguage] = useState('en');
  const [voiceGender, setVoiceGender] = useState('female');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    trainingApi.getTodayPlan().then(({ data }) => {
      setPlan(data);
      if (data.repProfile?.language) setLanguage(data.repProfile.language);
    }).catch((err) => logApiError('train-setup', err));
  }, []);

  async function startSimulation() {
    setStarting(true);
    try {
      const { data } = await trainingApi.startSession({ language, voiceGender });
      navigate(`/train/${data.sessionId}`, {
        state: { sessionData: data, language, voiceGender },
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start simulation');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Training Setup</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {plan?.sessionBrief && <SessionBriefCard sessionBrief={plan.sessionBrief} />}

        {plan?.weakestSkills && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Skills to Improve</h3>
            <div className="flex flex-wrap gap-2">
              {plan.weakestSkills.map((s) => (
                <span key={s.skillId} className="px-3 py-1 rounded-full bg-slate-800 text-sm">
                  {s.name} <span className="text-amber-400 font-semibold">{s.score}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {plan?.sessionBrief?.difficulty && (
          <DifficultyDimensions difficulty={plan.sessionBrief.difficulty} />
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Session Preferences</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Language</p>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <OptionChip key={l.id} active={language === l.id} onClick={() => setLanguage(l.id)}>
                  {l.label}
                </OptionChip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Voice</p>
            <div className="flex gap-2">
              {VOICE_GENDERS.map((g) => (
                <OptionChip key={g.id} active={voiceGender === g.id} onClick={() => setVoiceGender(g.id)}>
                  {g.label}
                </OptionChip>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startSimulation}
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg transition disabled:opacity-50"
        >
          <Play className="w-5 h-5" />
          {starting ? 'Starting...' : 'Start Simulation'}
        </button>

        <p className="text-center text-slate-500 text-xs">
          The AI will play the customer. You are the sales rep. Your scores are hidden from the customer agent.
        </p>
      </main>
    </div>
  );
}
