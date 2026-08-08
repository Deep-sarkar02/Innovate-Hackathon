import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const livekitApi = {
  createRoom: (data) => api.post('/livekit/create-room', data),
  endMeeting: (meetingId) => api.post('/livekit/end', { meetingId }),
  joinMeeting: (inviteToken, data) => api.post(`/livekit/join/${inviteToken}`, data),
  getSalesToken: (meetingId) => api.get(`/livekit/meeting/${meetingId}/token`),
  getMeeting: (meetingId) => api.get(`/livekit/meeting/${meetingId}`),
  listMeetings: () => api.get('/livekit/meetings'),
};

export const aiApi = {
  appendTranscript: (meetingId, data) => api.post(`/transcript/${meetingId}`, data),
  analyze: (meetingId) => api.post(`/analyze/${meetingId}`),
  getTranscript: (meetingId) => api.get(`/transcript/${meetingId}`),
  getSummary: (meetingId) => api.get(`/summary/${meetingId}`),
  getDashboard: () => api.get('/dashboard'),
};

export const repApi = {
  getMyProfile: () => api.get('/rep/me/profile'),
  getProfile: (id) => api.get(`/rep/${id}/profile`),
  updateMyProfile: (data) => api.put('/rep/me/profile', data),
  updateProfile: (id, data) => api.put(`/rep/${id}/profile`, data),
  updateMyQuizOutcomes: (data) => api.post('/rep/me/quiz-outcomes', data),
  updateQuizOutcomes: (id, data) => api.post(`/rep/${id}/quiz-outcomes`, data),
};

export const trainingApi = {
  getTodayPlan: (profileId) => api.get('/training/plan/today', { params: { profileId } }),
  previewPlan: (repId, profileId) => api.post('/training/plan', { repId, profileId }),
  startSession: (data) => api.post('/training/start', data),
  getSession: (sessionId) => api.get(`/training/${sessionId}`),
  appendTurn: (sessionId, data) => api.post(`/training/${sessionId}/transcript`, data),
  endSession: (sessionId) => api.post(`/training/${sessionId}/end`),
  getDebrief: (sessionId) => api.get(`/training/${sessionId}/debrief`),
  listSessions: () => api.get('/training/sessions'),
};

export const skillsApi = {
  getMySkills: () => api.get('/skills/me'),
  getTeamRollup: () => api.get('/skills/team/rollup'),
};

export const analyticsApi = {
  getTeam: () => api.get('/analytics/team'),
  getRep: (repId) => api.get(`/analytics/rep/${repId}`),
  getLeaderboard: () => api.get('/analytics/leaderboard'),
};

export const courseApi = {
  list: () => api.get('/courses'),
  syllabus: (courseId) => api.get(`/courses/${courseId}`),
  item: (courseId, itemId) => api.get(`/courses/${courseId}/items/${itemId}`),
  page: (courseId, itemId, page) => api.post(`/courses/${courseId}/items/${itemId}/page`, { page }),
  checkpoint: (courseId, itemId, afterPage, answers) => api.post(`/courses/${courseId}/items/${itemId}/checkpoint`, { afterPage, answers }),
  quiz: (courseId, itemId, answers) => api.post(`/courses/${courseId}/items/${itemId}/quiz`, { answers }),
};

export const cohortApi = {
  list: () => api.get('/cohorts'),
  get: (cohortId, version) => api.get(`/cohorts/${cohortId}`, { params: { version } }),
};

export const customerProfileApi = {
  list: () => api.get('/customer-profiles'),
  get: (profileId) => api.get(`/customer-profiles/${profileId}`),
};

export const lmsApi = {
  getCatalog: () => api.get('/lms/catalog'),
  getMyRecommendations: (objective) =>
    api.get('/lms/me/recommendations', { params: { objective } }),
  getRecommendations: (repId, objective) =>
    api.get(`/lms/${repId}/recommendations`, { params: { objective } }),
};

export const ttsApi = {
  status: ({ language = 'en', voiceGender = 'female', persona } = {}) =>
    api.get('/tts/status', { params: { language, voiceGender, persona } }),
  speak: (data) =>
    api.post('/tts/speak', data, { responseType: 'arraybuffer' }),
};

export const sttApi = {
  status: () => api.get('/stt/status'),
  transcribe: (data) => api.post('/stt/transcribe', data),
};

export default api;
