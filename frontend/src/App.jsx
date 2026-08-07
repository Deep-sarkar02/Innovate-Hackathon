import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import TrainSetupPage from './pages/training/TrainSetupPage.jsx';
import SimulationPage from './pages/training/SimulationPage.jsx';
import DebriefPage from './pages/training/DebriefPage.jsx';
import RepProfilePage from './pages/profile/RepProfilePage.jsx';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage.jsx';
import AdminCohortsPage from './pages/admin/AdminCohortsPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import MeetingPage from './pages/meeting/MeetingPage.jsx';
import JoinPage from './pages/meeting/JoinPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/train" element={<TrainSetupPage />} />
        <Route path="/train/:sessionId" element={<SimulationPage />} />
        <Route path="/train/:sessionId/debrief" element={<DebriefPage />} />
        <Route path="/profile" element={<RepProfilePage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/cohorts" element={<AdminCohortsPage />} />
      </Route>

      {/* Legacy copilot mode */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/copilot" element={<SetupPage />} />
      <Route path="/meeting/:meetingId" element={<MeetingPage />} />
      <Route path="/join/:inviteToken" element={<JoinPage />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
