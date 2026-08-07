import { LMS_MODULES, SKILL_TO_MODULE_MAP } from '../../seed/lms-modules.seed.js';

export function getRecommendationsForSkills(weakSkillIds, primaryObjective) {
  const moduleIds = new Set();

  if (primaryObjective && SKILL_TO_MODULE_MAP[primaryObjective]) {
    SKILL_TO_MODULE_MAP[primaryObjective].forEach((m) => moduleIds.add(m));
  }

  for (const skillId of weakSkillIds) {
    const modules = SKILL_TO_MODULE_MAP[skillId] ?? [];
    modules.forEach((m) => moduleIds.add(m));
  }

  return [...moduleIds].slice(0, 3).map((moduleId) => {
    const mod = LMS_MODULES.find((m) => m.moduleId === moduleId);
    return {
      moduleId,
      title: mod?.title ?? moduleId,
      description: mod?.description ?? '',
      url: mod?.url ?? `/lms/${moduleId}`,
      priority: weakSkillIds.includes(primaryObjective) ? 'high' : 'medium',
      reason: `Recommended based on skill gap in ${primaryObjective ?? 'training'}`,
    };
  });
}

export function getModuleCatalog() {
  return LMS_MODULES;
}

export function getRecommendationsForRep(skillGraph, primaryObjective) {
  const weakSkills = skillGraph.filter((s) => s.score < 60 && !s.masteredAt).map((s) => s.skillId);
  return getRecommendationsForSkills(weakSkills, primaryObjective);
}
