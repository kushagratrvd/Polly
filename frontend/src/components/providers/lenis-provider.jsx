import Lenis from "lenis";
import { useEffect } from "react";


const HEADER_OFFSET = 112;

export function LenisProvider({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      touchMultiplier: 1.5,
      wheelMultiplier: 0.95,
    });

    let rafId = 0;

    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    const handleAnchorClick = (event) => {
      const anchor = event.currentTarget;
      const hash = anchor.getAttribute("href");

      if (!hash || hash === "#") {
        return;
      }

      const targetElement = document.querySelector(hash);
      if (!targetElement) {
        return;
      }

      event.preventDefault();

      lenis.scrollTo(targetElement, {
        duration: 1.15,
        offset: -HEADER_OFFSET,
        easing: (value) => Math.min(1, 1.001 - 2 ** (-10 * value)),
      });

      window.history.replaceState(null, "", hash);
    };

    const anchorLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    anchorLinks.forEach((link) => {
      link.addEventListener("click", handleAnchorClick);
    });

    if (window.location.hash) {
      const initialTarget = document.querySelector(window.location.hash);
      if (initialTarget) {
        requestAnimationFrame(() => {
          lenis.scrollTo(initialTarget, {
            immediate: true,
            offset: -HEADER_OFFSET,
          });
        });
      }
    }

    return () => {
      anchorLinks.forEach((link) => {
        link.removeEventListener("click", handleAnchorClick);
      });
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
