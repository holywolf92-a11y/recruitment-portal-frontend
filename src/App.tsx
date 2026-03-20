import { useEffect, useRef, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CandidateManagement } from './components/CandidateManagement_ENHANCED';
import { EmployerManagement } from './components/EmployerManagement';
import { JobOrderManagement } from './components/JobOrderManagement';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { AdminPanel } from './components/AdminPanel';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { PublicApplicationForm } from './components/PublicApplicationForm';
import { ApplicationLinkGenerator } from './components/ApplicationLinkGenerator';
import { CVInbox } from './components/CVInbox';
import { CommunicationTemplates } from './components/CommunicationTemplates';
import { UserManagement } from './components/UserManagement';
import { Login } from './components/Login';
import { InboxUI } from './components/InboxUI';
import { WhatsAppInbox } from './components/WhatsAppInbox';
import { CandidateBrowserExcel } from './components/CandidateBrowserExcel';
import { PublicCandidateProfile } from './components/PublicCandidateProfile';
import { EmployeesModule } from './components/EmployeesModule';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { ReviewPage } from './components/ReviewPage';
import { ReviewsDashboard } from './components/ReviewsDashboard';
import { useAuth, AuthProvider } from './lib/authContext';
import { CandidateProvider } from './lib/candidateContext';
import { hasPermission } from './lib/authData';
import { apiClient } from './lib/apiClient';
import { APP_CONFIG } from './lib/constants';
import { Toaster } from './components/ui/sonner';
import { Users, Briefcase, Building2, FileText, Settings as SettingsIcon, LayoutDashboard, Link2, Inbox, MessageSquare, FolderTree, ArrowLeft, LogOut, Shield, ChevronDown, Mail, Phone, ClipboardList, Menu, X } from 'lucide-react';

const AppContent = () => {
  const { session, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPublicForm, setShowPublicForm] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<string>('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [candidateToOpen, setCandidateToOpen] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const TAB_PATHS: Record<string, string> = {
    dashboard: '/admin/dashboard',
    'employee-dashboard': '/admin/employee-dashboard',
    'cv-inbox': '/admin/cv-inbox',
    'inbox-ui': '/admin/inbox',
    'whatsapp-inbox': '/admin/whatsapp',
    'candidate-excel-browser': '/admin/excel-browser',
    candidates: '/admin/candidates',
    employers: '/admin/employers',
    jobs: '/admin/jobs',
    employees: '/admin/employees',
    templates: '/admin/templates',
    'application-link': '/admin/application-link',
    reports: '/admin/reports',
    settings: '/admin/settings',
    'admin-panel': '/admin/admin',
    users: '/admin/users',
    reviews: '/admin/reviews',
  };

  function buildAdminUrl(tab: string, opts?: { profession?: string }) {
    const base = TAB_PATHS[tab] || '/admin/dashboard';
    const url = new URL(base, window.location.origin);
    if (tab === 'candidates') {
      const profession = (opts?.profession ?? selectedProfession ?? 'all').toString();
      if (profession && profession !== 'all') {
        url.searchParams.set('profession', profession);
      }
    }
    return `${url.pathname}${url.search}`;
  }

  function parseAdminLocation() {
    const { pathname, search } = window.location;
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

    // Treat "/" and "/admin" as dashboard.
    if (normalizedPathname === '/' || normalizedPathname === '/admin') {
      return { tab: 'dashboard', profession: 'all' };
    }

    // Public routes are handled before auth in App(); ignore here.
    if (!normalizedPathname.startsWith('/admin/')) {
      return { tab: 'dashboard', profession: 'all' };
    }

    const adminPath = normalizedPathname;
    const match = Object.entries(TAB_PATHS).find(([, path]) => path === adminPath);
    const tab = match?.[0] || 'dashboard';

    let profession: string | null = null;
    if (tab === 'candidates') {
      const params = new URLSearchParams(search);
      profession = params.get('profession');
    }

    return { tab, profession: profession || 'all' };
  }

  const navigateTab = (tab: string, opts?: { profession?: string }) => {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;

    const nextUrl = buildAdminUrl(tab, opts);
    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.pushState({}, '', nextUrl);
    }
  };

  const onNavClick = (e: React.MouseEvent<HTMLAnchorElement>, tab: string, opts?: { profession?: string }) => {
    // Let browser handle: new tab/window, middle-click, right-click, downloads, etc.
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    navigateTab(tab, opts);
    setSidebarOpen(false); // close drawer on mobile after navigation
  };

  // Keep tab-based navigation in sync with /admin/* (supports refresh + back/forward)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromPath = () => {
      const parsed = parseAdminLocation();
      setActiveTab(parsed.tab);
      if (parsed.tab === 'candidates') {
        setSelectedProfession(parsed.profession);
      }
    };

    syncFromPath();
    window.addEventListener('popstate', syncFromPath);
    return () => window.removeEventListener('popstate', syncFromPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mock user data - in production, this would come from user metadata in Supabase
  const user = session ? {
    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
    email: session.user.email || '',
    role: (session.user.user_metadata?.role || 'viewer').charAt(0).toUpperCase() + (session.user.user_metadata?.role || 'viewer').slice(1),
    lastActive: 'Today'
  } : {
    name: 'Guest',
    email: '',
    role: 'Viewer',
    lastActive: 'Today'
  };

  console.log('[App] User:', { email: user.email, role: user.role, rawRole: session?.user?.user_metadata?.role });

  const isEmployee = !!session && user.role === 'Employee';

  // Track if we've already redirected to avoid infinite loops
  const hasRedirected = useRef(false);

  // Route employees to their dashboard on login
  useEffect(() => {
    console.log('[App] Checking redirect:', { sessionExists: !!session, userRole: user.role, activeTab, hasRedirected: hasRedirected.current });
    if (session && user.role === 'Employee' && activeTab === 'dashboard' && !hasRedirected.current) {
      console.log('[App] Redirecting to employee-dashboard');
      hasRedirected.current = true;
      setActiveTab('employee-dashboard');
    }
  }, [session, user.role, activeTab]);

  // Build profession filters from live candidates
  const [professions, setProfessions] = useState<string[]>(['all']);
  const [professionCounts, setProfessionCounts] = useState<Record<string, number>>({ all: 0 });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await apiClient.getCandidates();
        if (!isMounted) return;
        const positions = Array.from(new Set(data.map((c) => c.position).filter(Boolean) as string[])).sort();
        setProfessions(['all', ...positions]);
        const counts: Record<string, number> = { all: data.length };
        positions.forEach((p) => {
          counts[p] = data.filter((c) => c.position === p).length;
        });
        setProfessionCounts(counts);
      } catch (e) {
        // ignore for now; UI will still render with default filters
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const isBrowserView = activeTab === 'candidate-excel-browser'; // Excel Browser only (Browser (Excel) removed)

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'employee-dashboard':
        return <EmployeeDashboard />;
      case 'cv-inbox':
        return <CVInbox />;
      case 'inbox-ui':
        return <InboxUI apiBaseUrl={(import.meta as any).env?.VITE_API_BASE_URL || '/api'} />;
      case 'whatsapp-inbox':
        return <WhatsAppInbox />;
      case 'candidate-excel-browser':
        return <CandidateBrowserExcel onOpenCandidate={(candidateId) => {
          setCandidateToOpen(candidateId);
          navigateTab('candidates');
        }} />;
      case 'candidates':
        return <CandidateManagement initialProfessionFilter={selectedProfession} />;
      case 'employers':
        return <EmployerManagement />;
      case 'jobs':
        return <JobOrderManagement />;
      case 'employees':
        return <EmployeesModule userRole={user.role} />;
      case 'templates':
        return <CommunicationTemplates />;
      case 'application-link':
        return <ApplicationLinkGenerator />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'admin-panel':
        return <AdminPanel />;
      case 'users':
        return <UserManagement />;
      case 'reviews':
        return <ReviewsDashboard />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 sticky top-0 z-40">
        <div className="px-3 md:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              {/* Hamburger — mobile only */}
              {!isBrowserView && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
              )}
              {/* Logo */}
              <img
                src={APP_CONFIG.company.logo}
                alt={APP_CONFIG.company.name}
                className="h-9 w-9 md:h-12 md:w-12 object-contain flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-blue-600 font-bold text-base md:text-lg truncate">{APP_CONFIG.company.name}</h1>
                <p className="text-gray-600 text-xs hidden sm:flex gap-2">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {APP_CONFIG.contact.phone}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {APP_CONFIG.contact.email}
                  </span>
                </p>
              </div>
            </div>
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      user.role === 'Admin' ? 'bg-purple-500' :
                      user.role === 'Manager' ? 'bg-blue-500' :
                      user.role === 'Recruiter' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`} />
                    {user.role}
                  </p>
                </div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                  user.role === 'Admin' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                  user.role === 'Manager' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                  user.role === 'Recruiter' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                  'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                  {user.name[0]}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Last active: {user.lastActive}</p>
                  </div>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    My Profile
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    Preferences
                  </button>
                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="admin-shell flex flex-col min-w-0 flex-1 min-h-0">
        {/* Sidebar - Hidden when in browser view */}
        {!isBrowserView && (
          <>
            {/* Mobile backdrop */}
            {sidebarOpen && (
              <div
                className="admin-sidebar-backdrop md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <aside className={`admin-sidebar glass-sidebar border-gray-200 overflow-y-auto min-h-0${sidebarOpen ? ' sidebar-open' : ''}`}>
            {/* Brand stripe at top of sidebar */}
            <div className="relative px-5 py-5 border-b border-gray-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 text-white fill-current">
                    <path d="M9 12H3a1 1 0 000 2h6v2l3-3-3-3v2zm2-4h6a1 1 0 000-2h-6V4L8 7l3 3V8z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-slate-900 text-xs font-bold tracking-wide leading-none">FALISHA</p>
                  <p className="text-slate-600 text-[10px] mt-0.5 leading-none">Recruitment Portal</p>
                </div>
              </div>
              {/* Close button — mobile only */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <nav className="p-3 space-y-0.5">

              {/* ── Dashboard ─────────────────────────────────────────────── */}
              <a
                href={buildAdminUrl('dashboard')}
                onClick={(e) => onNavClick(e, 'dashboard')}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                  activeTab === 'dashboard' ? 'glass-nav-active' : ''
                }`}
              >
                {/* Dashboard icon: 4-square grid, spins slowly when active */}
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  activeTab === 'dashboard'
                    ? 'bg-violet-500/30 shadow shadow-violet-500/20'
                    : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                }`}>
                  <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-violet-700 icon-anim-spin' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="2" y="2" width="7" height="7" rx="1.5"/>
                    <rect x="11" y="2" width="7" height="7" rx="1.5"/>
                    <rect x="2" y="11" width="7" height="7" rx="1.5"/>
                    <rect x="11" y="11" width="7" height="7" rx="1.5"/>
                  </svg>
                </span>
                <span className={`font-medium tracking-wide ${activeTab === 'dashboard' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Dashboard</span>
                {activeTab === 'dashboard' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />}
              </a>
              

              {/* ── Candidate Operations ─────────────────────────────────── */}
              <div className="pt-4 pb-1">
                <p className="glass-section-label px-3 mb-2">CANDIDATE OPS</p>

                {/* CV Inbox */}
                <a
                  href={buildAdminUrl('cv-inbox')}
                  onClick={(e) => onNavClick(e, 'cv-inbox')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'cv-inbox' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'cv-inbox' ? 'bg-emerald-500/30 shadow shadow-emerald-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'cv-inbox' ? 'text-emerald-700 icon-anim-bounce' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 8l7 5 7-5"/>
                      <rect x="2" y="5" width="16" height="12" rx="2"/>
                    </svg>
                  </span>
                  <span className={`flex-1 font-medium tracking-wide ${activeTab === 'cv-inbox' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>CV Inbox</span>
                  <span className="relative inline-flex">
                    <span className="relative badge-ping bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">5</span>
                  </span>
                </a>

                {/* Inbox Manager */}
                <a
                  href={buildAdminUrl('inbox-ui')}
                  onClick={(e) => onNavClick(e, 'inbox-ui')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'inbox-ui' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'inbox-ui' ? 'bg-sky-500/30 shadow shadow-sky-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'inbox-ui' ? 'text-sky-700 icon-anim-shimmer' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                      <path d="M2 8l8 5 8-5"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'inbox-ui' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Inbox Manager</span>
                  {activeTab === 'inbox-ui' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
                </a>

                {/* Excel Browser */}
                <a
                  href={buildAdminUrl('candidate-excel-browser')}
                  onClick={(e) => onNavClick(e, 'candidate-excel-browser')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'candidate-excel-browser' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'candidate-excel-browser' ? 'bg-teal-500/30 shadow shadow-teal-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'candidate-excel-browser' ? 'text-teal-700 icon-anim-bar' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="2" y="3" width="16" height="14" rx="1.5"/>
                      <line x1="2" y1="7" x2="18" y2="7"/>
                      <line x1="2" y1="11" x2="18" y2="11"/>
                      <line x1="7" y1="3" x2="7" y2="17"/>
                      <line x1="13" y1="3" x2="13" y2="17"/>
                    </svg>
                  </span>
                  <span className={`flex-1 font-medium tracking-wide ${activeTab === 'candidate-excel-browser' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Excel Browser</span>
                  {activeTab === 'candidate-excel-browser' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />}
                </a>

                {/* Candidates */}
                <a
                  href={buildAdminUrl('candidates', { profession: 'all' })}
                  onClick={(e) => {
                    setSelectedProfession('all');
                    onNavClick(e, 'candidates', { profession: 'all' });
                  }}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'candidates' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'candidates' ? 'bg-blue-500/30 shadow shadow-blue-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'candidates' ? 'text-blue-700 icon-anim-float' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="8" cy="6" r="3"/>
                      <path d="M2 18c0-3.314 2.686-6 6-6"/>
                      <circle cx="14" cy="8" r="2.5"/>
                      <path d="M11 18c0-2.761 2.239-5 5-5"/>
                    </svg>
                  </span>
                  <span className={`flex-1 font-medium tracking-wide ${activeTab === 'candidates' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Candidates</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'candidates' ? 'bg-blue-500/15 text-blue-800' : 'text-slate-600 bg-slate-900/[0.03]'
                  }`}>{professionCounts['all'] ?? 0}</span>
                </a>

                {/* Profession sub-items */}
                {professions.filter(p => p !== 'all').map((profession) => (
                  <a
                    key={profession}
                    href={buildAdminUrl('candidates', { profession })}
                    onClick={(e) => {
                      setSelectedProfession(profession);
                      onNavClick(e, 'candidates', { profession });
                    }}
                    className={`w-full flex items-center gap-2 pl-14 pr-3 py-1.5 rounded-lg transition-all duration-200 text-xs group ${
                      activeTab === 'candidates' && selectedProfession === profession
                        ? 'text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full shrink-0 ${
                      activeTab === 'candidates' && selectedProfession === profession ? 'bg-blue-500' : 'bg-slate-400'
                    }`} />
                    <span className="flex-1 truncate">{profession}</span>
                    <span className="text-[10px] text-slate-500">{professionCounts[profession]}</span>
                  </a>
                ))}
              </div>


              {/* ── Employer & Jobs ──────────────────────────────────────── */}
              <div className="pt-4 pb-1">
                <p className="glass-section-label px-3 mb-2">EMPLOYER & JOBS</p>

                <a
                  href={buildAdminUrl('employers')}
                  onClick={(e) => onNavClick(e, 'employers')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'employers' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'employers' ? 'bg-amber-500/30 shadow shadow-amber-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'employers' ? 'text-amber-700 icon-anim-pulse' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 17V7l7-4 7 4v10"/>
                      <rect x="8" y="11" width="4" height="6"/>
                      <rect x="4" y="9" width="3" height="3"/>
                      <rect x="13" y="9" width="3" height="3"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'employers' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Employers</span>
                  {activeTab === 'employers' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </a>

                <a
                  href={buildAdminUrl('jobs')}
                  onClick={(e) => onNavClick(e, 'jobs')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'jobs' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'jobs' ? 'bg-orange-500/30 shadow shadow-orange-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'jobs' ? 'text-orange-700 icon-anim-swing' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="2" y="7" width="16" height="11" rx="2"/>
                      <path d="M7 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="14"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'jobs' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Job Orders</span>
                  {activeTab === 'jobs' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
                </a>
              </div>

              {/* ── Operations ───────────────────────────────────────────── */}
              <div className="pt-4 pb-1">
                <p className="glass-section-label px-3 mb-2">OPERATIONS</p>

                <a
                  href={buildAdminUrl('employees')}
                  onClick={(e) => onNavClick(e, 'employees')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'employees' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'employees' ? 'bg-indigo-500/30 shadow shadow-indigo-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'employees' ? 'text-indigo-700 icon-anim-shimmer' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="3" y="2" width="14" height="16" rx="2"/>
                      <circle cx="10" cy="8" r="2.5"/>
                      <path d="M5 17c0-2.761 2.24-5 5-5s5 2.239 5 5"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'employees' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Employees</span>
                  {activeTab === 'employees' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                </a>

                <a
                  href={buildAdminUrl('reports')}
                  onClick={(e) => onNavClick(e, 'reports')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'reports' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'reports' ? 'bg-pink-500/30 shadow shadow-pink-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'reports' ? 'text-pink-700' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="2" y="2" width="16" height="16" rx="2"/>
                      <line x1="6" y1="14" x2="6" y2="10"/>
                      <line x1="10" y1="14" x2="10" y2="7"/>
                      <line x1="14" y1="14" x2="14" y2="5"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'reports' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Reports</span>
                  {activeTab === 'reports' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400" />}
                </a>
              </div>

              {/* ── Communication ────────────────────────────────────────── */}
              <div className="pt-4 pb-1">
                <p className="glass-section-label px-3 mb-2">COMMUNICATION</p>

                <a
                  href={buildAdminUrl('templates')}
                  onClick={(e) => onNavClick(e, 'templates')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'templates' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'templates' ? 'bg-cyan-500/30 shadow shadow-cyan-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'templates' ? 'text-cyan-700 icon-anim-bounce' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V5z"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'templates' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Templates</span>
                  {activeTab === 'templates' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </a>

                <a
                  href={buildAdminUrl('whatsapp-inbox')}
                  onClick={(e) => onNavClick(e, 'whatsapp-inbox')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'whatsapp-inbox' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'whatsapp-inbox' ? 'bg-green-500/30 shadow shadow-green-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    {/* WhatsApp phone icon rings when active */}
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'whatsapp-inbox' ? 'text-green-700 icon-anim-ring' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M10 2a8 8 0 00-6.93 11.97L2 18l4.16-1.06A8 8 0 1010 2z"/>
                      <path d="M7 8.5c.5 1 1.5 2 2.5 2.5"/>
                    </svg>
                  </span>
                  <span className={`flex-1 font-medium tracking-wide ${activeTab === 'whatsapp-inbox' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>WhatsApp Inbox</span>
                  {activeTab === 'whatsapp-inbox' && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                </a>

                <a
                  href={buildAdminUrl('application-link')}
                  onClick={(e) => onNavClick(e, 'application-link')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'application-link' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'application-link' ? 'bg-violet-500/30 shadow shadow-violet-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'application-link' ? 'text-violet-700 icon-anim-link' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M7.5 12.5l5-5"/>
                      <path d="M8.5 5.5l1.5-1.5a3.536 3.536 0 015 5L13.5 10.5"/>
                      <path d="M11.5 14.5l-1.5 1.5a3.536 3.536 0 01-5-5l1.5-1.5"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'application-link' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Application Link</span>
                  {activeTab === 'application-link' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                </a>
              </div>

              {/* ── Feedback ─────────────────────────────────────────────── */}
              <div className="pt-4 pb-1">
                <p className="glass-section-label px-3 mb-2">FEEDBACK</p>

                <a
                  href={buildAdminUrl('reviews')}
                  onClick={(e) => onNavClick(e, 'reviews')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'reviews' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'reviews' ? 'bg-yellow-400/30 shadow shadow-yellow-400/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'reviews' ? 'text-yellow-600' : 'text-slate-600'}`} fill={activeTab === 'reviews' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
                      <polygon points="10,2 12.4,7.2 18,7.9 14,11.7 15.1,17.2 10,14.5 4.9,17.2 6,11.7 2,7.9 7.6,7.2" />
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'reviews' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Reviews</span>
                  {activeTab === 'reviews' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                </a>
              </div>

              {/* ── System ───────────────────────────────────────────────── */}
              <div className="pt-4 pb-1">
                <p className="glass-section-label px-3 mb-2">SYSTEM</p>

                {user.role === 'Admin' && (
                  <a
                    href={buildAdminUrl('admin-panel')}
                    onClick={(e) => onNavClick(e, 'admin-panel')}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                      activeTab === 'admin-panel' ? 'glass-nav-active' : ''
                    }`}
                  >
                    <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      activeTab === 'admin-panel' ? 'bg-red-500/30 shadow shadow-red-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                    }`}>
                      <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'admin-panel' ? 'text-red-700 icon-anim-pulse' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M10 2l1.8 5.4H17l-4.5 3.3 1.7 5.3L10 13l-4.2 3 1.7-5.3L3 7.4h5.2L10 2z"/>
                      </svg>
                    </span>
                    <span className={`font-medium tracking-wide ${activeTab === 'admin-panel' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Admin Panel</span>
                    {activeTab === 'admin-panel' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />}
                  </a>
                )}

                {hasPermission(user, 'users', 'view') && (
                  <a
                    href={buildAdminUrl('users')}
                    onClick={(e) => onNavClick(e, 'users')}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                      activeTab === 'users' ? 'glass-nav-active' : ''
                    }`}
                  >
                    <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      activeTab === 'users' ? 'bg-fuchsia-500/30 shadow shadow-fuchsia-500/20' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                    }`}>
                      <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'users' ? 'text-fuchsia-700 icon-anim-float' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="7" cy="7" r="3"/>
                        <path d="M1 17c0-3.314 2.686-6 6-6"/>
                        <circle cx="14" cy="7" r="3"/>
                        <path d="M11 17c0-3.314 2.686-6 6-6"/>
                      </svg>
                    </span>
                    <span className={`font-medium tracking-wide ${activeTab === 'users' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>User Management</span>
                    {activeTab === 'users' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-fuchsia-400" />}
                  </a>
                )}

                <a
                  href={buildAdminUrl('settings')}
                  onClick={(e) => onNavClick(e, 'settings')}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group glass-nav-idle ${
                    activeTab === 'settings' ? 'glass-nav-active' : ''
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'settings' ? 'bg-slate-500/20 shadow shadow-slate-500/15' : 'bg-slate-900/[0.03] group-hover:bg-slate-900/[0.06]'
                  }`}>
                    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${activeTab === 'settings' ? 'text-slate-700 icon-anim-spin' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="10" cy="10" r="2.5"/>
                      <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.22 4.22l1.06 1.06M14.72 14.72l1.06 1.06M4.22 15.78l1.06-1.06M14.72 5.28l1.06-1.06"/>
                    </svg>
                  </span>
                  <span className={`font-medium tracking-wide ${activeTab === 'settings' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Settings</span>
                  {activeTab === 'settings' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-300" />}
                </a>
              </div>

              {/* ── Footer spacer ─────────────────────────────────────────── */}
              <div className="pt-6 pb-2 px-3">
                <div className="rounded-xl bg-white/70 border border-gray-200/80 p-3 text-center">
                  <p className="text-[10px] text-slate-600 leading-relaxed">Falisha Manpower<br/>Recruitment Portal v2</p>
                </div>
              </div>

            </nav>
          </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {/* Back button for Browser view */}
          {isBrowserView && (
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
              <button
                    onClick={() => navigateTab('candidates')}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Candidates</span>
              </button>
            </div>
          )}
          
          <div className={isBrowserView ? '' : 'p-4 md:p-6'}>
            {renderContent()}
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};

export default function App() {
  // Check for public routes BEFORE auth (no login required)
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    console.log('[App] Checking route:', pathname);
    
    // Privacy Policy
    if (pathname === '/privacy') {
      console.log('[App] Rendering PrivacyPolicy');
      return <PrivacyPolicy />;
    }
    
    // Public application form
    if (pathname === '/apply') {
      console.log('[App] Rendering PublicApplicationForm');
      return <PublicApplicationForm />;
    }

    // Review / rating funnel (and QR code page at /review/qr)
    if (pathname === '/review' || pathname.startsWith('/review/')) {
      console.log('[App] Rendering ReviewPage');
      return <ReviewPage />;
    }
    
    // Public candidate profile - match /profile/:id/:slug or /profile/:id
    const profileMatch = pathname.match(/^\/profile\/([^\/]+)(?:\/(.+))?$/);
    if (profileMatch) {
      console.log('[App] Rendering PublicCandidateProfile for ID:', profileMatch[1]);
      return (
        <>
          <PublicCandidateProfile />
          <Toaster position="top-right" richColors closeButton />
        </>
      );
    }
  }

  // Protected routes require auth
  return (
    <AuthProvider>
      <CandidateProvider>
        <AppContent />
      </CandidateProvider>
    </AuthProvider>
  );
}