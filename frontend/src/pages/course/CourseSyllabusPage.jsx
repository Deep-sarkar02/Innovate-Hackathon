import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lock, CheckCircle2, PlayCircle, FileText, HelpCircle, Wrench, Award, Clock,
} from 'lucide-react';
import { courseApi } from '../../services/api.js';
import AppShell from '../../components/layout/AppShell.jsx';
import { logApiError } from '../../utils/apiError.js';

/**
 * Coursera-style syllabus: overall progress, day-by-day breakdown with every
 * item (deck / quiz / activity), durations, and lock states. Lock states come
 * from the SERVER — this page only renders them.
 */

const TYPE_ICON = { deck: FileText, quiz: HelpCircle, activity: Wrench };

export default function CourseSyllabusPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [syllabus, setSyllabus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseApi.syllabus(courseId)
      .then(({ data }) => setSyllabus(data))
      .catch((err) => logApiError('course/syllabus', err))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <AppShell title="Course">
        <div className="flex justify-center py-40"><p className="text-slate-500">Loading course...</p></div>
      </AppShell>
    );
  }
  if (!syllabus) {
    return (
      <AppShell title="Course">
        <div className="flex justify-center py-40"><p className="text-slate-500">Course not found.</p></div>
      </AppShell>
    );
  }

  const totalMinutes = syllabus.days.flatMap((d) => d.items).reduce((a, i) => a + (i.durationMinutes ?? 0), 0);

  return (
    <AppShell title={syllabus.title}>
      <main className="max-w-4xl px-8 py-8 space-y-6">
        {/* ── Course header (Coursera-style) ─────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-[#24408E] text-xs font-semibold uppercase tracking-wider mb-1">5-day certification course</p>
              <h2 className="text-2xl font-bold text-slate-900">{syllabus.title}</h2>
              <p className="text-slate-600 text-sm mt-2 max-w-xl">{syllabus.description}</p>
              <p className="text-slate-400 text-xs mt-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> ~{Math.round(totalMinutes / 60)}h total · {syllabus.days.length} days · sequential unlock
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-slate-900">{syllabus.progressPct}%</p>
              <p className="text-slate-500 text-xs">complete</p>
              {syllabus.completedAt && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                  <Award className="w-3.5 h-3.5" /> Certified
                </span>
              )}
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-4">
            <div className="h-full rounded-full bg-[#24408E] transition-all" style={{ width: `${syllabus.progressPct}%` }} />
          </div>
        </div>

        {/* ── Days ───────────────────────────────────────────────────── */}
        {syllabus.days.map((d) => (
          <div key={d.day} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${d.locked ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 ${
                  d.completed ? 'bg-emerald-100 text-emerald-600' : d.locked ? 'bg-slate-100 text-slate-400' : 'bg-[#24408E]/10 text-[#24408E]'
                }`}
                >
                  {d.completed ? <CheckCircle2 className="w-5 h-5" /> : d.locked ? <Lock className="w-4 h-4" /> : d.day}
                </span>
                <div className="min-w-0">
                  <h3 className="text-slate-900 font-semibold">Day {d.day} · {d.title}</h3>
                  <p className="text-slate-500 text-xs truncate">{d.summary}</p>
                </div>
              </div>
              {d.locked && <span className="text-xs text-slate-400 shrink-0">Complete day {d.day - 1} to unlock</span>}
            </div>

            <div className="divide-y divide-slate-50">
              {d.items.map((i) => {
                const Icon = TYPE_ICON[i.type] ?? FileText;
                const clickable = !d.locked;
                return (
                  <button
                    key={i.itemId}
                    disabled={!clickable}
                    onClick={() => navigate(`/course/${syllabus.courseId}/${i.itemId}`)}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition ${
                      clickable ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    {i.completed
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : clickable
                        ? <PlayCircle className="w-4 h-4 text-[#24408E] shrink-0" />
                        : <Lock className="w-4 h-4 text-slate-300 shrink-0" />}
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className={`text-sm flex-1 min-w-0 truncate ${i.completed ? 'text-slate-500' : 'text-slate-800'}`}>{i.title}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {i.type === 'deck' && i.pageCount != null && `${i.pageCount} pages${i.checkpointCount ? ` · ${i.checkpointCount} checkpoint${i.checkpointCount > 1 ? 's' : ''}` : ''}`}
                      {i.type === 'quiz' && `${i.questionCount} questions${i.score != null ? ` · best ${i.score}%` : ''}`}
                      {i.type === 'activity' && 'activity'}
                    </span>
                    <span className="text-xs text-slate-400 w-14 text-right shrink-0">{i.durationMinutes} min</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </AppShell>
  );
}
