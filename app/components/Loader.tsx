"use client";

type AppLoaderProps = {
  title?: string;
  subtitle?: string;

  variant?: "page" | "table" | "form";
  showStats?: boolean;

  // table skeleton controls
  rows?: number;
  cols?: number;

  // for layouts like leads (list + details)
  rightPanel?: boolean;

  className?: string;
};

export default function AppLoader({
  title = "Loading…",
  subtitle = "Please wait a moment",
  variant = "page",
  showStats = true,
  rows = 6,
  cols = 4,
  rightPanel = true,
  className = "",
}: AppLoaderProps) {
  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Top gradient shimmer bar */}
      <div className="h-[3px] w-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 animate-pulse mb-6" />

      {/* Header with SINGLE spinner */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {/* Top loading circle (ONLY ONE) */}
          <div className="h-9 w-9 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />

          <div>
            <div className="text-lg font-bold text-gray-900">{title}</div>
            <div className="text-sm text-gray-500">{subtitle}</div>
          </div>
        </div>

        {/* fake action button */}
        <div className="h-10 w-28 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 shadow-sm" />
      </div>

      {/* Stats skeleton */}
      {showStats && (
        <div className="grid md:grid-cols-4 gap-4 mb-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <div className="h-3 w-20 bg-black/10 rounded mb-2" />
              <div className="h-8 w-16 bg-black/20 rounded mb-3" />
              <div className="h-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-400" />
            </div>
          ))}
        </div>
      )}

      {/* BODY */}
      {variant === "page" && (
        <div
          className={`grid ${
            rightPanel ? "lg:grid-cols-3" : "lg:grid-cols-1"
          } gap-4`}
        >
          {/* Main list */}
          <div
            className={`${
              rightPanel ? "lg:col-span-2" : ""
            } rounded-2xl border border-black/10 bg-white p-5 shadow-sm animate-pulse`}
          >
            <div className="h-4 w-40 bg-black/10 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: rows }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50"
                />
              ))}
            </div>
          </div>

          {/* Right panel */}
          {rightPanel && (
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm animate-pulse">
              <div className="h-4 w-32 bg-black/10 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 w-full bg-black/10 rounded"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLE VARIANT */}
      {variant === "table" && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm animate-pulse">
          <div className="h-4 w-40 bg-black/10 rounded mb-4" />

          <div className="space-y-3">
            {/* header */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: cols }).map((_, i) => (
                <div key={i} className="h-3 bg-black/10 rounded" />
              ))}
            </div>

            {/* rows */}
            {Array.from({ length: rows }).map((_, r) => (
              <div
                key={r}
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: cols }).map((_, c) => (
                  <div
                    key={c}
                    className="h-10 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM VARIANT */}
      {variant === "form" && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm animate-pulse">
          <div className="h-4 w-40 bg-black/10 rounded mb-5" />

          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-black/10 rounded mb-2" />
                <div className="h-11 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50" />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <div className="h-10 w-32 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 shadow-sm" />
          </div>
        </div>
      )}
    </div>
  );
}
