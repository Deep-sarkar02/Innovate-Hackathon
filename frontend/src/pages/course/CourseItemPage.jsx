import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, HelpCircle, ArrowLeft, Award } from 'lucide-react';
import { courseApi } from '../../services/api.js';
import AppShell from '../../components/layout/AppShell.jsx';
import { logApiError, getApiErrorMessage } from '../../utils/apiError.js';

/**
 * Deck player + quiz player with server-enforced gating.
 *
 * Deck: slides render one at a time ("embedded PPT"). Next advances exactly
 * one page via the server; when a checkpoint is due the quiz interstitial
 * replaces the slide and later pages stay locked until it is passed. Previous
 * pages are always reviewable. Quiz: all questions at once, graded on the
 * server; passing a day's final quiz unlocks the next day.
 */

function QuizBlock({ questions, onSubmit, submitting, result, ctaLabel }) {
  const [answers, setAnswers] = useState({});
  const allAnswered = questions.every((_, i) => answers[i] != null);

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div key={qi} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-slate-800 text-sm font-medium mb-3">{qi + 1}. {q.q}</p>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <label key={oi} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-sm transition ${
                answers[qi] === oi ? 'border-[#24408E] bg-blue-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
              >
                <input
                  type="radio"
                  name={`q${qi}`}
                  checked={answers[qi] === oi}
                  onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className="accent-[#24408E]"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      {result && !result.passed && (
        <p className="text-sm text-rose-600">
          {result.correct}/{result.total} correct — {result.passPct ? `you need ${result.passPct}%` : 'all answers must be correct'}. Review and try again.
        </p>
      )}
      <button
        onClick={() => onSubmit(questions.map((_, i) => answers[i]))}
        disabled={!allAnswered || submitting}
        className="w-full py-3 rounded-lg bg-[#24408E] hover:bg-[#1d3574] text-white font-semibold transition disabled:opacity-40"
      >
        {submitting ? 'Checking...' : ctaLabel}
      </button>
    </div>
  );
}

export default function CourseItemPage() {
  const { courseId, itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [banner, setBanner] = useState(null);

  const load = useCallback(async (goToLatest = false) => {
    try {
      const { data } = await courseApi.item(courseId, itemId);
      setItem(data);
      if (data.type === 'deck') {
        setPage((p) => (goToLatest ? Math.max(1, Math.min(data.maxPage + 1, data.pageCount, data.visibleLimit)) : Math.min(p, data.visibleLimit || 1)));
      }
      setError('');
    } catch (err) {
      logApiError('course/item', err);
      setError(getApiErrorMessage(err, 'Unable to load this item.'));
    }
  }, [courseId, itemId]);

  useEffect(() => { load(true); }, [load]);

  if (error) {
    return (
      <AppShell title="Course item">
        <div className="max-w-2xl px-8 py-20 text-center space-y-4">
          <p className="text-slate-600">{error}</p>
          <button onClick={() => navigate(`/course/${courseId}`)} className="px-4 py-2 rounded-lg bg-[#24408E] text-white text-sm">Back to syllabus</button>
        </div>
      </AppShell>
    );
  }
  if (!item) {
    return <AppShell title="Course item"><div className="flex justify-center py-40"><p className="text-slate-500">Loading...</p></div></AppShell>;
  }

  // ── QUIZ ────────────────────────────────────────────────────────────
  if (item.type === 'quiz') {
    async function submitQuiz(answers) {
      setSubmitting(true);
      try {
        const { data } = await courseApi.quiz(courseId, itemId, answers);
        setQuizResult(data);
        if (data.passed) {
          setBanner(data.courseCompleted
            ? { icon: 'award', text: `Passed with ${data.pct}% — course complete. Certificate unlocked!` }
            : data.dayUnlocked
              ? { icon: 'check', text: `Passed with ${data.pct}% — Day ${data.dayUnlocked} is now unlocked.` }
              : { icon: 'check', text: `Passed with ${data.pct}%.` });
        }
      } catch (err) {
        setError(getApiErrorMessage(err, 'Quiz submission failed'));
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <AppShell title={item.title}>
        <main className="max-w-2xl px-8 py-8 space-y-4">
          <button onClick={() => navigate(`/course/${courseId}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Syllabus
          </button>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-4 h-4 text-[#24408E]" />
              <p className="text-[#24408E] text-xs font-semibold uppercase tracking-wider">Day {item.day} · final quiz · pass {item.passPct}%</p>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">{item.title}</h2>
            {banner ? (
              <div className="text-center py-8 space-y-3">
                {banner.icon === 'award'
                  ? <Award className="w-12 h-12 text-amber-500 mx-auto" />
                  : <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />}
                <p className="text-slate-800 font-medium">{banner.text}</p>
                <button onClick={() => navigate(`/course/${courseId}`)} className="px-5 py-2.5 rounded-lg bg-[#24408E] text-white text-sm font-semibold">
                  Back to syllabus
                </button>
              </div>
            ) : (
              <QuizBlock questions={item.questions} onSubmit={submitQuiz} submitting={submitting} result={quizResult} ctaLabel="Submit final quiz" />
            )}
          </div>
        </main>
      </AppShell>
    );
  }

  // ── ACTIVITY ────────────────────────────────────────────────────────
  if (item.type === 'activity') {
    return (
      <AppShell title={item.title}>
        <main className="max-w-2xl px-8 py-8 space-y-4">
          <button onClick={() => navigate(`/course/${courseId}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Syllabus
          </button>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h2>
            <p className="text-slate-600 text-sm whitespace-pre-line">{item.instructions}</p>
          </div>
        </main>
      </AppShell>
    );
  }

  // ── DECK ────────────────────────────────────────────────────────────
  const slides = item.slides ?? [];
  const current = slides.find((s) => s.page === page);
  const dueCheckpoint = (item.checkpoints ?? []).find((cp) => !cp.passed && item.maxPage >= cp.afterPage && cp.questions);
  const showCheckpoint = dueCheckpoint && page === dueCheckpoint.afterPage;

  async function next() {
    // Reviewing an already-read page: local move only.
    if (page <= item.maxPage) {
      setPage(page + 1);
      return;
    }
    // page === maxPage + 1: tell the server this page has been read.
    setSubmitting(true);
    try {
      await courseApi.page(courseId, itemId, page);
      await load();
      // Stay on this page if its checkpoint is now due; otherwise move on.
      const cpHere = (item.checkpoints ?? []).find((c) => c.afterPage === page && !c.passed);
      if (!cpHere && page < item.pageCount) setPage(page + 1);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Cannot advance'));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCheckpoint(answers) {
    setSubmitting(true);
    try {
      const { data } = await courseApi.checkpoint(courseId, itemId, dueCheckpoint.afterPage, answers);
      setQuizResult(data);
      if (data.passed) {
        setQuizResult(null);
        await load();
        setPage(Math.min(dueCheckpoint.afterPage + 1, item.pageCount));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Checkpoint failed'));
    } finally {
      setSubmitting(false);
    }
  }

  const deckDone = item.completed;

  return (
    <AppShell title={item.title}>
      <main className="max-w-3xl px-8 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(`/course/${courseId}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Syllabus
          </button>
          <p className="text-xs text-slate-400">Day {item.day} · page {Math.min(page, item.pageCount)} of {item.pageCount}</p>
        </div>

        {/* progress bar with checkpoint markers */}
        <div className="relative h-2 rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#24408E] transition-all" style={{ width: `${(item.maxPage / item.pageCount) * 100}%` }} />
          {(item.checkpoints ?? []).map((cp) => (
            <span
              key={cp.afterPage}
              title={`Checkpoint after page ${cp.afterPage}`}
              className={`absolute -top-1 w-4 h-4 rounded-full border-2 border-white ${cp.passed ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ left: `calc(${(cp.afterPage / item.pageCount) * 100}% - 8px)` }}
            />
          ))}
        </div>

        {/* slide or checkpoint interstitial */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm min-h-[380px] flex flex-col">
          {showCheckpoint ? (
            <div className="p-6 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <p className="text-amber-600 text-xs font-semibold uppercase tracking-wider">Checkpoint — pages 1-{dueCheckpoint.afterPage}</p>
              </div>
              <p className="text-slate-500 text-sm mb-4">Answer correctly to unlock the next pages. You can review earlier pages any time.</p>
              <QuizBlock questions={dueCheckpoint.questions} onSubmit={submitCheckpoint} submitting={submitting} result={quizResult} ctaLabel="Submit checkpoint" />
            </div>
          ) : current ? (
            <div className="p-8 flex-1 flex flex-col">
              <p className="text-[#24408E] text-xs font-semibold uppercase tracking-wider mb-2">{item.title}</p>
              <h2 className="text-2xl font-bold text-slate-900 mb-5">{current.title}</h2>
              <ul className="space-y-3 flex-1">
                {current.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-slate-700">
                    <span className="text-[#24408E] mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {current.note && <p className="text-xs text-slate-400 mt-4">{current.note}</p>}
            </div>
          ) : (
            <div className="p-8 flex-1 flex items-center justify-center text-slate-400 text-sm">Page locked</div>
          )}

          {/* controls */}
          {!showCheckpoint && (
            <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {deckDone && page >= item.pageCount ? (
                <button onClick={() => navigate(`/course/${courseId}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Deck complete — back to syllabus
                </button>
              ) : (
                <button
                  onClick={next}
                  disabled={submitting || (page >= item.pageCount && deckDone)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#24408E] hover:bg-[#1d3574] text-white text-sm font-semibold disabled:opacity-40"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
        {item.sourceLink && <p className="text-xs text-slate-400">Source material: {item.sourceLink}</p>}
      </main>
    </AppShell>
  );
}
