import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Mic, User } from 'lucide-react';
import VoiceOrb, { AI_PERSONAS } from '../components/voice/VoiceOrb.jsx';
import {
  LANGUAGES,
  VOICE_GENDERS,
  saveSessionPrefs,
} from '../config/sessionPreferences.js';
import { livekitApi } from '../services/api.js';

function OptionChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-white text-black shadow-lg shadow-white/10'
          : 'bg-white/5 text-slate-300 hover:bg-white/10 ring-1 ring-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  const [voiceGender, setVoiceGender] = useState('female');
  const [personaIndex, setPersonaIndex] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [starting, setStarting] = useState(false);

  const persona = AI_PERSONAS[personaIndex];

  async function startMeeting() {
    setStarting(true);
    const prefs = { language, voiceGender, personaIndex, customerName };
    saveSessionPrefs(prefs);

    try {
      const { data } = await livekitApi.createRoom({
        customerName: customerName || 'Customer',
        language,
        voiceGender,
        voicePersona: persona.id,
      });

      navigate(`/meeting/${data.meetingId}`, {
        state: {
          roomData: data,
          session: prefs,
        },
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start meeting');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="px-6 py-5 text-center">
        <h1 className="text-lg font-semibold tracking-tight">AI Sales Copilot</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your session before you start</p>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pb-10 max-w-md mx-auto w-full">
        <div className="py-6">
          <VoiceOrb state="idle" persona={persona} size="lg" />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold">{persona.name}</h2>
          <p className="text-slate-400 italic text-sm mt-1">{persona.tagline}</p>
        </div>

        <div className="flex gap-2 mb-10">
          {AI_PERSONAS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersonaIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === personaIndex ? 'bg-white scale-125' : 'bg-white/25'
              }`}
              aria-label={p.name}
            />
          ))}
        </div>

        <div className="w-full space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              Language
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <OptionChip
                  key={lang.id}
                  active={language === lang.id}
                  onClick={() => setLanguage(lang.id)}
                >
                  {lang.label}
                </OptionChip>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2">
              AI will listen and respond in {language === 'hi' ? 'Hindi' : 'English'}
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs uppercase tracking-wider">
              <Mic className="w-3.5 h-3.5" />
              AI Voice
            </div>
            <div className="flex flex-wrap gap-2">
              {VOICE_GENDERS.map((v) => (
                <OptionChip
                  key={v.id}
                  active={voiceGender === v.id}
                  onClick={() => setVoiceGender(v.id)}
                >
                  {v.label}
                </OptionChip>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              Customer name <span className="text-slate-600 normal-case">(optional)</span>
            </div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </section>
        </div>

        <button
          type="button"
          onClick={startMeeting}
          disabled={starting}
          className="mt-10 w-full py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-slate-100 transition disabled:opacity-50 shadow-xl shadow-white/5"
        >
          {starting ? 'Starting…' : 'Start live session'}
        </button>
      </main>
    </div>
  );
}
