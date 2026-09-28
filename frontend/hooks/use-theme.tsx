"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isMounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  isMounted: false,
});

const THEME_STORAGE_KEY = "cipherlens_theme";
const LEGACY_STORAGE_KEY = "bat_signal_theme";

// Store helpers
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = (localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)) as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(callback: () => void) {
  listeners.push(callback);
  if (typeof window === "undefined") {
    return () => {
      listeners = listeners.filter((l) => l !== callback);
    };
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      callback();
    }
  };

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = () => callback();

  window.addEventListener("storage", onStorage);
  mediaQuery.addEventListener("change", onMediaChange);

  return () => {
    listeners = listeners.filter((l) => l !== callback);
    window.removeEventListener("storage", onStorage);
    mediaQuery.removeEventListener("change", onMediaChange);
  };
}

const emptySubscribe = () => () => {};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const applyThemeToDOM = useCallback((nextTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (nextTheme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore in private browsing
    }
    applyThemeToDOM(nextTheme);
    emitChange();
  }, [applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // Sync class on client mount and when theme changes
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme, applyThemeToDOM]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isMounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
