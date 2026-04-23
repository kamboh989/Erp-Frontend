'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';

// ── AppInput ──────────────────────────────────────────────
interface InputProps {
  label?: string;
  placeholder?: string;
  [key: string]: any;
}

const AppInput = (props: InputProps) => {
  const { label, placeholder, ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="w-full relative">
      {label && <label className="block mb-1.5 text-sm font-medium text-gray-600">{label}</label>}
      <div className="relative w-full">
        <input
          className="peer relative z-10 border border-gray-300 w-full rounded-md bg-white px-4 py-3 text-sm font-normal outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-gray-500 placeholder:text-gray-400 text-gray-800"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-lg overflow-hidden"
              style={{ background: `radial-gradient(40px circle at ${mousePosition.x}px 0px, #111827 0%, transparent 70%)` }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-lg overflow-hidden"
              style={{ background: `radial-gradient(40px circle at ${mousePosition.x}px 2px, #111827 0%, transparent 70%)` }}
            />
          </>
        )}
      </div>
    </div>
  );
};

// ── Plus Icon ─────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <line x1="6" y1="0" x2="6" y2="12" stroke="#111827" strokeWidth="1.5" />
    <line x1="0" y1="6" x2="12" y2="6" stroke="#111827" strokeWidth="1.5" />
  </svg>
);

// ── Main Page ─────────────────────────────────────────────
type CompanyPick = { companyId: string; companyName: string };

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companies, setCompanies] = useState<CompanyPick[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = { email, password };
      if (companyId) payload.companyId = companyId;

      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const j = await r.json();

      if (r.status === 409 && j?.error === 'MULTIPLE_COMPANIES') {
        setCompanies(j.companies || []);
        setCompanyId('');
        setError('Select your company to continue.');
        setLoading(false);
        return;
      }
      if (!r.ok) throw new Error(j?.error || 'Login failed');

      const me = await fetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      }).then((r) => r.json());

      if (!me?.session?.companyId) throw new Error('Session not created. Try again.');
      sessionStorage.setItem('justLoggedIn', '1');
      router.replace('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        backgroundImage: `
          linear-gradient(to right, #d1d5db 1px, transparent 1px),
          linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      {/* Top fade */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent z-10" />
      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
      {/* Left fade */}
      <div className="pointer-events-none absolute top-0 left-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
      {/* Right fade */}
      <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />

      {/* ── Content wrapper ── */}
      <div className="relative z-20 w-full max-w-5xl flex flex-col lg:flex-row items-center gap-16">

        {/* ── LEFT: Content ── */}
        <div className="flex-1 flex flex-col gap-6 text-left">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/home/ai-verse.png"
              alt="AIVerse"
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-gray-900 font-bold text-2xl tracking-tight">AIVerse</span>
          </div>

          {/* Heading */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">Enterprise Platform</p>
            <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
              Welcome To 
              <span className="text-gray-900"> AIVerse <span className='text-blue-600'>ERP!</span></span>
            </h1>
          </div>

          <p className="text-gray-600 text-base leading-relaxed max-w-sm">
            Streamline your business operations with our all-in-one ERP solution — sales, inventory, purchases, and customer management unified.
          </p>

          {/* Stats */}
          <div className="flex items-center gap-10 pt-2">
            {[
              { value: '10x', label: 'Faster Operations' },
              { value: '99%', label: 'Uptime Guarantee' },
              { value: '24/7', label: 'Support Access' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Form Card ── */}
        <div className="w-full max-w-sm relative">

          {/* Plus icons — 4 corners */}
          <div className="absolute -top-2 -left-2 z-30"><PlusIcon /></div>
          <div className="absolute -top-2 -right-2 z-30"><PlusIcon /></div>
          <div className="absolute -bottom-2 -left-2 z-30"><PlusIcon /></div>
          <div className="absolute -bottom-2 -right-2 z-30"><PlusIcon /></div>

          <div className="bg-white border border-gray-200 rounded-none shadow-xl px-8 py-10">

            {/* Card header */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign In</h2>
              <p className="text-sm text-gray-400 mt-1">Enter your credentials to continue.</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Company picker */}
            {companies.length > 0 && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Select Company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-none bg-white text-sm text-gray-800 focus:outline-none focus:border-gray-500 transition"
                  required
                >
                  <option value="">-- Select --</option>
                  {companies.map((c) => (
                    <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
                  ))}
                </select>
                <p className="text-gray-400 text-xs mt-1.5">This email is linked to multiple companies.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-20" size={15} />
                <AppInput
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    setCompanies([]);
                    setCompanyId('');
                  }}
                  style={{ paddingLeft: '2.25rem' }}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-600">Password</label>
                  <a href="#" className="text-xs text-gray-400 hover:text-gray-700 transition">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-20" size={15} />
                  <AppInput
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (companies.length > 0 && !companyId)}
                className="group/button relative mt-1 w-full inline-flex justify-center items-center overflow-hidden rounded-none bg-gray-900 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gray-800 hover:scale-[1.01] hover:shadow-lg disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-700 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                  <div className="relative h-full w-8 bg-white/10" />
                </div>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
