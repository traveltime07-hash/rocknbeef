// pages/index.jsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";
import Block from "../components/Block";
import Gallery from "../components/Gallery";
import LanguageSwitcher from "../components/LanguageSwitcher";

const SUPPORTED_LANGS = ["pl", "en", "de", "es", "uk"]; // dodany ukraiński

export default function Home() {
  const [lang, setLang] = useState("pl");
  const [blocks, setBlocks] = useState([]);
  const [translations, setTranslations] = useState({});
  const [gallery, setGallery] = useState([]);

  // Dane kontaktowe + linki
  const CONTACT = {
    name: "Rock’n Beef — Steakhouse",
    street: "Zacisze 5C/1",
    postalCity: "65-775 Zielona Góra",
    phone: "+48 697 002 234",
    fb: "https://www.facebook.com/steakhouse.rock.n.beef/?locale=pl_PL",
    ig: "https://www.instagram.com/steakhouse_rock_n_beef/",
    gmb: "https://share.google/cqP9mGzrANpxGjYki",
    maps: "https://maps.app.goo.gl/GS55DKSvrL4iW8xT8",
  };

  // Mapa na samym dole
  const MAP_IFRAME_SRC =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2459.5527136925057!2d15.476904176899577!3d51.942111678853266!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470613f002e97b19%3A0xa29f24cc18ff1b6c!2sSteakHouse%20Rock'n%20BEEF!5e0!3m2!1spl!2spl!4v1758896343133!5m2!1spl!2spl";

  // Normalizujemy język od switchera (np. gdy zwraca "EN")
  const handleLangChange = (value) => {
    const l = String(value || "").toLowerCase();
    setLang(SUPPORTED_LANGS.includes(l) ? l : "pl");
  };

  useEffect(() => {
    (async () => {
      // Bloki (z PDF)
      const { data: b } = await supabase
        .from("blocks")
        .select(
          "id, slug, visible, background_image, link_url, link_text, position, pdf_url, pdf_button_text"
        )
        .order("position", { ascending: true });

      // Tłumaczenia — najnowsze po updated_at (fallback: id)
      const { data: t } = await supabase
        .from("translations")
        .select("id, block_id, lang, title, description, updated_at")
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false });

      // Galeria
      const { data: g } = await supabase
        .from("gallery")
        .select(
          "id, image_url, caption_pl, caption_en, caption_de, caption_es, position"
        )
        .order("position", { ascending: true });

      setBlocks((b || []).filter((x) => x.visible));

      // Mapujemy najnowszy rekord per (block_id, lang).
      // Ponieważ sort jest DESC, pierwszy napotkany dla pary (block_id, lang)
      // to najnowszy – i tylko jego zapisujemy.
      const map = {};
      (t || []).forEach((row) => {
        if (!map[row.block_id]) map[row.block_id] = {};
        if (!map[row.block_id][row.lang]) {
          map[row.block_id][row.lang] = {
            title: row.title,
            description: row.description,
          };
        }
      });
      setTranslations(map);

      setGallery(g || []);
    })();
  }, []);

  // Bezpieczny getter: lang -> PL -> dowolny dostępny
  const getTr = useMemo(() => {
    return (id) => {
      const pack = translations?.[id] || null;
      if (!pack) return {};
      // 1) wybrany
      if (pack[lang]?.title || pack[lang]?.description) return pack[lang];
      // 2) fallback do PL
      if (pack.pl?.title || pack.pl?.description) return pack.pl;
      // 3) pierwszy dostępny język (gdy brak PL)
      const first = Object.values(pack)[0];
      return first || {};
    };
  }, [translations, lang]);

  return (
    <>
      {/* Header — logo po lewej, język po prawej */}
      <header className="py-4 px-6 sticky top-0 z-40 bg-black/60 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icon-32.png"
              alt="Rock’n Beef"
              width={32}
              height={32}
              priority
            />
            <span className="text-xl font-extrabold tracking-tight">
              Rock’n Beef
            </span>
          </Link>

          <div className="text-white/60 text-sm hidden sm:block">
            Steakhouse — Zielona Góra
          </div>

          <div className="flex-1" />
          <LanguageSwitcher value={lang} onChange={handleLangChange} />
        </div>
      </header>

      <main>
        {blocks.map((b) => {
          const tr = getTr(b.id);
          return (
            <Block
              key={b.id}
              background={b.background_image}
              title={tr.title}
              description={tr.description}
              // przyciski nie zależą od tłumaczeń (masz je w blocks)
              linkText={b.link_text}
              linkUrl={b.link_url}
              pdfUrl={b.pdf_url}
              pdfButtonText={b.pdf_button_text}
            />
          );
        })}

        {blocks.some((b) => b.slug === "gallery" && b.visible) && (
          <Gallery items={gallery} />
        )}
      </main>

      {/* Stopka — kontakt, linki, panel admina i mapa */}
      <footer className="px-6 pt-10 text-white/80 bg-black/80">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-3">
          {/* kolumna 1 — adres/telefon */}
          <div>
            <div className="text-white font-bold text-lg mb-2">
              {CONTACT.name}
            </div>
            <div>{CONTACT.street}</div>
            <div>{CONTACT.postalCity}</div>
            <div className="mt-1">
              <a
                href={`tel:${CONTACT.phone.replace(/\s+/g, "")}`}
                className="hover:text-white underline"
              >
                {CONTACT.phone}
              </a>
            </div>
          </div>

          {/* kolumna 2 — linki z ikonkami */}
          <div>
            <div className="text-white font-semibold mb-3">Znajdź nas</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                {/* FB */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/80"
                >
                  <path d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06C2 17.08 5.66 21.2 10.44 21.95v-6.96H7.9v-2.93h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.86h2.78l-.44 2.93h-2.34v6.96C18.34 21.2 22 17.08 22 12.06z" />
                </svg>
                <a
                  href={CONTACT.fb}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white underline"
                >
                  Facebook
                </a>
              </li>
              <li className="flex items-center gap-2">
                {/* IG */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/80"
                >
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10a5 5 0 0 0 0-10zm0 2.2A2.8 2.8 0 1 1 9.2 12A2.8 2.8 0 0 1 12 9.2ZM18 6.7a1.2 1.2 0 1 0 0 2.4a1.2 1.2 0 0 0 0-2.4Z" />
                </svg>
                <a
                  href={CONTACT.ig}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white underline"
                >
                  Instagram
                </a>
              </li>
              <li className="flex items-center gap-2">
                {/* Google wizytówka */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/80"
                >
                  <path d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.6 4.4-5.35 4.4a5.5 5.5 0 1 1 0-11c1.25 0 2.4.45 3.3 1.2l2-2A8.46 8.46 0 0 0 12 4.5a8.5 8.5 0 1 0 0 17c4.9 0 8.1-3.45 8.1-8.3c0-.55-.05-1.05-.15-1.6Z" />
                </svg>
                <a
                  href={CONTACT.gmb}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white underline"
                >
                  Google — wizytówka
                </a>
              </li>
              <li className="flex items-center gap-2">
                {/* Jak dojechać */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/80"
                >
                  <path d="M12 2C8.7 2 6 4.7 6 8c0 4.4 6 12 6 12s6-7.6 6-12c0-3.3-2.7-6-6-6Zm0 8.2A2.2 2.2 0 1 1 12 5.8a2.2 2.2 0 0 1 0 4.4Z" />
                </svg>
                <a
                  href={CONTACT.maps}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white underline"
                >
                  Jak dojechać
                </a>
              </li>
            </ul>
          </div>

          {/* kolumna 3 — panel admina */}
          <div className="md:text-right">
            <div className="text-white font-semibold mb-3">Zarządzanie</div>
            <a href="/admin" className="hover:text-white underline">
              Panel admina
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 text-center text-white/60">
          © {new Date().getFullYear()} Rock’n Beef — Wszystkie prawa zastrzeżone
        </div>

        {/* Mapa NA SAMYM DOLE */}
        <div className="max-w-6xl mx-auto mt-8 pb-10">
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={MAP_IFRAME_SRC}
              className="absolute inset-0 w-full h-full rounded-lg"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa dojazdu — Rock’n Beef"
            />
          </div>
        </div>
      </footer>
    </>
  );
}
