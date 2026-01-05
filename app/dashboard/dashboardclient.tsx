"use client";

import { useEffect, useState } from "react";

export default function DashboardClient() {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative p-6 text-white">
      {/* 🎉 SUCCESS OVERLAY */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-scale-in rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 px-10 py-8 text-center shadow-2xl">
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="text-2xl font-bold text-white">
              Login Successful!
            </h1>
            <p className="text-white/90 mt-2">
              Welcome to your ERP dashboard
            </p>
          </div>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <div className="relative z-10">
        <div className="text-2xl font-bold">Dashboard</div>
        <p className="text-white/70 mt-2">
          You are logged in successfully.
        </p>
      </div>
    </div>
  );
}
