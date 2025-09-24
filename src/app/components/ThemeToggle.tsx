  "use client";

  import { useEffect, useState } from "react";

  export default function ThemeToggle() {
    const [darkMode, setDarkMode] = useState(false);

    
    useEffect(() => {
      const savedMode = localStorage.getItem("theme");
      if (savedMode === "dark") {
        document.documentElement.classList.add("dark");
        setDarkMode(true);
      }
    }, []);


    useEffect(() => {
      if (darkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    }, [darkMode]);

    return (
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="px-4 py-2 rounded-lg transition bg-gray-200 dark:bg-gray-800 dark:text-white"
      >
        {darkMode ? "🌙 Noche" : "☀️ Día"}
      </button>
    );
  }
