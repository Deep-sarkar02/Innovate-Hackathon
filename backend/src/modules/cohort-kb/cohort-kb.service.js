import { Cohort } from '../../models/Cohort.js';
import { KnowledgeNode, KnowledgeEdge } from '../../models/KnowledgeNode.js';

export async function getActiveCohort(cohortId, version) {
  if (version) {
    return Cohort.findOne({ cohortId, version }).lean();
  }
  return Cohort.findOne({ cohortId, isActive: true }).sort({ version: -1 }).lean();
}

export async function listCohorts() {
  const cohorts = await Cohort.find().sort({ cohortId: 1, version: -1 }).lean();
  return cohorts;
}

export async function createCohortVersion(cohortId, updates) {
  const latest = await Cohort.findOne({ cohortId }).sort({ version: -1 }).lean();
  const newVersion = (latest?.version ?? 0) + 1;

  await Cohort.updateMany({ cohortId }, { isActive: false });

  const cohort = await Cohort.create({
    cohortId,
    name: updates.name ?? latest?.name ?? cohortId,
    version: newVersion,
    description: updates.description ?? latest?.description,
    pitchPoints: updates.pitchPoints ?? latest?.pitchPoints ?? [],
    commonObjections: updates.commonObjections ?? latest?.commonObjections ?? [],
    personas: updates.personas ?? latest?.personas ?? ['father', 'student'],
    difficultyPresets: updates.difficultyPresets ?? latest?.difficultyPresets,
    targetSkills: updates.targetSkills ?? latest?.targetSkills ?? [],
    isActive: true,
    effectiveFrom: new Date(),
  });

  return cohort;
}

export async function getRelevantKnowledge(objection, cohortId, cohortVersion) {
  const nodes = await KnowledgeNode.find({
    cohortId,
    cohortVersion,
    $or: [
      { tags: objection },
      { label: new RegExp(objection.replace(/_/g, ' '), 'i') },
      { type: 'objection' },
    ],
  }).lean();

  const edges = await KnowledgeEdge.find({ cohortId, cohortVersion }).lean();
  const edgeMap = {};
  for (const e of edges) {
    if (!edgeMap[e.fromNodeId]) edgeMap[e.fromNodeId] = [];
    edgeMap[e.fromNodeId].push(e);
  }

  const enriched = nodes.map((node) => ({
    ...node,
    responses: (edgeMap[node.nodeId] ?? [])
      .map((e) => nodes.find((n) => n.nodeId === e.toNodeId) ?? KnowledgeNode.findOne({ nodeId: e.toNodeId }))
      .filter(Boolean),
  }));

  const responseNodes = await KnowledgeNode.find({
    cohortId,
    cohortVersion,
    type: { $in: ['counter', 'pitch'] },
  }).lean();

  return { objections: enriched, counters: responseNodes };
}

export async function getKnowledgeForBrief(sessionBrief) {
  const { cohortId, cohortVersion, primaryObjection, objective } = sessionBrief;

  const objectionNodes = await KnowledgeNode.find({
    cohortId,
    cohortVersion,
    $or: [
      { tags: primaryObjection },
      { relatedSkills: objective },
      { type: 'objection' },
    ],
  }).limit(10).lean();

  const pitchNodes = await KnowledgeNode.find({
    cohortId,
    cohortVersion,
    type: { $in: ['pitch', 'counter'] },
    relatedSkills: objective,
  }).limit(5).lean();

  const emotionNodes = await KnowledgeNode.find({
    cohortId,
    cohortVersion,
    type: 'emotion',
  }).limit(3).lean();

  return { objectionNodes, pitchNodes, emotionNodes };
}

/** Customer-agent knowledge — parent-facing facts only (never rep coaching counters). */
export async function getCustomerKnowledgeForBrief(sessionBrief) {
  const version = sessionBrief.cohortVersion ?? 1;
  const { cohortId, primaryObjection, objective } = sessionBrief;

  const cohort = await getActiveCohort(cohortId, version);

  const customerFacts = await KnowledgeNode.find({
    cohortId,
    cohortVersion: version,
    type: 'customer_fact',
  }).lean();

  const objectionNodes = await KnowledgeNode.find({
    cohortId,
    cohortVersion: version,
    type: 'objection',
    $or: [{ tags: primaryObjection }, { tags: { $in: [primaryObjection] } }],
  }).limit(5).lean();

  const emotionNodes = await KnowledgeNode.find({
    cohortId,
    cohortVersion: version,
    type: 'emotion',
  }).limit(3).lean();

  // Rep-only nodes (counters/pitch tactics) — kept for observer/coach, not customer
  const repPlaybook = await KnowledgeNode.find({
    cohortId,
    cohortVersion: version,
    type: { $in: ['counter', 'pitch'] },
    relatedSkills: objective,
  }).limit(5).lean();

  return {
    cohort,
    customerFacts,
    objectionNodes,
    emotionNodes,
    repPlaybook,
  };
}

export async function parseAndIngestKnowledge(cohortId, cohortVersion, documents) {
  const nodes = [];
  for (const doc of documents) {
    nodes.push({
      nodeId: `${cohortId}_v${cohortVersion}_${doc.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: doc.type,
      label: doc.label,
      content: doc.content,
      cohortId,
      cohortVersion,
      tags: doc.tags ?? [],
      relatedSkills: doc.relatedSkills ?? [],
    });
  }
  if (nodes.length > 0) {
    await KnowledgeNode.insertMany(nodes);
  }
  return nodes;
}
