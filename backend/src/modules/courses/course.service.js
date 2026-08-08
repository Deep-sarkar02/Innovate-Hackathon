import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Course } from '../../models/Course.js';
import { CourseProgress } from '../../models/CourseProgress.js';

// backend/media — deliberately OUTSIDE any express.static root. The original
// PPT/PDF files are never copied here; only per-page JPEG renders, and those
// are streamed one page at a time through the same gating as the deck.
const MEDIA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../media');

/**
 * Server-authoritative course gating.
 *
 * Rules (all enforced here, never in the client):
 *  1. Day N+1 content is invisible until every required item of day N is
 *     complete (decks finished + final quiz passed).
 *  2. Slides advance ONE page at a time (page must be maxPage+1).
 *  3. A deck's pages beyond a checkpoint stay locked until that checkpoint
 *     quiz is passed (all answers correct; retry allowed).
 *  4. Final quiz needs passPct (default 70%); retry allowed, best score kept.
 */

function err(status, message) {
  const e = new Error(message);
  e.statusCode = status;
  return e;
}

async function getProgress(userId, courseId) {
  let p = await CourseProgress.findOne({ userId, courseId });
  if (!p) p = await CourseProgress.create({ userId, courseId, unlockedDay: 1 });
  return p;
}

function itemState(progress, itemId) {
  return progress.items.get(itemId) ?? { maxPage: 0, checkpointsPassed: [], completed: false, attempts: 0 };
}

function dayComplete(courseDay, progress) {
  return courseDay.items
    .filter((i) => i.required)
    .every((i) => itemState(progress, i.itemId).completed);
}

function stripAnswers(questions) {
  return (questions ?? []).map(({ q, options }) => ({ q, options }));
}

/** Coursera-style syllabus: every day/item listed, content stripped, lock states computed. */
export async function getSyllabus(userId, courseId) {
  const course = await Course.findOne({ courseId }).lean();
  if (!course) throw err(404, 'Course not found');
  const progress = await getProgress(userId, courseId);

  let totalRequired = 0;
  let doneRequired = 0;

  const days = course.days.map((d) => {
    const locked = d.day > progress.unlockedDay;
    const items = d.items.map((i) => {
      const st = itemState(progress, i.itemId);
      if (i.required) {
        totalRequired += 1;
        if (st.completed) doneRequired += 1;
      }
      return {
        itemId: i.itemId,
        type: i.type,
        title: i.title,
        durationMinutes: i.durationMinutes,
        required: i.required,
        pageCount: i.deck?.slides?.length ?? null,
        checkpointCount: i.deck?.checkpoints?.length ?? 0,
        questionCount: i.quiz?.questions?.length ?? null,
        completed: st.completed,
        maxPage: st.maxPage,
        score: st.score ?? null,
      };
    });
    return {
      day: d.day,
      title: d.title,
      summary: d.summary,
      locked,
      completed: dayComplete(d, progress),
      items,
    };
  });

  return {
    courseId: course.courseId,
    title: course.title,
    description: course.description,
    unlockedDay: progress.unlockedDay,
    completedAt: progress.completedAt ?? null,
    progressPct: totalRequired ? Math.round((doneRequired / totalRequired) * 100) : 0,
    days,
  };
}

function findItem(course, itemId) {
  for (const d of course.days) {
    const item = d.items.find((i) => i.itemId === itemId);
    if (item) return { day: d, item };
  }
  throw err(404, 'Item not found');
}

/** Full item content — only if its day is unlocked. Deck pages beyond the
 *  next unpassed checkpoint (and beyond maxPage+1) are withheld. */
export async function getItem(userId, courseId, itemId) {
  const course = await Course.findOne({ courseId }).lean();
  if (!course) throw err(404, 'Course not found');
  const progress = await getProgress(userId, courseId);
  const { day, item } = findItem(course, itemId);

  if (day.day > progress.unlockedDay) {
    throw err(403, `Day ${day.day} is locked. Complete day ${progress.unlockedDay} first.`);
  }
  const st = itemState(progress, item.itemId);

  const base = {
    itemId: item.itemId,
    type: item.type,
    title: item.title,
    day: day.day,
    durationMinutes: item.durationMinutes,
    completed: st.completed,
  };

  if (item.type === 'deck') {
    const slides = item.deck?.slides ?? [];
    const checkpoints = item.deck?.checkpoints ?? [];
    // furthest page the user may SEE: one past maxPage, but never past the
    // first unpassed checkpoint
    let visibleLimit = Math.min(st.maxPage + 1, slides.length);
    for (const cp of checkpoints) {
      if (!st.checkpointsPassed.includes(cp.afterPage) && cp.afterPage < visibleLimit) {
        visibleLimit = cp.afterPage;
      }
    }
    const pendingCp = checkpoints.find(
      (cp) => !st.checkpointsPassed.includes(cp.afterPage) && st.maxPage >= cp.afterPage
    );
    return {
      ...base,
      pageCount: slides.length,
      maxPage: st.maxPage,
      visibleLimit,
      slides: slides.filter((s) => s.page <= visibleLimit),
      checkpoints: checkpoints.map((cp) => ({
        afterPage: cp.afterPage,
        passed: st.checkpointsPassed.includes(cp.afterPage),
        // questions only for the checkpoint currently due
        questions: pendingCp && cp.afterPage === pendingCp.afterPage ? stripAnswers(cp.questions) : undefined,
      })),
      sourceLink: item.deck?.sourceLink,
    };
  }

  if (item.type === 'quiz') {
    // Final quiz opens only after every other required item of the day is done
    const others = day.items.filter((i) => i.required && i.itemId !== item.itemId && i.type !== 'quiz');
    const ready = others.every((i) => itemState(progress, i.itemId).completed);
    if (!ready && !st.completed) {
      throw err(403, 'Finish all the day\'s content before the final quiz.');
    }
    return {
      ...base,
      passPct: item.quiz?.passPct ?? 70,
      score: st.score ?? null,
      questions: stripAnswers(item.quiz?.questions),
    };
  }

  return { ...base, instructions: item.activity?.instructions };
}

/** Advance a deck exactly one page. */
export async function advancePage(userId, courseId, itemId, page) {
  const course = await Course.findOne({ courseId }).lean();
  if (!course) throw err(404, 'Course not found');
  const progress = await getProgress(userId, courseId);
  const { day, item } = findItem(course, itemId);
  if (day.day > progress.unlockedDay) throw err(403, 'Day locked');
  if (item.type !== 'deck') throw err(400, 'Not a deck');

  const st = itemState(progress, itemId);
  const slides = item.deck?.slides ?? [];
  const checkpoints = item.deck?.checkpoints ?? [];

  if (page !== st.maxPage + 1) {
    throw err(400, `Pages advance one at a time (next allowed: ${st.maxPage + 1}).`);
  }
  const blocking = checkpoints.find(
    (cp) => !st.checkpointsPassed.includes(cp.afterPage) && page > cp.afterPage
  );
  if (blocking) {
    throw err(403, `Pass the checkpoint after page ${blocking.afterPage} first.`);
  }
  if (page > slides.length) throw err(400, 'Past end of deck');

  st.maxPage = page;
  // deck (without a final quiz of its own) completes when: all pages seen AND
  // all checkpoints passed
  if (st.maxPage >= slides.length && checkpoints.every((cp) => st.checkpointsPassed.includes(cp.afterPage))) {
    st.completed = true;
    st.completedAt = new Date();
  }
  progress.items.set(itemId, st);
  await progress.save();
  return { maxPage: st.maxPage, completed: st.completed };
}

function grade(questions, answers) {
  let correct = 0;
  questions.forEach((q, i) => {
    if (Number(answers?.[i]) === q.answer) correct += 1;
  });
  return { correct, total: questions.length, pct: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
}

/** Submit a mid-deck checkpoint. ALL answers must be correct to pass (retryable). */
export async function submitCheckpoint(userId, courseId, itemId, afterPage, answers) {
  const course = await Course.findOne({ courseId }).lean();
  if (!course) throw err(404, 'Course not found');
  const progress = await getProgress(userId, courseId);
  const { day, item } = findItem(course, itemId);
  if (day.day > progress.unlockedDay) throw err(403, 'Day locked');

  const cp = (item.deck?.checkpoints ?? []).find((c) => c.afterPage === Number(afterPage));
  if (!cp) throw err(404, 'Checkpoint not found');
  const st = itemState(progress, itemId);
  if (st.maxPage < cp.afterPage) throw err(403, 'Read up to the checkpoint page first.');

  const result = grade(cp.questions, answers);
  const passed = result.correct === result.total;
  if (passed && !st.checkpointsPassed.includes(cp.afterPage)) {
    st.checkpointsPassed.push(cp.afterPage);
  }
  const slides = item.deck?.slides ?? [];
  if (st.maxPage >= slides.length && (item.deck?.checkpoints ?? []).every((c) => st.checkpointsPassed.includes(c.afterPage))) {
    st.completed = true;
    st.completedAt = new Date();
  }
  progress.items.set(itemId, st);
  await progress.save();
  return { passed, ...result };
}

/** Submit a day's final quiz. Passing completes the item; completing the day unlocks the next. */
export async function submitQuiz(userId, courseId, itemId, answers) {
  const course = await Course.findOne({ courseId }).lean();
  if (!course) throw err(404, 'Course not found');
  const progress = await getProgress(userId, courseId);
  const { day, item } = findItem(course, itemId);
  if (day.day > progress.unlockedDay) throw err(403, 'Day locked');
  if (item.type !== 'quiz') throw err(400, 'Not a quiz');

  const others = day.items.filter((i) => i.required && i.itemId !== item.itemId && i.type !== 'quiz');
  if (!others.every((i) => itemState(progress, i.itemId).completed)) {
    throw err(403, 'Finish all the day\'s content before the final quiz.');
  }

  const st = itemState(progress, itemId);
  const result = grade(item.quiz?.questions ?? [], answers);
  const passPct = item.quiz?.passPct ?? 70;
  const passed = result.pct >= passPct;

  st.attempts += 1;
  st.score = Math.max(st.score ?? 0, result.pct);
  if (passed) {
    st.completed = true;
    st.completedAt = new Date();
  }
  progress.items.set(itemId, st);

  let dayUnlocked = null;
  let courseCompleted = false;
  if (dayComplete(day, progress)) {
    if (day.day === progress.unlockedDay && progress.unlockedDay < course.days.length) {
      progress.unlockedDay += 1;
      dayUnlocked = progress.unlockedDay;
    } else if (day.day === course.days.length) {
      progress.completedAt = new Date();
      courseCompleted = true;
    }
  }
  await progress.save();
  return { passed, passPct, ...result, dayUnlocked, courseCompleted };
}

/** Resolve a slide image on disk — ONLY if the requesting user has unlocked
 *  that page. This is what makes the source decks non-downloadable: there is
 *  no file URL, and page N+1 does not exist for you until you earned it. */
export async function getSlideFile(userId, courseId, itemId, pageNum) {
  const course = await Course.findOne({ courseId }).lean();
  if (!course) throw err(404, 'Course not found');
  const progress = await getProgress(userId, courseId);
  const { day, item } = findItem(course, itemId);
  if (day.day > progress.unlockedDay) throw err(403, 'Day locked');
  if (item.type !== 'deck') throw err(400, 'Not a deck');

  const st = itemState(progress, itemId);
  const slides = item.deck?.slides ?? [];
  const checkpoints = item.deck?.checkpoints ?? [];
  let visibleLimit = Math.min(st.maxPage + 1, slides.length);
  for (const cp of checkpoints) {
    if (!st.checkpointsPassed.includes(cp.afterPage) && cp.afterPage < visibleLimit) {
      visibleLimit = cp.afterPage;
    }
  }
  const page = Number(pageNum);
  if (!Number.isInteger(page) || page < 1 || page > visibleLimit) {
    throw err(403, 'Page not unlocked yet');
  }
  const file = path.join(MEDIA_ROOT, 'decks', itemId, `${page}.jpg`);
  if (!file.startsWith(path.join(MEDIA_ROOT, 'decks')) || !fs.existsSync(file)) {
    throw err(404, 'Slide image not found');
  }
  return file;
}

export async function listCourses(userId) {
  const courses = await Course.find().lean();
  const out = [];
  for (const c of courses) {
    const s = await getSyllabus(userId, c.courseId);
    out.push({
      courseId: c.courseId,
      title: c.title,
      description: c.description,
      days: c.days.length,
      progressPct: s.progressPct,
      unlockedDay: s.unlockedDay,
      completedAt: s.completedAt,
    });
  }
  return out;
}

// exported for unit tests
export { grade };
