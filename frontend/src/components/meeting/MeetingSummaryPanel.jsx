export default function MeetingSummaryPanel({ summary }) {
  if (!summary?.overview) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-2">Meeting Summary</h3>
        <p className="text-slate-500 text-sm">Summary will be generated when the meeting ends.</p>
      </div>
    );
  }

  const sections = [
    { title: 'Overview', content: summary.overview, type: 'text' },
    { title: 'Pain Points', content: summary.painPoints, type: 'list' },
    { title: 'Questions Asked', content: summary.questionsAsked, type: 'list' },
    { title: 'Objections', content: summary.objections, type: 'list' },
    { title: 'Action Items', content: summary.actionItems, type: 'list' },
    { title: 'Follow-up', content: summary.followUp, type: 'text' },
    { title: 'Recommended Next Step', content: summary.recommendedNextStep, type: 'text' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="font-semibold text-white mb-4">Meeting Summary</h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {sections.map(({ title, content, type }) => {
          if (!content || (Array.isArray(content) && content.length === 0)) return null;
          return (
            <div key={title}>
              <h4 className="text-sm font-medium text-brand-400 mb-1">{title}</h4>
              {type === 'text' ? (
                <p className="text-sm text-slate-300">{content}</p>
              ) : (
                <ul className="text-sm text-slate-300 space-y-1">
                  {content.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-600">•</span> {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {summary.leadScore != null && (
          <div>
            <h4 className="text-sm font-medium text-brand-400 mb-1">Lead Score</h4>
            <p className="text-2xl font-bold text-white">{summary.leadScore}</p>
          </div>
        )}
      </div>
    </div>
  );
}
