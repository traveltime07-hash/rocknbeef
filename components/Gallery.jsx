// components/Gallery.jsx
import { useState } from "react";

export default function Gallery({ items = [] }) {
  const [active, setActive] = useState(null);

  const open = (item) => setActive(item);
  const close = () => setActive(null);

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-6">Galeria</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((g) => (
            <button
              key={g.id}
              onClick={() => open(g)}
              className="group relative block focus:outline-none"
              aria-label="Powiększ zdjęcie"
            >
              <img
                src={g.image_url}
                alt={g.caption_pl || g.caption_en || "Zdjęcie"}
                className="h-40 w-full object-cover rounded-lg transition-transform duration-200 group-active:scale-95"
                loading="lazy"
              />
              {(g.caption_pl || g.caption_en) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs p-1 rounded-b-lg">
                  {g.caption_pl || g.caption_en}
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {active && (
        <div
          onClick={close}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <img
            src={active.image_url}
            alt={active.caption_pl || active.caption_en || "Zdjęcie"}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
