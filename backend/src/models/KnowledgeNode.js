import mongoose from 'mongoose';

const knowledgeNodeSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['intent', 'question', 'objection', 'emotion', 'pitch', 'counter'],
      required: true,
    },
    label: { type: String, required: true },
    content: { type: String, required: true },
    cohortId: { type: String, required: true, index: true },
    cohortVersion: { type: Number, required: true },
    tags: [{ type: String }],
    relatedSkills: [{ type: String }],
  },
  { timestamps: true }
);

export const KnowledgeNode = mongoose.model('KnowledgeNode', knowledgeNodeSchema);

const knowledgeEdgeSchema = new mongoose.Schema(
  {
    fromNodeId: { type: String, required: true, index: true },
    toNodeId: { type: String, required: true, index: true },
    relationship: {
      type: String,
      enum: ['triggers', 'responds_to', 'leads_to', 'requires'],
      required: true,
    },
    cohortId: { type: String, required: true },
    cohortVersion: { type: Number, required: true },
  },
  { timestamps: true }
);

export const KnowledgeEdge = mongoose.model('KnowledgeEdge', knowledgeEdgeSchema);
