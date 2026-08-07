import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { repApi } from '../../services/api.js';
import { getApiErrorMessage, logApiError } from '../../utils/apiError.js';

export default function RepProfilePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('en');
  const [quizJson, setQuizJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    repApi.getMyProfile().then(({ data }) => {
      setProfile(data);
      setCity(data.city ?? '');
      setLanguage(data.language ?? 'en');
      setQuizJson(JSON.stringify(data.quizOutcomes ?? {}, null, 2));
    }).catch((err) => logApiError('profile', err));
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage('');
    try {
      await repApi.updateMyProfile({ city, language });
      setMessage('Profile saved');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveQuizOutcomes() {
    setSaving(true);
    setMessage('');
    try {
      const parsed = JSON.parse(quizJson);
      const { data } = await repApi.updateMyQuizOutcomes(parsed);
      setProfile(data);
      setMessage('Quiz outcomes updated');
    } catch (err) {
      setMessage(err.message?.includes('JSON') ? 'Invalid JSON format' : (err.response?.data?.error || 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Rep Profile</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Basic Info</h2>
          <label className="block" htmlFor="profile-city">
            <span className="text-sm text-slate-400">City</span>
            <input
              id="profile-city"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
            />
          </label>
          <label className="block" htmlFor="profile-language">
            <span className="text-sm text-slate-400">Language</span>
            <select
              id="profile-language"
              name="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition"
          >
            <Save className="w-4 h-4" /> Save Profile
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Quiz Outcomes (LMS Bridge)</h2>
            <p className="text-slate-500 text-sm mt-1">
              JSON format simulating LMS quiz results. The Training Planner reads this to assign remediation.
            </p>
          </div>
          <textarea
            id="profile-quiz-outcomes"
            name="quizOutcomes"
            value={quizJson}
            onChange={(e) => setQuizJson(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm"
          />
          <button
            onClick={saveQuizOutcomes}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-sm font-medium transition"
          >
            <Save className="w-4 h-4" /> Update Quiz Outcomes
          </button>
        </div>

        {profile && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-semibold mb-3">Cohort Assignments</h2>
            <div className="flex flex-wrap gap-2">
              {profile.cohortAssignments?.map((c) => (
                <span key={c} className="px-3 py-1 rounded-full bg-slate-800 text-sm">{c}</span>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-3">
              Learning velocity: <span className="text-emerald-400">{profile.learningVelocity}</span>
            </p>
          </div>
        )}

        {message && (
          <p className={`text-sm text-center ${message.includes('failed') || message.includes('Invalid') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </p>
        )}
      </main>
    </div>
  );
}
