"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MODULES,
  MODULE_GROUPS,
  ERP_SECTIONS,
  type AppModule,
  expandModules,
  getChildren,
} from "@/types/modules";

function IndCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 accent-blue-500"
    />
  );
}

export default function ModulePicker({
  value,
  onChange,
}: {
  value: AppModule[];
  onChange: (next: AppModule[]) => void;
}) {
  const set = useMemo(() => new Set<AppModule>(value), [value]);

  function commit(next: Set<AppModule>) {
    onChange(Array.from(next));
  }

  function toggleParent(parent: AppModule) {
    const next = new Set(set);
    const expanded = expandModules([parent]);

    const allSelected = expanded.every((x) => next.has(x));
    if (allSelected) expanded.forEach((x) => next.delete(x));
    else expanded.forEach((x) => next.add(x));

    commit(next);
  }

  function toggleLeaf(leaf: AppModule) {
    const next = new Set(set);

    if (next.has(leaf)) next.delete(leaf);
    else next.add(leaf);

    for (const sec of ERP_SECTIONS) {
      const parent = sec.key;
      const children = getChildren(parent);

      if (!children.includes(leaf)) continue;

      const allOn =
        children.length > 0 && children.every((c) => next.has(c));

      if (allOn) next.add(parent);
      else next.delete(parent);
    }

    commit(next);
  }

  return (
    <div className="grid gap-4">
      {MODULE_GROUPS.map((group) => {
        const isERP = group === "ERP";

        const flatItems = (Object.keys(MODULES) as AppModule[]).filter(
          (k) => MODULES[k].group === group
        );

        return (
          <div
            key={group}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm font-semibold text-white/85 mb-3">
              {group}
            </div>

            {isERP ? (
              <div className="grid gap-3">
                {ERP_SECTIONS.map((sec) => {
                  const parent = sec.key;
                  const children = getChildren(parent);

                  const selectedCount = children.filter((c) =>
                    set.has(c)
                  ).length;

                  const allChildrenOn =
                    children.length > 0 &&
                    selectedCount === children.length;

                  const someChildrenOn =
                    selectedCount > 0 &&
                    selectedCount < children.length;

                  return (
                    <div
                      key={sec.key}
                      className="rounded-2xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <IndCheckbox
                          checked={allChildrenOn || set.has(parent)}
                          indeterminate={someChildrenOn}
                          onChange={() => toggleParent(parent)}
                        />
                        <span className="text-sm font-semibold text-white/85">
                          {sec.title}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {children.map((c) => (
                          <label
                            key={c}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 bg-black/30 hover:bg-black/40 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={set.has(c)}
                              onChange={() => toggleLeaf(c)}
                              className="h-4 w-4 accent-blue-500"
                            />
                            <span className="text-sm text-white/80">
                              {MODULES[c]?.label ?? c}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {flatItems.map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 bg-black/20 hover:bg-black/30 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={set.has(k)}
                      onChange={() => {
                        const next = new Set(set);
                        next.has(k) ? next.delete(k) : next.add(k);
                        commit(next);
                      }}
                      className="h-4 w-4 accent-blue-500"
                    />
                    <span className="text-sm text-white/85">
                      {MODULES[k].label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}