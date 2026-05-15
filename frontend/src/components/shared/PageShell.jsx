import { cn } from "../../lib/utils";

const bgImages = ["clouds-2.jpg", "clouds-image.avif"];

export function PageShell({
  children,
  overlayOpacity = 0.85,
  bgIndex = 0,
  className = "",
  fixedBg = false,
  bgCover = false,
}) {
  let safeIndex = bgIndex;
  if (bgIndex < 0 || bgIndex >= bgImages.length) {
    safeIndex = 0;
  }
  const BACKGROUND_IMAGE = bgImages[safeIndex];

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-x-hidden bg-[#1a262b] font-sans text-white",
        fixedBg ? "[background-attachment:fixed]" : "",
        bgCover
          ? "[background-position:center]"
          : "[background-position:cover]",
        "[background-size:cover]",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(26, 38, 43, ${overlayOpacity}) 0%, rgba(66, 52, 40, ${overlayOpacity}) 100%), url('/${BACKGROUND_IMAGE}')`,
      }}
    >
      {children}
    </main>
  );
}