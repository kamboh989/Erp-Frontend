"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface VideoBackgroundProps {
  videoUrl: string;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-black/30 z-10" />
      <video
        ref={videoRef}
        className="absolute inset-0 min-w-full min-h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
};

type CompanyPick = { companyId: string; companyName: string };

export const LoginForm: React.FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ new: multi-company support
  const [companies, setCompanies] = useState<CompanyPick[]>([]);
  const [companyId, setCompanyId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitLogin = async (payload: any) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const j = await r.json();

    // ✅ multiple companies -> show chooser
    if (r.status === 409 && j?.error === "MULTIPLE_COMPANIES") {
      setCompanies(j.companies || []);
      setCompanyId(""); // reset selection
      throw new Error("Select your company to continue.");
    }

    if (!r.ok) throw new Error(j?.error || "Login failed");
    return j;
  };

  const finishAndGo = async () => {
    const me = await fetch("/api/auth/me", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    }).then((r) => r.json());

    if (!me?.session?.companyId) {
      throw new Error("Session not created. Try again.");
    }

    sessionStorage.setItem("justLoggedIn", "1");
    router.replace("/dashboard");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // If user already selected a company, send it
      const payload: any = { email, password };
      if (companyId) payload.companyId = companyId;

      await submitLogin(payload);
      await finishAndGo();
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-black/50 border border-white/10 rounded-2xl relative z-20">
      <h2 className="text-3xl font-bold text-white text-center mb-6">Sign In</h2>

      <p className="text-white/70 text-center text-sm mb-6">
        Enter your email and password to access your account
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* ✅ Company picker (only appears when email exists in multiple companies) */}
      {companies.length > 0 && (
        <div className="mb-4">
          <label className="block text-white/80 text-sm mb-2">Select Company</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="" className="text-black">
              -- Select --
            </option>
            {companies.map((c) => (
              <option key={c.companyId} value={c.companyId} className="text-black">
                {c.companyName}
              </option>
            ))}
          </select>

          <p className="text-white/60 text-xs mt-2">
            This email is linked to multiple companies. Choose the correct one.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // ✅ reset company list if user changes email
              setCompanies([]);
              setCompanyId("");
            }}
            required
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (companies.length > 0 && !companyId)}
          className="
            w-full py-3
            bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
            text-white font-medium rounded-lg
            shadow-lg
            hover:from-blue-600 hover:via-blue-700 hover:to-blue-800
            transition-all
            disabled:opacity-60
          "
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  );
};
