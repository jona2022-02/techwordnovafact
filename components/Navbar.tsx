'use client';

import { Menu, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between lg:justify-end shadow-sm">
      <button onClick={onToggleSidebar} className="lg:hidden text-zinc-700 dark:text-zinc-200">
        <Menu className="w-5 h-5" />
      </button>
      <span className="lg:hidden text-sm font-semibold text-zinc-700 dark:text-zinc-100">
        Verificador DTE
      </span>
      <button
        onClick={toggleTheme}
        className="ml-auto rounded-md p-2 text-sm bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
