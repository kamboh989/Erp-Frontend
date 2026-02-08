"use client";

import { useEffect } from "react";

export default function MetaCallbackPage() {
  useEffect(() => {
    // This page exists only so redirect URI matches. Actual work done in API route below.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    window.location.href = `/api/meta/oauth/callback?code=${encodeURIComponent(code || "")}&state=${encodeURIComponent(state || "")}`;
  }, []);

  return (
    <div className="max-w-xl mx-auto p-10 text-center">
      <div className="text-2xl font-bold">Connecting Meta…</div>
      <div className="text-gray-500 mt-2">Please wait.</div>
    </div>
  );
}
