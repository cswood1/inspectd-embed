import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "inspectd_saved_vins";

const SavedStoreContext = createContext(null);

function loadSaved() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through
  }
  return [];
}

export function SavedStoreProvider({ children }) {
  const [savedVins, setSavedVins] = useState(() => loadSaved());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedVins));
    } catch {
      // ignore
    }
  }, [savedVins]);

  const value = useMemo(() => {
    const set = new Set(savedVins);
    return {
      savedVins,
      isSaved: (vin) => set.has(vin),
      count: savedVins.length,
      toggle: (vin) =>
        setSavedVins((list) =>
          list.includes(vin) ? list.filter((v) => v !== vin) : [vin, ...list]
        ),
      remove: (vin) =>
        setSavedVins((list) => list.filter((v) => v !== vin)),
      clear: () => setSavedVins([]),
    };
  }, [savedVins]);

  return (
    <SavedStoreContext.Provider value={value}>
      {children}
    </SavedStoreContext.Provider>
  );
}

export function useSavedStore() {
  const ctx = useContext(SavedStoreContext);
  if (!ctx)
    throw new Error("useSavedStore must be used inside <SavedStoreProvider>");
  return ctx;
}
