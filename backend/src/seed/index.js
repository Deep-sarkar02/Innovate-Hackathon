import { Skill } from '../models/Skill.js';
import { Cohort } from '../models/Cohort.js';
import { KnowledgeNode, KnowledgeEdge } from '../models/KnowledgeNode.js';
import { SKILLS } from './skills.seed.js';
import { COHORTS, KNOWLEDGE_NODES, KNOWLEDGE_EDGES } from './cohorts.seed.js';

export async function seedDatabase() {
  const skillCount = await Skill.countDocuments();
  if (skillCount === 0) {
    await Skill.insertMany(SKILLS);
    console.log(`[seed] Inserted ${SKILLS.length} skills`);
  }

  const cohortCount = await Cohort.countDocuments();
  if (cohortCount === 0) {
    await Cohort.insertMany(COHORTS);
    console.log(`[seed] Inserted ${COHORTS.length} cohort versions`);
  }

  const nodeCount = await KnowledgeNode.countDocuments();
  if (nodeCount === 0) {
    await KnowledgeNode.insertMany(KNOWLEDGE_NODES);
    await KnowledgeEdge.insertMany(KNOWLEDGE_EDGES);
    console.log(`[seed] Inserted ${KNOWLEDGE_NODES.length} knowledge nodes`);
  }
}
