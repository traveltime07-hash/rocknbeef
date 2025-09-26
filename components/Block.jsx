// components/Block.jsx
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
    <section
      className="relative w-full overflow-hidden"
      style={{
        // stabilna wysokość (możesz podnieść do 70–80vh)
        minHeight: "65vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        // tło jako CSS — pewne na Androidach
        backgroundImage: background ? `url(${background})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* overlay ~24%: mniej „blade” niż 40% */}
      {background && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: "rgba(0,0,0,0.24)" }}
        />
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 text-center">
        {title && (
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            {title}
          </h2>
        )}

        {description && (
          <p className="text-lg md:text-xl text-white/90 mb-4">
            {description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          {hasPdf && (
            <a
              className="btn"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={pdfButtonText}
            >
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
