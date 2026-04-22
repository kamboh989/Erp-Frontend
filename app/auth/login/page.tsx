'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ── AppInput ──────────────────────────────────────────────
interface InputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  [key: string]: any;
}

const AppInput = (props: InputProps) => {
  const { label, placeholder, icon, ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="w-full min-w-[200px] relative">
      {label && <label className="block mb-2 text-sm">{label}</label>}
      <div className="relative w-full">
        <input
          className="peer relative z5 border-2 border-gray-300 h-13 w-full rounded-md bg-gray-50 px-4 py-3 font-thin outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-white placeholder:font-medium text-gray-800 placeholder:text-gray-400"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, #1e293b 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, #1e293b 0%, transparent 70%)`,
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">{icon}</div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────
type CompanyPick = { companyId: string; companyName: string };

const Page = () => {
  const router = useRouter();

  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companies, setCompanies] = useState<CompanyPick[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // mouse glow state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // login logic
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
    <div className="h-screen w-[100%] bg-white flex items-center justify-center p-4">
      <div className="card w-[90%] lg:w-[70%] md:w-[80%] flex justify-between h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-gray-100">

        {/* ── LEFT: Form ── */}
        <div
          className="w-full lg:w-1/2 px-4 lg:px-16 left h-full relative overflow-hidden bg-white"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Mouse glow */}
          <div
            className={`absolute pointer-events-none w-[500px] h-[500px] bg-gradient-to-r from-purple-300/30 via-blue-300/30 to-pink-300/30 rounded-full blur-3xl transition-opacity duration-200 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          />

          <div className="form-container sign-in-container h-full z-10 relative">
            <form
              className="text-center py-10 md:py-16 grid gap-2 h-full"
              onSubmit={handleSubmit}
            >
              {/* Logo + Title */}
              <div className="grid gap-3 md:gap-4 mb-2">
                <div className="flex justify-center">
                  <img
                    src="/home/ai-verse.png"
                    alt="AIVerse Logo"
                    className="w-14 h-14 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Sign in</h1>
                <p className="text-sm text-gray-400">Welcome back to AIVerse ERP</p>
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-left">
                  {error}
                </div>
              )}

              {/* Company picker */}
              {companies.length > 0 && (
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Company</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-md bg-gray-50 text-sm text-gray-800 focus:outline-none focus:bg-white transition"
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

              {/* Inputs */}
              <div className="grid gap-4 items-center">
                <AppInput
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    setCompanies([]);
                    setCompanyId('');
                  }}
                  required
                />
                <AppInput
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                />
              </div>


              {/* Submit */}
              <div className="flex gap-4 justify-center items-center">
                <button
                  type="submit"
                  disabled={loading || (companies.length > 0 && !companyId)}
                  className="group/button relative inline-flex justify-center items-center overflow-hidden rounded-md bg-slate-800 px-4 py-1.5 text-xs font-normal text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:shadow-slate-400 disabled:opacity-60 cursor-pointer"
                >
                  <span className="text-sm px-2 py-1">
                    {loading ? 'Signing in...' : 'Sign In'}
                  </span>
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                    <div className="relative h-full w-8 bg-white/20" />
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Image ── */}
        <div className="hidden lg:block w-1/2 right h-full overflow-hidden">
          <Image
            src="https://images.pexels.com/photos/7102037/pexels-photo-7102037.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            loader={({ src }) => src}
            width={1000}
            height={1000}
            priority
            alt="Carousel image"
            className="w-full h-full object-cover transition-transform duration-300 "
          />
        </div>

      </div>
    </div>
  );
};

export default Page;
