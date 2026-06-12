"use client";

import type { ReactNode } from "react";

type BookNowButtonProps = {
  widgetEnabled: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Primary conversion CTA. Opens the floating AI booking widget when the
 * clinic has it enabled; otherwise scrolls to the contact section.
 */
export function BookNowButton({ widgetEnabled, className, children }: BookNowButtonProps) {
  if (!widgetEnabled) {
    return (
      <a href="#contact" className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("clinicflow:open-widget"))}>
      {children}
    </button>
  );
}
