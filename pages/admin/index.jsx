// pages/admin/index.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "rocknbeef";

/** Zmniejszanie obrazka przed uploadem (webp, max szer. 1600) */
async function resizeImage(file, maxW = 1600) {
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  await new Promise((res) => (img.onload = res));
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((res) =>
    canvas.toBlob(res, "image/webp", 0.85)
  );
  return new File([blob], file.name.replace(/\.(jpg|jpeg|png)$/i, ".webp"), {
    type: "image/webp",
  });
}

/** Z publicznego URL wyciąga ścieżkę pliku w Storage (np. gallery/xxx.webp) */
function extractStoragePath(publicUrl) {
  try {
    const u = new URL(publicUrl);
    const marker = `/public/${bucket}/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return u.pathname.slice(i + marker.length);
  } catch {
    return null;
  }
}

/** Jeśli w DB jest stara wartość (np. nazwa pliku), zwróć pełny publiczny URL */
function toPublicUrlIfNeeded(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const path =
    pathOrUrl.startsWith("gallery/") ||
    pathOrUrl.startsWith("blocks/") ||
    pathOrUrl.startsWith("docs/")
      ? pathOrUrl
      : `gallery/${pathOrUrl}`;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [translations, setTranslations] = useState({});
  const [gallery, setGallery] = useState([]);
  const langs = ["pl", "en", "de", "es", "uk"]; // + UK
  const [lang, setLang] = useState("pl");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState({ id: null, lang: null }); // do spinnera na auto-translate

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/admin/login";
      else setSession(data.session);
    });
  }, []);

  // dane
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: b } = await supabase
        .from("blocks")
        .select("*")
        .order("position", { ascending: true });

      const { data: t } = await supabase.from("translations").select("*");

      const { data: g } = await supabase
        .from("gallery")
        .select("*")
        .order("position", { ascending: true });

      // map tłumaczeń
      const map = {};
      (t || []).forEach((r) => {
        map[r.block_id] = map[r.block_id] || {};
        map[r.block_id][r.lang] = {
          id: r.id,
          title: r.title,
          description: r.description,
        };
      });

      const fixedGallery = (g || []).map((item) => ({
        ...item,
        image_url: toPublicUrlIfNeeded(item.image_url),
      }));

      setBlocks(b || []);
      setTranslations(map);
      setGallery(fixedGallery);
    })();
  }, [session]);

  /** upload tła w bloku */
  const uploadBackground = async (blockId, slug) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      const file = await resizeImage(input.files[0]);
      const path = `blocks/${slug}-${blockId}-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
      if (error) return alert(error.message);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, background_image: data.publicUrl } : b
        )
      );
    };
  };

  /** upload wielu zdjęć do galerii */
  const uploadGallery = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.click();
    input.onchange = async () => {
      for (const file of input.files) {
        const resized = await resizeImage(file);
        const path = `gallery/${Date.now()}-${file.name}.webp`;
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, resized, { upsert: true });
        if (error) {
          alert(error.message);
          continue;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from("gallery").insert({
          image_url: data.publicUrl,
          created_by: user.id,
        });
      }
      const { data: g } = await supabase
        .from("gallery")
        .select("*")
        .order("position", { ascending: true });
      setGallery(
        (g || []).map((it) => ({
          ...it,
          image_url: toPublicUrlIfNeeded(it.image_url),
        }))
      );
    };
  };

  /** usuwanie zdjęcia z galerii (DB + Storage) z obsługą błędów */
  const removeGalleryItem = async (item) => {
    if (!confirm("Na pewno usunąć to zdjęcie?")) return;

    const del = await supabase.from("gallery").delete().eq("id", item.id);
    if (del.error) {
      alert(`Nie mogę usunąć z bazy: ${del.error.message}`);
      return;
    }

    const storagePath = extractStoragePath(item.image_url);
    if (storagePath) {
      const rem = await supabase.storage.from(bucket).remove([storagePath]);
      if (rem.error) {
        console.warn(
          "Usunięto rekord w DB, ale plik w Storage nie został skasowany:",
          rem.error.message
        );
      }
    }
    setGallery((prev) => prev.filter((x) => x.id !== item.id));
  };

  /** upload PDF do bloku */
  const uploadPdf = async (blockId, slug) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const path = `docs/${slug}-${blockId}-${Date.now()}.pdf`;
      const up = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (up.error) return alert(up.error.message);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const upd = await supabase
        .from("blocks")
        .update({ pdf_url: data.publicUrl })
        .eq("id", blockId);
      if (upd.error) return alert(upd.error.message);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, pdf_url: data.publicUrl } : b
        )
      );
    };
  };

  /** usuń PDF z bloku (DB + Storage) */
  const removePdf = async (block) => {
    if (!block.pdf_url) return;
    if (!confirm("Usunąć podpięty PDF?")) return;
    const upd = await supabase
      .from("blocks")
      .update({ pdf_url: null })
      .eq("id", block.id);
    if (upd.error) return alert(upd.error.message);
    try {
      const storagePath = extractStoragePath(block.pdf_url);
      if (storagePath) {
        await supabase.storage.from(bucket).remove([storagePath]);
      }
    } catch {}
    setBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, pdf_url: null } : b))
    );
  };

  // --------- AUTO TŁUMACZENIE I NATYCHMIASTOWY ZAPIS DO SUPABASE ----------
  const autoTranslateAndSave = async (block, targetLang /* "en"|"de"|"es"|"uk" */) => {
    try {
      // baza = PL (wymuszamy, żeby nie powielać błędów)
      const base = translations[block.id]?.pl || {};
      const srcTitle = base.title?.trim();
      const srcDesc = base.description?.trim();

      if (!srcTitle && !srcDesc) {
        alert("Brak treści po polsku — uzupełnij PL i spróbuj ponownie.");
        return;
      }

      setBusy({ id: block.id, lang: targetLang });

      // Wywołanie naszego API /api/translate (ustalaliśmy: { text, target })
      const translateOne = async (txt) => {
        if (!txt) return "";
        const r = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: txt, target: targetLang.toUpperCase() }),
        });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.message || "Błąd tłumaczenia");
        return j.text;
      };

      const [newTitle, newDesc] = await Promise.all([
        translateOne(srcTitle),
        translateOne(srcDesc),
      ]);

      // Zapis od razu do Supabase (upsert po (block_id, lang))
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const up = await supabase
        .from("translations")
        .upsert(
          {
            block_id: block.id,
            lang: targetLang,
            title: newTitle || "",
            description: newDesc || "",
            created_by: user?.id || null,
          },
          { onConflict: "block_id,lang" }
        )
        .select("*")
        .single();

      if (up.error) throw up.error;

      // Odśwież lokalny stan — od razu widać
      setTranslations((prev) => ({
        ...prev,
        [block.id]: {
          ...(prev[block.id] || {}),
          [targetLang]: { title: newTitle || "", description: newDesc || "" },
        },
      }));

      setMsg(`✅ Przetłumaczono i zapisano (${targetLang.toUpperCase()})`);
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusy({ id: null, lang: null });
    }
  };

  /** zapisz zmiany w blokach i opisach galerii (dla bieżącego lang) */
  const saveAll = async () => {
    for (const b of blocks) {
      await supabase
        .from("blocks")
        .update({
          background_image: b.background_image,
          link_url: b.link_url,
          link_text: b.link_text,
          visible: b.visible,
          position: b.position,
          pdf_url: b.pdf_url ?? null,
        })
        .eq("id", b.id);

      // Zapis tłumaczeń dla AKTUALNEGO lang (ręczne zmiany w polach)
      const tr = translations[b.id]?.[lang] || {};
      if (tr.id) {
        await supabase
          .from("translations")
          .update({ title: tr.title, description: tr.description })
          .eq("id", tr.id);
      } else if (tr.title || tr.description) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from("translations").insert({
          block_id: b.id,
          lang,
          title: tr.title || "",
          description: tr.description || "",
          created_by: user?.id || null,
        });
      }
    }
    for (const g of gallery) {
      await supabase
        .from("gallery")
        .update({
          caption_pl: g.caption_pl,
          caption_en: g.caption_en,
          caption_de: g.caption_de,
          caption_es: g.caption_es,
        })
        .eq("id", g.id);
    }
    setMsg("✅ Zapisano zmiany");
    setTimeout(() => setMsg(""), 2500);
  };

  /** dodawanie nowego bloku */
  const addBlock = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const nextPos = Math.max(0, ...blocks.map((b) => b.position || 0)) + 1;
    const { data, error } = await supabase
      .from("blocks")
      .insert({
        slug: `block-${Date.now()}`,
        background_image: "",
        link_url: "",
        link_text: "",
        visible: true,
        position: nextPos,
        created_by: user.id,
        pdf_url: null,
      })
      .select("*")
      .single();
    if (error) return alert(error.message);
    setBlocks((prev) => [...prev, data].sort((a, b) => a.position - b.position));
  };

  /** usuwanie bloku (i powiązanych tłumaczeń) */
  const deleteBlock = async (b) => {
    if (!confirm("Na pewno usunąć ten box?")) return;
    await supabase.from("translations").delete().eq("block_id", b.id);
    const del = await supabase.from("blocks").delete().eq("id", b.id);
    if (del.error) {
      alert(`Nie mogę usunąć bloku: ${del.error.message}`);
      return;
    }
    setBlocks((prev) => prev.filter((x) => x.id !== b.id));
  };

  /** przesuwanie bloku */
  const moveBlock = async (id, dir /* -1 = w górę, 1 = w dół */) => {
    const list = [...blocks].sort((a, b) => a.position - b.position);
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const swapIdx = dir === -1 ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];

    const upd1 = await supabase
      .from("blocks")
      .update({ position: b.position })
      .eq("id", a.id);
    const upd2 = await supabase
      .from("blocks")
      .update({ position: a.position })
      .eq("id", b.id);

    if (upd1.error || upd2.error) {
      alert(
        `Nie mogę zmienić kolejności: ${
          upd1.error?.message || upd2.error?.message
        }`
      );
      return;
    }

    const newA = { ...a, position: b.position };
    const newB = { ...b, position: a.position };
    const newList = [...list];
    newList[idx] = newA;
    newList[swapIdx] = newB;
    setBlocks(newList);
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="font-bold">Admin Rock’nBEEF</div>
        <div className="flex-1" />
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={
              lang === l
                ? "bg-white text-black px-3 py-1 rounded-lg"
                : "px-3 py-1"
            }
          >
            {l.toUpperCase()}
          </button>
        ))}
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-8">
        {msg && <div className="bg-green-700 p-3 rounded">{msg}</div>}

        <h2 className="text-xl font-bold">Bloki</h2>

        {blocks
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((b, i, arr) => {
            const tr = translations[b.id]?.[lang] || {};
            const trPL = translations[b.id]?.pl || {};

            return (
              <div key={b.id} className="bg-white/5 p-4 rounded-xl mb-4">
                <div className="mb-2 font-bold">{b.slug || `block-${b.id}`}</div>

                {/* Kolejność / usuwanie */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => moveBlock(b.id, -1)}
                    disabled={i === 0}
                    className="px-2 py-1 bg-white text-black rounded disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveBlock(b.id, 1)}
                    disabled={i === arr.length - 1}
                    className="px-2 py-1 bg-white text-black rounded disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => deleteBlock(b)}
                    className="px-2 py-1 bg-red-600 rounded"
                  >
                    🗑 Usuń box
                  </button>
                </div>

                {/* AUTO-TŁUMACZ – PL → EN/DE/ES/UK (zapis natychmiast) */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {["en", "de", "es", "uk"].map((tgt) => {
                    const busyNow = busy.id === b.id && busy.lang === tgt;
                    return (
                      <button
                        key={tgt}
                        onClick={() => autoTranslateAndSave(b, tgt)}
                        className="px-2 py-1 rounded bg-blue-500 disabled:opacity-40"
                        disabled={!trPL.title && !trPL.description || busyNow}
                        title={
                          !trPL.title && !trPL.description
                            ? "Najpierw uzupełnij treść po polsku."
                            : `Przetłumacz i zapisz: ${tgt.toUpperCase()}`
                        }
                      >
                        {busyNow ? `Tłumaczę ${tgt.toUpperCase()}...` : `Auto-tłumacz: ${tgt.toUpperCase()}`}
                      </button>
                    );
                  })}
                </div>

                {/* Tytuł / opis (dla AKTUALNEGO języka) */}
                <input
                  className="w-full mb-2 px-2 py-1 bg-white/10"
                  placeholder={`Tytuł (${lang.toUpperCase()})`}
                  value={tr.title || ""}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [b.id]: {
                        ...prev[b.id],
                        [lang]: {
                          ...(prev[b.id]?.[lang] || {}),
                          title: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <textarea
                  className="w-full mb-2 px-2 py-1 bg-white/10"
                  placeholder={`Opis (${lang.toUpperCase()})`}
                  value={tr.description || ""}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      [b.id]: {
                        ...prev[b.id],
                        [lang]: {
                          ...(prev[b.id]?.[lang] || {}),
                          description: e.target.value,
                        },
                      },
                    }))
                  }
                />

                {/* Linki */}
                <input
                  className="w-full mb-2 px-2 py-1 bg-white/10"
                  placeholder="Link URL"
                  value={b.link_url || ""}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((x) =>
                        x.id === b.id ? { ...x, link_url: e.target.value } : x
                      )
                    )
                  }
                />
                <input
                  className="w-full mb-2 px-2 py-1 bg-white/10"
                  placeholder="Link tekst"
                  value={b.link_text || ""}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((x) =>
                        x.id === b.id ? { ...x, link_text: e.target.value } : x
                      )
                    )
                  }
                />

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!b.visible}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((x) =>
                          x.id === b.id
                            ? { ...x, visible: e.target.checked }
                            : x
                        )
                      )
                    }
                  />
                  Widoczny
                </label>

                {/* TŁO */}
                <div className="mt-2 flex items-center gap-3">
                  <input
                    className="w-full px-2 py-1 bg-white/10"
                    readOnly
                    value={b.background_image || ""}
                    placeholder="Brak tła"
                  />
                  <button
                    onClick={() =>
                      uploadBackground(b.id, b.slug || `block-${b.id}`)
                    }
                    className="px-3 py-1 rounded bg-white text-black"
                  >
                    Wgraj tło
                  </button>
                </div>
                {b.background_image && (
                  <img
                    src={b.background_image}
                    alt="bg"
                    className="mt-2 h-32 rounded"
                  />
                )}

                {/* PDF */}
                <div className="mt-3 flex items-center gap-3">
                  <input
                    className="w-full px-2 py-1 bg-white/10"
                    readOnly
                    value={b.pdf_url || ""}
                    placeholder="Brak PDF"
                  />
                  <button
                    onClick={() => uploadPdf(b.id, b.slug || `block-${b.id}`)}
                    className="px-3 py-1 rounded bg-white text-black"
                  >
                    Wgraj PDF
                  </button>
                  {b.pdf_url && (
                    <button
                      onClick={() => removePdf(b)}
                      className="px-3 py-1 rounded bg-red-600"
                    >
                      Usuń PDF
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        <button onClick={addBlock} className="px-4 py-2 bg-green-600 rounded mt-2">
          ➕ Dodaj box
        </button>

        <h2 className="text-xl font-bold mt-10">Galeria</h2>
        <button
          onClick={uploadGallery}
          className="mb-4 px-4 py-2 rounded bg-white text-black"
        >
          Dodaj zdjęcia
        </button>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gallery.map((g) => (
            <div key={g.id} className="bg-white/5 p-2 rounded">
              <img
                src={g.image_url}
                alt="galeria"
                className="h-32 w-full object-cover rounded mb-2"
              />
              <input
                className="w-full mb-1 px-1 py-0.5 bg-white/10 text-sm"
                placeholder="PL"
                value={g.caption_pl || ""}
                onChange={(e) =>
                  setGallery((prev) =>
                    prev.map((x) =>
                      x.id === g.id
                        ? { ...x, caption_pl: e.target.value }
                        : x
                    )
                  )
                }
              />
              <input
                className="w-full mb-1 px-1 py-0.5 bg-white/10 text-sm"
                placeholder="EN"
                value={g.caption_en || ""}
                onChange={(e) =>
                  setGallery((prev) =>
                    prev.map((x) =>
                      x.id === g.id
                        ? { ...x, caption_en: e.target.value }
                        : x
                    )
                  )
                }
              />
              <input
                className="w-full mb-1 px-1 py-0.5 bg-white/10 text-sm"
                placeholder="DE"
                value={g.caption_de || ""}
                onChange={(e) =>
                  setGallery((prev) =>
                    prev.map((x) =>
                      x.id === g.id
                        ? { ...x, caption_de: e.target.value }
                        : x
                    )
                  )
                }
              />
              <input
                className="w-full mb-1 px-1 py-0.5 bg-white/10 text-sm"
                placeholder="ES"
                value={g.caption_es || ""}
                onChange={(e) =>
                  setGallery((prev) =>
                    prev.map((x) =>
                      x.id === g.id
                        ? { ...x, caption_es: e.target.value }
                        : x
                    )
                  )
                }
              />

              <button
                onClick={() => removeGalleryItem(g)}
                className="px-2 py-1 bg-red-600 rounded mt-2 text-sm"
              >
                🗑 Usuń
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={saveAll}
          className="px-5 py-2 rounded-lg bg-white text-black font-bold mt-8"
        >
          Zapisz zmiany
        </button>
      </main>
    </div>
  );
}
