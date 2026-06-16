"use client";

import { useEffect, useState } from "react";

type HeroCarouselProps = {
  images: string[];
};

/**
 * Crossfading background carousel. Auto-advance and crossfade are disabled
 * when the user has prefers-reduced-motion set.
 */
export function HeroCarousel({ images }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (images.length < 2 || reducedMotion) return;
    const timer = window.setInterval(() => {
      setCurrent((index) => (index + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [images.length, reducedMotion]);

  if (images.length === 0) return null;

  return (
    <>
      {images.map((url, index) => (
        <div
          key={url}
          aria-hidden="true"
          className={[
            "absolute inset-0 bg-cover bg-center",
            reducedMotion ? "" : "transition-opacity duration-1000",
            index === current ? "opacity-100" : "opacity-0",
          ].join(" ")}
          style={{ backgroundImage: `url(${url})` }}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={`Show banner ${index + 1}`}
              aria-pressed={index === current}
              onClick={() => setCurrent(index)}
              className={`h-2 rounded-full ${reducedMotion ? "" : "transition-all"} ${
                index === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
