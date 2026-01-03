'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useRouter } from "next/navigation";

interface LoginFormProps {
  // ab onSubmit optional nahi chahiye (aap rakhna chaho to rakh lo)
  onSubmit?: (email: string, password: string) => void;
}

interface VideoBackgroundProps {
  videoUrl: string;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.error("Video autoplay failed:", err));
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-black/30 z-10" />
      <video
        ref={videoRef}
        className="absolute inset-0 min-w-full min-h-full object-cover w-auto h-auto"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // agar aap external handler use karna chaho:
    if (onSubmit) {
      onSubmit(email, password);
      return;
    }

    setLoading(true);
    try {
      // 1) login API
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const j = await r.json();

      if (!r.ok) {
        setError(j?.error || "Login failed");
        return;
      }

      // 2) session read (cookie set ho chuki hoti hai)
      const me = await fetch("/api/auth/me", { method: "GET", cache: "no-store" }).then((x) => x.json());

      const role = me?.session?.role;

      // 3) role-based redirect
      if (role === "SUPER_ADMIN") {
        router.push("/super-admin/companies");
      } else {
        router.push("/dashboard"); // aapka client admin dashboard
      }
      router.refresh();
    } catch (err: any) {
      setError("Network error. Try again.");
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

      {/* Error */}
      {error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Mail className="text-white/60" size={18} />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Lock className="text-white/60" size={18} />
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full py-3
            bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
            text-white font-medium rounded-lg
            shadow-lg
            hover:from-blue-600 hover:via-blue-700 hover:to-blue-800
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  );
};
