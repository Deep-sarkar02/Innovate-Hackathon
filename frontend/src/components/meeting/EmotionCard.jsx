const EMOTION_CONFIG = {
  happy: { emoji: '😊', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  interested: { emoji: '🎯', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  confused: { emoji: '🤔', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  angry: { emoji: '😠', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  hesitant: { emoji: '😐', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  neutral: { emoji: '😶', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
};

export default function EmotionCard({ emotion, confidence }) {
  const config = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.neutral;

  return (
    <div className={`bg-white/[0.03] border rounded-2xl p-5 backdrop-blur-sm ${config.bg}`}>
      <h3 className="font-semibold text-white mb-4">Emotion Analysis</h3>
      <div className="flex items-center gap-4">
        <span className="text-4xl">{config.emoji}</span>
        <div>
          <p className={`text-xl font-bold capitalize ${config.color}`}>{emotion}</p>
          <p className="text-slate-400 text-sm mt-1">
            Confidence: <span className="text-white font-medium">{confidence}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}
