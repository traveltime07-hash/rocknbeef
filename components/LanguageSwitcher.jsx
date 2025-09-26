// components/LanguageSwitcher.jsx
import { useEffect, useState } from "react";

const langs = ["pl", "en", "de", "es", "uk"]; // + UK

export default function LanguageSwitcher({ value = "pl", onChange }) {
  const [lang, setLang] = useState(value);

  // 1) Start: wczytaj z localStorage (jeśli jest poprawny)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("lang");
    if (saved && langs.includes(saved)) {
      setLang(saved);
      onChange?.(saved);
    }
  }, []);

  // 2) Synchronizacja z props.value (gdy rodzic zmieni)
  useEffect(() => {
    if (value && langs.includes(value) && value !== lang) {
      setLang(value);
    }
  }, [value]);

  const choose = (l) => {
    setLang(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", l);
    }
    onChange?.(l);
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur px-2 py-1 rounded-xl">
      <div className="flex gap-1">
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => choose(l)}
            className={`px-2 py-1 rounded-lg text-sm ${
              lang === l ? "bg-white text-black" : "text-white hover:bg-white/20"
            }`}
            aria-label={`Language ${l}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
