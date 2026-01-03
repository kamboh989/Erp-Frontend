"use client";

import { MODULES, MODULE_GROUPS, type AppModule } from "@/types/modules";

export default function ModulePicker({
  value,
  onChange,
}: {
  value: AppModule[];
  onChange: (next: AppModule[]) => void;
}) {
  const set = new Set(value);

  function toggle(m: AppModule) {
    const next = new Set(set);
    next.has(m) ? next.delete(m) : next.add(m);
    onChange(Array.from(next));
  }

  function selectAllInGroup(group: string) {
    const items = (Object.keys(MODULES) as AppModule[]).filter(
      (k) => MODULES[k].group === group
    );
    const next = new Set(set);
    items.forEach((i) => next.add(i));
    onChange(Array.from(next));
  }

  function clearAllInGroup(group: string) {
    const items = (Object.keys(MODULES) as AppModule[]).filter(
      (k) => MODULES[k].group === group
    );
    const next = new Set(set);
    items.forEach((i) => next.delete(i));
    onChange(Array.from(next));
  }

  return (
    <div className="grid gap-4">
      {MODULE_GROUPS.map((group) => {
        const items = (Object.keys(MODULES) as AppModule[]).filter(
          (k) => MODULES[k].group === group
        );

        return (
          <div key={group} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-white/85">{group}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectAllInGroup(group)}
                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => clearAllInGroup(group)}
                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((k) => (
                <label
                  key={k}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 bg-black/20 hover:bg-black/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={set.has(k)}
                    onChange={() => toggle(k)}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className="text-sm text-white/85">{MODULES[k].label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
