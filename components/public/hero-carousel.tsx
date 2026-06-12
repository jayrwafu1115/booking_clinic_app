"use client";

import { useEffect, useState } from "react";

type HeroCarouselProps = {
  images: string[];
};

/**
 * Crossfading background carousel for the hero section. Rendered behind the
 * hero copy with a dark overlay applied by the parent for text contrast.
 */
export function HeroCarousel({ images }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => {
      setCurrent((index) => (index + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <>
      {images.map((url, index) => (
        <div
          key={url}
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            index === current ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${url})` }}
        />
      ))}
      {images.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={`Show banner ${index + 1}`}
              onClick={() => setCurrent(index)}
              className={`h-2 rounded-full transition-all ${
                index === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
