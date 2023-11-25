"use client";
import Script from "next/script";
import { useEffect } from "react";

export const Confetti = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (!window.confetti) {
        return;
      }

      clearInterval(interval);
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <Script src="https://cdn.jsdelivr.net/npm/tsparticles-confetti@2.12.0/tsparticles.confetti.bundle.min.js" />
  );
};
