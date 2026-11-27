"use client";

import { useEffect, useState } from "react";

/**
 * Tracks prefers-reduced-motion and document visibility so animated diagrams
 * pause cleanly when the user prefers static UI or switches browser tabs.
 */
export function useDiagramMotion() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setVisible(!document.hidden);

    updateMotion();
    updateVisibility();

    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return {
    reducedMotion,
    visible,
    canAutoPlay: !reducedMotion && visible,
  };
}
