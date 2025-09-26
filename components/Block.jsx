import Image from "next/image";

export default function Block({
  background,
  title,
  description,
  linkText,
  linkUrl,
  pdfUrl,
  pdfButtonText = "Zobacz PDF",
}) {
  const hasLink = linkText && linkUrl;
  const hasPdf = !!pdfUrl;

  return (
    <section className="section relative overflow-hidden">
      {/* TŁO */}
      {background && (
        <Image
          src={background}
          alt={title ? `Tło: ${title}` : "Tło sekcji"}
          fill
          priority={false}
          sizes="(min-width: 1024px) 100vw, 100vw"
          className="object-cover z-0"
        />
      )}

      {/* OVERLAY ~25% (JAŚNIEJSZY) + gwarantowany z-index */}
      {background && (
        <div
          className="absolute inset-0 bg-black/5 pointer-events-none z-[1]"
          aria-hidden="true"
        />
      )}

      {/* TREŚĆ zawsze nad overlayem */}
      <div className="section-inner relative z-[2]">
        {title && (
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            {title}
          </h2>
        )}

        {description && (
          <p className="text-lg md:text-xl text-white/90 mb-4">{description}</p>
        )}

        <div className="flex flex-wrap gap-3">
          {hasPdf && (
            <a className="btn" href={pdfUrl} target="_blank" rel="noreferrer">
              {pdfButtonText}
            </a>
          )}
          {hasLink && (
            <a
              className="btn btn-secondary"
              href={linkUrl}
              target={linkUrl.startsWith("http") ? "_blank" : "_self"}
              rel="noreferrer"
            >
              {linkText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
