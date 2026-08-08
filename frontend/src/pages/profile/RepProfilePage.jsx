import { useEffect, useState } from 'react';
import { Save, ChevronDown, Award, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { repApi } from '../../services/api.js';
import AppShell from '../../components/layout/AppShell.jsx';
import { logApiError } from '../../utils/apiError.js';

function scoreColor(score) {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function statusBadge(status) {
  const map = {
    Excellent: 'bg-emerald-100 text-emerald-800',
    Good: 'bg-blue-100 text-blue-800',
    Average: 'bg-amber-100 text-amber-800',
    'Needs Improvement': 'bg-red-100 text-red-800',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

/**
 * Rep profile in the Frappe LMS theme. CRT outcomes from Frappe LMS render
 * as read-only cards; the raw JSON bridge stays behind a developer disclosure.
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

  const lms = profile?.lmsContext;
  const quizOutcomes = profile?.quizOutcomes
    ? (profile.quizOutcomes.entries ? Object.fromEntries(profile.quizOutcomes.entries()) : profile.quizOutcomes)
    : {};
  const productKnowledge = lms?.productKnowledge ?? {};

  return (
    <AppShell title="My Profile">
      <main className="max-w-3xl px-8 py-8 space-y-6">
        {/* Identity */}
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

        {/* CRT LMS summary */}
        {lms && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#24408E]" /> CRT Training Summary
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Synced from LMS
                  {lms.syncedAt ? ` · ${new Date(lms.syncedAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {lms.certificationStatus && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    lms.certificationStatus === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {lms.certificationStatus}
                  </span>
                )}
                {lms.knowledgeLevel && (
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm">{lms.knowledgeLevel}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Overall', value: lms.overallPercentage ?? lms.overallScore },
                { label: 'Sales readiness', value: lms.salesReadinessScore },
                { label: 'Completion', value: lms.completionRate != null ? `${lms.completionRate}%` : null },
                { label: 'Learning velocity', value: profile.learningVelocity },
              ].map(({ label, value }) => (
                value != null && (
                  <div key={label} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className={`text-xl font-bold ${typeof value === 'number' ? scoreColor(value) : 'text-slate-800'}`}>
                      {value}
                    </p>
                  </div>
                )
              ))}
            </div>

            {lms.llmSummary && (
              <p className="text-sm text-slate-600 leading-relaxed border-l-4 border-[#24408E]/30 pl-4 mb-5">
                {lms.llmSummary}
              </p>
            )}

            {Object.keys(productKnowledge).length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Product knowledge
                </h3>
                <div className="space-y-2">
                  {Object.entries(productKnowledge).map(([label, score]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 w-36 shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold w-10 text-right ${scoreColor(score)}`}>{score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lms.dailyPerformance?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Daily CRT performance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lms.dailyPerformance.map((d) => (
                    <div key={d.day} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500">Day {d.day}</p>
                        <p className="text-sm font-medium text-slate-800">{d.title}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${scoreColor(d.score)}`}>{d.score}%</p>
                        {d.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(d.status)}`}>{d.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lms.strongAreas?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-800 mb-2">Strong areas</h3>
                  <ul className="space-y-1">
                    {lms.strongAreas.map((a) => (
                      <li key={a} className="text-sm text-slate-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lms.weakAreas?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Weak areas
                  </h3>
                  <ul className="space-y-1">
                    {lms.weakAreas.map((a) => (
                      <li key={a} className="text-sm text-slate-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {lms.conceptsToRevise?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Concepts to revise (used by training planner)</p>
                <div className="flex flex-wrap gap-2">
                  {lms.conceptsToRevise.map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs border border-amber-200">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Normalized quiz outcomes */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-1">CRT module scores</h2>
          <p className="text-slate-500 text-sm mb-4">Normalized from LMS — drives simulation objective selection.</p>
          {Object.keys(quizOutcomes).length === 0 ? (
            <p className="text-slate-400 text-sm">No module results yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(quizOutcomes).map(([moduleId, o]) => (
                <div key={moduleId} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-800 text-sm font-medium capitalize">
                      {o?.label ?? moduleId.replace(/_/g, ' ')}
                    </p>
                    <span className={`text-sm font-bold ${scoreColor(o?.score ?? 0)}`}>{o?.score ?? '—'}%</span>
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

        {/* Training placement */}
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

        {/* Developer bridge */}
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
