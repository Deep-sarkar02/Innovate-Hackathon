import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Play, BarChart3, User, LogOut, Library, BookOpen } from 'lucide-react';

/**
 * Frappe-LMS-style application shell: brand-blue left sidebar with an orange
 * active item, light gray content area, white cards. Mirrors the company LMS
 * (Frappe LMS fork) so the OJT tool reads as part of the same product family.
 * The live simulation page intentionally does NOT use this shell — a call is
 * an immersive, dark, full-screen mode, like a meeting app mid-meeting.
 */

const NAV = [
  { to: '/dashboard', label: 'Learn', icon: GraduationCap },
  { to: '/course/crt', label: 'CRT Course', icon: BookOpen },
  { to: '/train', label: 'Practice', icon: Play },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function AppShell({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  const items = [...NAV];
  if (user.role === 'admin') {
    items.splice(2, 0, { to: '/admin/analytics', label: 'Classroom', icon: BarChart3 });
    items.splice(3, 0, { to: '/admin/cohorts', label: 'Cohorts', icon: Library });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-[#24408E] text-white flex flex-col fixed inset-y-0">
        <div className="flex items-center gap-2.5 px-4 py-5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10">
            <GraduationCap className="w-5 h-5" />
          </span>
          <div className="leading-tight">
            <p className="font-bold text-[15px]">Sales Academy</p>
            <p className="text-[11px] text-white/60">On-job training</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2" aria-label="Primary">
          {items.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-orange-500 text-white shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <p className="px-3 text-[13px] font-medium truncate">{user.name}</p>
          <p className="px-3 text-[11px] text-white/50 truncate mb-2">{user.email}</p>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 ml-56 min-w-0">
        {title && (
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="px-8 py-4">
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            </div>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
