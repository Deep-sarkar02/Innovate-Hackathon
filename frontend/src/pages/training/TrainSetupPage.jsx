import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Globe, UserCircle } from 'lucide-react';
import { trainingApi, customerProfileApi } from '../../services/api.js';
import { logApiError } from '../../utils/apiError.js';
import SessionBriefCard from '../../components/training/SessionBriefCard.jsx';
import AppShell from '../../components/layout/AppShell.jsx';
import DifficultyDimensions from '../../components/training/DifficultyDimensions.jsx';
import { LANGUAGES } from '../../config/sessionPreferences.js';

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

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  hard: 'bg-rose-100 text-rose-800 border-rose-200',
};

function ProfileCard({ profile, selected, onSelect }) {
  const diffClass = DIFFICULTY_COLORS[profile.difficulty] ?? DIFFICULTY_COLORS.moderate;

  return (
    <button
      type="button"
      onClick={() => onSelect(profile.profileId)}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        selected
          ? 'border-[#24408E] bg-indigo-50/80 ring-2 ring-[#24408E]/30'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-slate-400 shrink-0" />
          <h4 className="font-semibold text-slate-900 text-sm leading-tight">{profile.displayName}</h4>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${diffClass}`}>
          {profile.difficulty}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-2">
        {profile.persona.city} · Grade {profile.persona.childGrade} · {profile.persona.board}
      </p>
      <p className="text-xs text-slate-600 line-clamp-2">{profile.summary}</p>
      {profile.isDefault && (
        <span className="inline-block mt-2 text-[10px] uppercase tracking-wide text-[#24408E] font-semibold">
          Recommended start
        </span>
      )}
    </button>
  );
}

export default function TrainSetupPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [language, setLanguage] = useState('en');
  const [voiceGender, setVoiceGender] = useState('female');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([
      trainingApi.getTodayPlan(),
      customerProfileApi.list(),
    ]).then(([planRes, profilesRes]) => {
      setPlan(planRes.data);
      const list = profilesRes.data.profiles ?? [];
      setProfiles(list);
      const defaultId = list.find((p) => p.isDefault)?.profileId ?? list[0]?.profileId;
      setSelectedProfileId(planRes.data.sessionBrief?.profileId ?? defaultId);
      if (planRes.data.repProfile?.language) setLanguage(planRes.data.repProfile.language);
    }).catch((err) => logApiError('train-setup', err));
  }, []);

  useEffect(() => {
    if (!selectedProfileId || !profiles.length) return;
    const profile = profiles.find((p) => p.profileId === selectedProfileId);
    if (profile?.voiceGender) setVoiceGender(profile.voiceGender);
    trainingApi.getTodayPlan(selectedProfileId).then(({ data }) => {
      setPlan(data);
      if (data.sessionBrief?.voiceGender) setVoiceGender(data.sessionBrief.voiceGender);
    }).catch((err) => logApiError('train-setup/preview', err));
  }, [selectedProfileId, profiles]);

  async function startSimulation() {
    setStarting(true);
    try {
      const { data } = await trainingApi.startSession({ language, voiceGender, profileId: selectedProfileId });
      navigate(`/train/${data.sessionId}`, {
        state: { sessionData: data, language, voiceGender, openingLine: data.openingLine },
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

        {profiles.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Choose Customer Persona</h3>
              <p className="text-xs text-slate-500 mt-1">
                Indian parents from tier 1–4 cities — child in class 1–12. Each profile mirrors real funnel behaviour.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map((p) => (
                <ProfileCard
                  key={p.profileId}
                  profile={p}
                  selected={selectedProfileId === p.profileId}
                  onSelect={setSelectedProfileId}
                />
              ))}
            </div>
          </div>
        )}

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
            <p className="text-xs text-slate-400 mb-2">Customer voice (auto-matched to persona)</p>
            <p className="text-sm text-slate-700 capitalize">
              {voiceGender} voice · {profiles.find((p) => p.profileId === selectedProfileId)?.displayName ?? 'Customer'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Voice and personality stay in sync — mother profiles use a female voice, father profiles use a male voice.
              {language === 'hi'
                ? ` Polly: ${voiceGender === 'female' ? 'Kajal · Hindi Neural' : 'Aditi · Hindi'}.`
                : ` Polly: ${voiceGender === 'female' ? 'Raveena · Indian English' : 'Aditi · Indian English'}.`}
            </p>
          </div>
        </div>

        <button
          onClick={startSimulation}
          disabled={starting || !selectedProfileId}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#24408E] hover:bg-[#1d3574] text-white font-semibold text-lg transition disabled:opacity-50 shadow-sm"
        >
          <Play className="w-5 h-5" />
          {starting ? 'Starting...' : 'Start Simulation'}
        </button>

        <p className="text-center text-slate-400 text-xs">
          Cold call — the parent answers first. You have ~30 seconds to identify yourself, the company, and why you are calling.
        </p>
      </main>
    </AppShell>
  );
}
