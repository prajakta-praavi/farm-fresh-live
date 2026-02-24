interface PageBreadcrumbProps {
  image: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  align?: "left" | "center";
  titleClassName?: string;
  subtitleClassName?: string;
  overlayClassName?: string;
}

const PageBreadcrumb = ({
  image,
  alt = "Page banner",
  title,
  subtitle,
  align = "left",
  titleClassName = "",
  subtitleClassName = "",
  overlayClassName = "",
}: PageBreadcrumbProps) => {
  return (
    <section className="relative h-44 sm:h-52 md:h-60 overflow-hidden mb-8">
      <img src={image} alt={alt} className="w-full h-full object-cover" />
      {(title || subtitle) && (
        <div className={`absolute inset-0 flex items-center ${overlayClassName}`}>
          <div
            className={`container ${
              align === "center" ? "text-center" : "text-left"
            }`}
          >
            {title && (
              <h1
                className={`font-extrabold tracking-wide text-2xl sm:text-4xl md:text-5xl ${titleClassName}`}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className={`font-bold text-base sm:text-2xl md:text-3xl mt-1 ${subtitleClassName}`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PageBreadcrumb;
