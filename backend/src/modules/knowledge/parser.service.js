import { parseAndIngestKnowledge } from '../cohort-kb/cohort-kb.service.js';

const TYPE_PATTERNS = [
  { type: 'objection', pattern: /^(objection|concern):\s*(.+)/i },
  { type: 'pitch', pattern: /^(pitch|talking point):\s*(.+)/i },
  { type: 'question', pattern: /^(question|faq):\s*(.+)/i },
  { type: 'counter', pattern: /^(counter|response):\s*(.+)/i },
  { type: 'emotion', pattern: /^(emotion|feeling):\s*(.+)/i },
  { type: 'intent', pattern: /^(intent|goal):\s*(.+)/i },
];

export function parseKnowledgeDocument(text, { cohortId, cohortVersion, relatedSkills = [], tags = [] }) {
  const lines = text.split('\n').filter((l) => l.trim());
  const documents = [];

  for (const line of lines) {
    for (const { type, pattern } of TYPE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        documents.push({
          type,
          label: match[1],
          content: match[2].trim(),
          tags,
          relatedSkills,
        });
        break;
      }
    }
  }

  return documents;
}

export async function ingestKnowledgeFromText(text, options) {
  const documents = parseKnowledgeDocument(text, options);
  if (documents.length === 0) {
    return { ingested: 0, message: 'No knowledge nodes parsed. Use format: "objection: text"' };
  }
  const nodes = await parseAndIngestKnowledge(options.cohortId, options.cohortVersion, documents);
  return { ingested: nodes.length, nodes };
}

export function parseStructuredJson(jsonArray) {
  return jsonArray.map((item) => ({
    type: item.type,
    label: item.label,
    content: item.content,
    tags: item.tags ?? [],
    relatedSkills: item.relatedSkills ?? [],
  }));
}
