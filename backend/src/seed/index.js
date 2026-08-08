import { Skill } from '../models/Skill.js';
import { Cohort } from '../models/Cohort.js';
import { KnowledgeNode, KnowledgeEdge } from '../models/KnowledgeNode.js';
import { SKILLS } from './skills.seed.js';
import { COHORTS, KNOWLEDGE_NODES, KNOWLEDGE_EDGES } from './cohorts.seed.js';
import { Course } from '../models/Course.js';
import { CRT_COURSE } from './crt-course.seed.js';

/**
 * Idempotent, upsert-based seeding.
 *
 * The previous version only inserted when a collection was EMPTY, which meant
 * a database seeded with the old cohort set could never receive updated seed
 * data — the stale NEET_Dropper cohorts would silently keep driving the
 * planner. Upserting by natural key (skillId / cohortId+version / nodeId)
 * makes seed changes actually land, and legacy cohorts that are no longer in
 * the seed are deactivated (never deleted — session insights reference them).
 */
export async function seedDatabase() {
  // Skills: upsert by skillId
  const skillOps = SKILLS.map((s) => ({
    updateOne: { filter: { skillId: s.skillId }, update: { $set: s }, upsert: true },
  }));
  const skillRes = await Skill.bulkWrite(skillOps, { ordered: false });
  console.log(`[seed] Skills: ${skillRes.upsertedCount} inserted, ${skillRes.modifiedCount} updated`);

  // Cohorts: upsert by (cohortId, version); deactivate anything not in the seed
  const cohortOps = COHORTS.map((c) => ({
    updateOne: {
      filter: { cohortId: c.cohortId, version: c.version },
      update: { $set: c },
      upsert: true,
    },
  }));
  const cohortRes = await Cohort.bulkWrite(cohortOps, { ordered: false });
  const seededIds = COHORTS.map((c) => c.cohortId);
  const retired = await Cohort.updateMany(
    { cohortId: { $nin: seededIds }, isActive: true },
    { $set: { isActive: false } }
  );
  console.log(
    `[seed] Cohorts: ${cohortRes.upsertedCount} inserted, ${cohortRes.modifiedCount} updated`
    + (retired.modifiedCount ? `, ${retired.modifiedCount} legacy deactivated` : '')
  );

  // Knowledge graph: upsert by nodeId / edge tuple
  if (KNOWLEDGE_NODES.length > 0) {
    const nodeRes = await KnowledgeNode.bulkWrite(
      KNOWLEDGE_NODES.map((n) => ({
        updateOne: { filter: { nodeId: n.nodeId }, update: { $set: n }, upsert: true },
      })),
      { ordered: false }
    );
    console.log(`[seed] Knowledge nodes: ${nodeRes.upsertedCount} inserted, ${nodeRes.modifiedCount} updated`);
  }
  // Courses: upsert by courseId so content edits land on redeploy
  await Course.updateOne({ courseId: CRT_COURSE.courseId }, { $set: CRT_COURSE }, { upsert: true });
  console.log(`[seed] Course '${CRT_COURSE.courseId}': ${CRT_COURSE.days.length} days upserted`);

  if (KNOWLEDGE_EDGES.length > 0) {
    await KnowledgeEdge.bulkWrite(
      KNOWLEDGE_EDGES.map((e) => ({
        updateOne: {
          filter: { fromNodeId: e.fromNodeId, toNodeId: e.toNodeId },
          update: { $set: e },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }
}
