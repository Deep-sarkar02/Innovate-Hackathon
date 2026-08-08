import { useEffect, useState } from 'react';
import { Save, ChevronDown } from 'lucide-react';
import { repApi } from '../../services/api.js';
import AppShell from '../../components/layout/AppShell.jsx';
import { logApiError } from '../../utils/apiError.js';

/**
 * Rep profile in the Frappe LMS theme. LMS quiz outcomes render as read-only
 * result cards for the rep; the raw-JSON editor (an internal simulation
 * bridge for the Training Planner) is tucked behind a developer disclosure so
 * a salesperson is never asked to hand-edit JSON.
 */
export default function RepProfilePage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('en');
  const [quizJson, setQuizJson] = useState('');
  const [showDev, setShowDev] = useState(false);
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

  const quizOutcomes = profile?.quizOutcomes
    ? (profile.quizOutcomes.entries ? Object.fromEntries(profile.quizOutcomes.entries()) : profile.quizOutcomes)
    : {};

  return (
    <AppShell title="My Profile">
      <main className="max-w-2xl px-8 py-8 space-y-6">
        {/* ── Identity ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#24408E] text-white text-lg font-bold">
              {(user.name ?? '?').slice(0, 1)}
            </span>
            <div>
              <p className="text-slate-900 font-semibold">{user.name}</p>
              <p className="text-slate-500 text-sm">{user.email} · {user.role === 'admin' ? 'Administrator' : 'Academic Counsellor'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block" htmlFor="profile-city">
              <span className="text-sm text-slate-500">City</span>
              <input
                id="profile-city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#24408E]/30"
              />
            </label>
            <label className="block" htmlFor="profile-language">
              <span className="text-sm text-slate-500">Preferred language</span>
              <select
                id="profile-language"
                name="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#24408E]/30"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </label>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#24408E] hover:bg-[#1d3574] text-white text-sm font-medium transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save profile
          </button>
        </div>

        {/* ── LMS quiz results (read-only for reps) ────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-1">LMS module results</h2>
          <p className="text-slate-500 text-sm mb-4">Your learning plan reads these to assign remediation lessons.</p>
          {Object.keys(quizOutcomes).length === 0 ? (
            <p className="text-slate-400 text-sm">No module results yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(quizOutcomes).map(([moduleId, o]) => (
                <div key={moduleId} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-800 text-sm font-medium capitalize">{moduleId.replace(/_/g, ' ')}</p>
                    <span className={`text-sm font-bold ${(o?.score ?? 0) >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{o?.score ?? '—'}%</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {o?.attempts ?? 0} attempt{(o?.attempts ?? 0) === 1 ? '' : 's'}
                    {o?.completedAt ? ` · ${new Date(o.completedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Cohort & velocity ────────────────────────────────────── */}
        {profile && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-3">Training placement</h2>
            <div className="flex flex-wrap gap-2">
              {(profile.cohortAssignments?.length ? profile.cohortAssignments : ['Placed automatically by the learning plan']).map((c) => (
                <span key={c} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm capitalize">{String(c).replace(/_/g, ' ')}</span>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-3">
              Learning velocity: <span className="text-emerald-600 font-semibold">{profile.learningVelocity}</span>
            </p>
          </div>
        )}

        {/* ── Developer bridge (hidden by default) ─────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <button
            onClick={() => setShowDev(!showDev)}
            className="w-full flex items-center justify-between px-6 py-4 text-left text-sm text-slate-500 hover:text-slate-700"
          >
            <span>Developer: simulate LMS quiz outcomes (JSON)</span>
            <ChevronDown className={`w-4 h-4 transition ${showDev ? 'rotate-180' : ''}`} />
          </button>
          {showDev && (
            <div className="px-6 pb-6 space-y-3">
              <textarea
                id="profile-quiz-outcomes"
                name="quizOutcomes"
                value={quizJson}
                onChange={(e) => setQuizJson(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 font-mono text-xs"
              />
              <button
                onClick={saveQuizOutcomes}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Update quiz outcomes
              </button>
            </div>
          )}
        </div>

        {message && (
          <p className={`text-sm text-center ${message.includes('failed') || message.includes('Invalid') ? 'text-red-600' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
      </main>
    </AppShell>
  );
}
