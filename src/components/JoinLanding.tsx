import { ArrowRight, Briefcase, Building2, Globe, Handshake, MapPin, Users } from 'lucide-react';

const FRONTEND_URL = 'https://falishajobs.up.railway.app';

const options = [
  {
    id: 'candidate',
    href: `${FRONTEND_URL}/apply/candidate`,
    icon: Briefcase,
    emoji: '👷',
    title: 'Job Seeker',
    subtitle: 'Looking for Work Abroad',
    description: 'Submit your CV and profile. Get matched with employers across the Gulf, Europe, and beyond.',
    highlights: ['50+ destination countries', 'Free registration', 'Instant profile link'],
    gradient: 'from-blue-600 to-cyan-500',
    bgLight: 'from-blue-50 to-cyan-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    ring: 'focus-visible:ring-blue-500',
    hoverShadow: 'hover:shadow-blue-200',
    dot: 'bg-blue-500',
  },
  {
    id: 'employer',
    href: `${FRONTEND_URL}/apply/employer`,
    icon: Building2,
    emoji: '🏢',
    title: 'Employer',
    subtitle: 'Start Recruiting',
    description: 'Source skilled, pre-screened workers. Get a dedicated dashboard with full candidate access.',
    highlights: ['Pre-screened candidates', 'Dedicated dashboard', 'Fast turnaround'],
    gradient: 'from-violet-600 to-purple-500',
    bgLight: 'from-violet-50 to-purple-50',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    ring: 'focus-visible:ring-violet-500',
    hoverShadow: 'hover:shadow-violet-200',
    dot: 'bg-violet-500',
  },
  {
    id: 'partner',
    href: `${FRONTEND_URL}/apply/partner`,
    icon: Handshake,
    emoji: '🤝',
    title: 'Become a Partner',
    subtitle: 'Agent / Sub-Agency',
    description: 'Join our partner network. Submit candidates on behalf of workers in your district and earn commissions.',
    highlights: ['Partner portal access', 'Commission structure', 'Bulk candidate upload'],
    gradient: 'from-amber-500 to-orange-500',
    bgLight: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    ring: 'focus-visible:ring-amber-500',
    hoverShadow: 'hover:shadow-amber-200',
    dot: 'bg-amber-500',
  },
];

export function JoinLanding() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(155deg,#f0f9ff 0%,#ffffff 48%,#f5f3ff 100%)' }}>
      {/* Decorative blobs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-gray-900 leading-none">Falisha Jobs</div>
            <div className="text-xs text-gray-500 leading-none mt-0.5">International Manpower</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          Rawalpindi, Pakistan
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Trust badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border"
          style={{ background: 'rgba(37,99,235,0.07)', borderColor: 'rgba(37,99,235,0.18)', color: '#1d4ed8' }}>
          <Users className="w-3.5 h-3.5" />
          Trusted by 5,000+ expats worldwide
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 text-center leading-tight mb-3 max-w-2xl">
          Your Journey Starts
          <span className="relative ml-2">
            <span className="relative z-10 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Here</span>
            <span aria-hidden="true" className="absolute left-0 right-0 -bottom-1 h-[5px] rounded-full opacity-30"
              style={{ background: 'linear-gradient(90deg,#2563eb,#7c3aed)' }} />
          </span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 text-center max-w-lg mb-10 leading-relaxed">
          Choose how you want to work with Falisha — whether you're looking for a job, hiring staff, or joining as a partner.
        </p>

        {/* Cards */}
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-5 px-0 sm:px-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <a
                key={opt.id}
                href={opt.href}
                className={`group relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${opt.hoverShadow} ${opt.border} ${opt.ring} focus-visible:outline-none focus-visible:ring-2`}
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${opt.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${opt.bgLight} border ${opt.border}`}>
                  <span className="text-2xl" role="img" aria-hidden="true">{opt.emoji}</span>
                </div>

                {/* Title */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2 w-fit ${opt.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                  {opt.subtitle}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{opt.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">{opt.description}</p>

                {/* Highlights */}
                <ul className="space-y-1.5 mb-6">
                  {opt.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${opt.bgLight}`}>
                        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                            style={{ color: opt.dot.replace('bg-', '').includes('blue') ? '#2563eb' : opt.dot.replace('bg-', '').includes('violet') ? '#7c3aed' : '#f59e0b' }} />
                        </svg>
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-white text-sm font-semibold bg-gradient-to-r ${opt.gradient} shadow-sm group-hover:shadow-md transition-shadow`}>
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            );
          })}
        </div>

        {/* Stats strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
          {[
            { value: '10K+', label: 'Jobs Placed' },
            { value: '50+', label: 'Countries' },
            { value: '95%', label: 'Success Rate' },
            { value: '24/7', label: 'Support' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{s.value}</span>
              <span className="text-xs text-gray-500 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-5 text-xs text-gray-400 border-t border-gray-100 px-4">
        <p>© {new Date().getFullYear()} Falisha Enterprises · Office 10-12, Umer Farooq Plaza, Murree Road, Rawalpindi</p>
        <p className="mt-1">
          <a href="mailto:support@falishajobs.com" className="hover:text-blue-600 transition-colors">support@falishajobs.com</a>
          {' · '}
          <a href="tel:+923005547806" className="hover:text-blue-600 transition-colors">0300-5547806</a>
        </p>
      </footer>
    </div>
  );
}
