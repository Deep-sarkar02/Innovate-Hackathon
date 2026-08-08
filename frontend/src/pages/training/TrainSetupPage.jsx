import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Globe } from 'lucide-react';
import { trainingApi } from '../../services/api.js';
import { logApiError } from '../../utils/apiError.js';
import SessionBriefCard from '../../components/training/SessionBriefCard.jsx';
import AppShell from '../../components/layout/AppShell.jsx';
import DifficultyDimensions from '../../components/training/DifficultyDimensions.jsx';
import { LANGUAGES, VOICE_GENDERS } from '../../config/sessionPreferences.js';

function OptionChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active ? 'bg-[#24408E] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
    <AppShell title="Training Setup">
      <main className="max-w-3xl px-8 py-8 space-y-6">
        {plan?.sessionBrief && <SessionBriefCard sessionBrief={plan.sessionBrief} variant="light" />}

        {plan?.weakestSkills && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Skills to Improve</h3>
            <div className="flex flex-wrap gap-2">
              {plan.weakestSkills.map((s) => (
                <span key={s.skillId} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm">
                  {s.name} <span className="text-amber-600 font-semibold">{s.score}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {plan?.sessionBrief?.difficulty && (
          <DifficultyDimensions difficulty={plan.sessionBrief.difficulty} variant="light" />
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Session Preferences</span>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Language</p>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <OptionChip key={l.id} active={language === l.id} onClick={() => setLanguage(l.id)}>
                  {l.label}
                </OptionChip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Voice</p>
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
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#24408E] hover:bg-[#1d3574] text-white font-semibold text-lg transition disabled:opacity-50 shadow-sm"
        >
          <Play className="w-5 h-5" />
          {starting ? 'Starting...' : 'Start Simulation'}
        </button>

        <p className="text-center text-slate-400 text-xs">
          The AI will play the customer. You are the sales rep. Your scores are hidden from the customer agent.
        </p>
      </main>
    </AppShell>
  );
}
