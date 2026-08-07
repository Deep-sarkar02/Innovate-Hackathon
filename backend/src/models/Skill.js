import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    skillId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'opening',
        'discovery',
        'product_knowledge',
        'objection',
        'closing',
        'soft_skills',
        'follow_up',
      ],
      required: true,
    },
    description: { type: String },
    prerequisites: [{ type: String }],
    weight: { type: Number, default: 1, min: 0, max: 10 },
    relatedModules: [{ type: String }],
  },
  { timestamps: true }
);

export const Skill = mongoose.model('Skill', skillSchema);
