import { useEffect, useState } from "react";

const langs = ["pl", "en", "de", "es"];

export default function LanguageSwitcher({ value, onChange }) {
  const [lang, setLang] = useState(value || "pl");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved && langs.includes(saved)) {
      setLang(saved);
      onChange?.(saved);
    }
  }, []);

  const set = (l) => {
    setLang(l);
    localStorage.setItem("lang", l);
    onChange?.(l);
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur px-2 py-1 rounded-xl">
      <div className="flex gap-1">
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => set(l)}
            className={`px-2 py-1 rounded-lg text-sm ${lang===l ? "bg-white text-black" : "text-white hover:bg-white/20"}`}
            aria-label={`Language ${l}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}