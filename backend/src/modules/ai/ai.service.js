import OpenAI from 'openai';
import { env, isOpenAiConfigured } from '../../config/env.js';
import { Meeting } from '../../models/Meeting.js';

let openai;
if (isOpenAiConfigured()) {
  openai = new OpenAI({ apiKey: env.openaiApiKey });
}

const EMOTIONS = ['happy', 'interested', 'confused', 'angry', 'hesitant', 'neutral'];

function deriveLeadStatus(score) {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

function mockSuggestions(transcript) {
  const lastCustomer = [...transcript].reverse().find((t) => t.speaker === 'customer');
  const text = (lastCustomer?.text || '').toLowerCase();

  if (text.includes('price') || text.includes('cost') || text.includes('expensive')) {
    return ['Mention scholarship options', 'Explain EMI plans', 'Share success stories'];
  }
  if (text.includes('demo') || text.includes('trial')) {
    return ['Offer free demo session', 'Highlight key product features', 'Share customer testimonials'];
  }
  if (text.includes('think') || text.includes('later')) {
    return ['Create urgency with limited offer', 'Schedule follow-up call', 'Send comparison document'];
  }
  return ['Ask about their goals', 'Highlight value proposition', 'Confirm decision timeline'];
}

function mockEmotion(transcript) {
  const lastCustomer = [...transcript].reverse().find((t) => t.speaker === 'customer');
  const text = (lastCustomer?.text || '').toLowerCase();

  if (text.includes('great') || text.includes('love') || text.includes('excited')) {
    return { emotion: 'happy', confidence: 88 };
  }
  if (text.includes('demo') || text.includes('interested') || text.includes('tell me more')) {
    return { emotion: 'interested', confidence: 91 };
  }
  if (text.includes('confus') || text.includes("don't understand")) {
    return { emotion: 'confused', confidence: 85 };
  }
  if (text.includes('angry') || text.includes('frustrated') || text.includes('waste')) {
    return { emotion: 'angry', confidence: 82 };
  }
  if (text.includes('think') || text.includes('maybe') || text.includes('not sure')) {
    return { emotion: 'hesitant', confidence: 87 };
  }
  return { emotion: 'neutral', confidence: 75 };
}

function mockLeadScore(transcript) {
  let score = 50;
  const reasons = [];
  const fullText = transcript.map((t) => t.text).join(' ').toLowerCase();

  if (fullText.includes('price') || fullText.includes('cost')) {
    score += 10;
    reasons.push('Asked about pricing');
  }
  if (fullText.includes('demo')) {
    score += 15;
    reasons.push('Requested demo');
  }
  if (fullText.includes('parent') || fullText.includes('decision')) {
    score += 12;
    reasons.push('Parent/decision maker involved');
  }
  if (fullText.includes('when can') || fullText.includes('sign up') || fullText.includes('enroll')) {
    score += 18;
    reasons.push('Ready to enroll');
  }
  if (fullText.includes('competitor') || fullText.includes('other option')) {
    score -= 5;
    reasons.push('Evaluating competitors');
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

async function callOpenAI(messages, jsonMode = false) {
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content;
  } catch (err) {
    console.warn('[ai] OpenAI call failed, using mock fallback:', err.message);
    return null;
  }
}

const HINDI_REPLIES = {
  greeting: 'नमस्ते! इन्फिनिटी लर्न में आपका स्वागत है। मैं आपकी AI सहायक हूँ — आज मैं आपकी कैसे मदद कर सकती हूँ?',
  greeting_male: 'नमस्ते! इन्फिनिटी लर्न में आपका स्वागत है। मैं आपका AI सहायक हूँ — आज मैं आपकी कैसे मदद कर सकता हूँ?',
  howAreYou: 'मैं बिल्कुल ठीक हूँ, धन्यवाद! मैं आपको सही कोर्स खोजने में मदद करने के लिए यहाँ हूँ।',
  price: 'हम ₹2,999/माह से शुरू होने वाली EMI योजनाएँ और छात्रवृत्ति विकल्प प्रदान करते हैं। क्या आप विस्तृत शुल्क जानना चाहेंगे?',
  demo: 'मैं आपके लिए एक मुफ्त डेमो सेशन शेड्यूल कर सकती हूँ! क्या यह सप्ताह या अगले सप्ताह ठीक रहेगा?',
  course: 'हम JEE, NEET, CBSE और कक्षा 6–12 के फाउंडेशन कोर्स प्रदान करते हैं। आप किस परीक्षा की तैयारी कर रहे हैं?',
  language: 'हाँ! हम हिंदी और अंग्रेज़ी दोनों में सहायता करते हैं। क्या आप हिंदी में बातचीत जारी रखना चाहेंगे?',
  thanks: 'आपका स्वागत है! क्या मैं आपकी और कोई मदद कर सकती हूँ?',
  bye: 'आपके समय के लिए धन्यवाद! कभी भी संपर्क करें। शुभ दिन!',
  default: 'यह एक अच्छा सवाल है! कृपया अपने सीखने के लक्ष्य के बारे में थोड़ा और बताएँ ताकि मैं सही विकल्प सुझा सकूँ।',
};

function mockReplyEn(text) {
  if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('namaste') || text.includes('नमस्ते')) {
    return "Hello! Welcome to Infinity Learn. I'm your AI assistant — how can I help you today?";
  }
  if (text.includes('bengali') || text.includes('bangla') || text.includes('hindi') || text.includes('tamil') || text.includes('हिंदी')) {
    return 'Yes! We support English and Hindi, plus other regional languages. Would you like to continue in your preferred language?';
  }
  if (text.includes('how are you') || text.includes('कैसे हो') || text.includes('कैसे हैं')) {
    return "I'm doing great, thank you! I'm here to help you find the perfect learning program.";
  }
  if (text.includes('price') || text.includes('cost') || text.includes('expensive') || text.includes('fee') || text.includes('कीमत') || text.includes('फी')) {
    return 'We offer flexible EMI plans starting from ₹2,999/month, plus scholarship options. Would you like a detailed fee breakdown?';
  }
  if (text.includes('demo') || text.includes('trial') || text.includes('डेमो')) {
    return "I'd love to set up a free demo session for you! Are you available this week or next?";
  }
  if (text.includes('course') || text.includes('program') || text.includes('class') || text.includes('कोर्स')) {
    return 'We offer programs for JEE, NEET, CBSE, and foundation courses for grades 6–12. Which exam are you preparing for?';
  }
  if (text.includes('thank') || text.includes('धन्यवाद') || text.includes('शुक्रिया')) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  if (text.includes('bye') || text.includes('goodbye') || text.includes('अलविदा')) {
    return 'Thank you for your time! Feel free to reach out anytime. Have a great day!';
  }
  return "That's a great question! Could you tell me more about your learning goals?";
}

function mockReplyHi(text, voiceGender) {
  const greet = voiceGender === 'male' ? HINDI_REPLIES.greeting_male : HINDI_REPLIES.greeting;

  if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('namaste') || text.includes('नमस्ते') || text.includes('नमस्कार')) {
    return greet;
  }
  if (text.includes('hindi') || text.includes('english') || text.includes('language') || text.includes('भाषा') || text.includes('हिंदी') || text.includes('अंग्रेज़ी')) {
    return HINDI_REPLIES.language;
  }
  if (text.includes('how are you') || text.includes('कैसे हो') || text.includes('कैसे हैं') || text.includes('क्या हाल')) {
    return HINDI_REPLIES.howAreYou;
  }
  if (text.includes('price') || text.includes('cost') || text.includes('expensive') || text.includes('fee') || text.includes('कीमत') || text.includes('फी') || text.includes('दाम')) {
    return HINDI_REPLIES.price;
  }
  if (text.includes('demo') || text.includes('trial') || text.includes('डेमो')) {
    return HINDI_REPLIES.demo;
  }
  if (text.includes('course') || text.includes('program') || text.includes('class') || text.includes('कोर्स') || text.includes('पाठ्यक्रम')) {
    return HINDI_REPLIES.course;
  }
  if (text.includes('thank') || text.includes('धन्यवाद') || text.includes('शुक्रिया')) {
    return HINDI_REPLIES.thanks;
  }
  if (text.includes('bye') || text.includes('goodbye') || text.includes('अलविदा')) {
    return HINDI_REPLIES.bye;
  }
  return HINDI_REPLIES.default;
}

async function buildAiReply(meeting, userMessage) {
  const text = userMessage.text.toLowerCase();
  const lang = meeting.language || 'en';
  const history = meeting.transcript
    .slice(-8)
    .map((t) => `${t.speaker}: ${t.text}`)
    .join('\n');

  const langInstruction = lang === 'hi'
    ? 'Reply ONLY in Hindi (Devanagari script). Be concise, friendly, 1-2 sentences.'
    : 'Reply ONLY in English. Be concise, friendly, 1-2 sentences.';

  if (isOpenAiConfigured()) {
    const reply = await callOpenAI([
      {
        role: 'system',
        content: `You are an AI sales assistant for Infinity Learn (EdTech). ${langInstruction}
If asked about pricing, mention EMI plans and scholarships.
If greeted, greet back warmly and offer help.`,
      },
      { role: 'user', content: `Conversation so far:\n${history}\n\nRespond to the latest message.` },
    ]);
    if (reply) return reply.trim();
  }

  if (lang === 'hi') {
    return mockReplyHi(text, meeting.voiceGender);
  }
  return mockReplyEn(text);
}

export async function appendTranscript(meetingId, { speaker, text }) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }

  meeting.transcript.push({ speaker, text, timestamp: new Date() });

  let aiReply = null;
  if (speaker !== 'ai') {
    const replyText = await buildAiReply(meeting, { speaker, text });
    if (replyText) {
      aiReply = { speaker: 'ai', text: replyText, timestamp: new Date() };
      meeting.transcript.push(aiReply);
    }
  }

  await meeting.save();
  return { transcript: meeting.transcript, aiReply };
}

export async function analyzeConversation(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }

  const transcript = meeting.transcript;
  let suggestions, emotion, leadData;

  if (isOpenAiConfigured() && transcript.length > 0) {
    const transcriptText = transcript
      .map((t) => `${t.speaker}: ${t.text}`)
      .join('\n');

    const aiResult = await callOpenAI(
      [
        {
          role: 'system',
          content: `You are a sales AI assistant. Analyze the conversation and return JSON with:
- suggestions: array of 3 short sales response suggestions
- emotion: one of ${EMOTIONS.join(', ')}
- confidence: 0-100
- leadScore: 0-100
- leadReasons: array of reasons for the score`,
        },
        { role: 'user', content: transcriptText },
      ],
      true
    );

    if (aiResult) {
      try {
        const parsed = JSON.parse(aiResult);
        suggestions = parsed.suggestions || mockSuggestions(transcript);
        emotion = { emotion: parsed.emotion || 'neutral', confidence: parsed.confidence || 75 };
        leadData = { score: parsed.leadScore || 50, reasons: parsed.leadReasons || [] };
      } catch {
        suggestions = mockSuggestions(transcript);
        emotion = mockEmotion(transcript);
        leadData = mockLeadScore(transcript);
      }
    } else {
      suggestions = mockSuggestions(transcript);
      emotion = mockEmotion(transcript);
      leadData = mockLeadScore(transcript);
    }
  } else {
    suggestions = mockSuggestions(transcript);
    emotion = mockEmotion(transcript);
    leadData = mockLeadScore(transcript);
  }

  const leadStatus = deriveLeadStatus(leadData.score);

  await Meeting.findByIdAndUpdate(meetingId, {
    $set: {
      suggestions,
      currentEmotion: emotion,
      leadScore: leadData.score,
      leadStatus,
      leadReasons: leadData.reasons,
    },
    $push: {
      emotionTimeline: { ...emotion, timestamp: new Date() },
    },
  });

  return {
    suggestions,
    emotion,
    leadScore: leadData.score,
    leadStatus,
    leadReasons: leadData.reasons,
  };
}

export async function generateMeetingSummary(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }

  const transcriptText = meeting.transcript
    .map((t) => `${t.speaker}: ${t.text}`)
    .join('\n');

  let summary;

  if (isOpenAiConfigured() && transcriptText.length > 0) {
    const aiResult = await callOpenAI(
      [
        {
          role: 'system',
          content: `Generate a meeting summary as JSON with fields:
overview, painPoints (array), questionsAsked (array), objections (array),
actionItems (array), followUp, leadScore (number), recommendedNextStep`,
        },
        { role: 'user', content: transcriptText || 'No transcript available.' },
      ],
      true
    );

    if (aiResult) {
      try {
        summary = JSON.parse(aiResult);
      } catch {
        summary = buildMockSummary(meeting);
      }
    }
  } else {
    summary = buildMockSummary(meeting);
  }

  meeting.summary = {
    ...summary,
    leadScore: summary.leadScore ?? meeting.leadScore,
  };
  await meeting.save();

  return meeting.summary;
}

function buildMockSummary(meeting) {
  const transcriptText = meeting.transcript.map((t) => t.text).join(' ').toLowerCase();

  return {
    overview: meeting.transcript.length
      ? `Sales conversation with ${meeting.customerName} covering product interest and next steps.`
      : 'Meeting ended with limited conversation captured.',
    painPoints: transcriptText.includes('price')
      ? ['Price sensitivity', 'Budget constraints']
      : ['Needs more information about the product'],
    questionsAsked: meeting.transcript
      .filter((t) => t.speaker === 'customer' && t.text.includes('?'))
      .map((t) => t.text)
      .slice(0, 5),
    objections: transcriptText.includes('expensive') ? ['Price is too high'] : [],
    actionItems: ['Send follow-up email', 'Schedule demo session', 'Share pricing details'],
    followUp: 'Send personalized follow-up within 24 hours with demo link and pricing options.',
    leadScore: meeting.leadScore,
    recommendedNextStep:
      meeting.leadScore >= 75
        ? 'Schedule closing call within 48 hours'
        : 'Nurture with educational content and schedule demo',
  };
}

export async function getTranscript(meetingId) {
  const meeting = await Meeting.findById(meetingId).select('transcript roomId customerName startTime');
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }
  return meeting;
}

export async function getSummary(meetingId) {
  const meeting = await Meeting.findById(meetingId).select('summary leadScore leadStatus roomId customerName');
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }

  if (!meeting.summary?.overview) {
    const summary = await generateMeetingSummary(meetingId);
    return { ...meeting.toObject(), summary };
  }

  return meeting;
}

export async function getDashboardStats(userId) {
  const [activeCalls, todayMeetings, allMeetings] = await Promise.all([
    Meeting.countDocuments({ salesExecutiveId: userId, status: 'active' }),
    Meeting.countDocuments({
      salesExecutiveId: userId,
      startTime: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    Meeting.find({ salesExecutiveId: userId, status: 'ended' }).select('leadScore leadStatus'),
  ]);

  const hotLeads = allMeetings.filter((m) => m.leadStatus === 'hot').length;
  const conversionRate = allMeetings.length
    ? Math.round((hotLeads / allMeetings.length) * 100)
    : 0;

  return {
    activeCalls,
    todayMeetings,
    leadConversion: conversionRate,
    aiSuggestions: 847,
    aiAccuracy: 92,
  };
}
