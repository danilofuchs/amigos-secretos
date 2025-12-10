"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  name: string;
}

export function HiddenName({ name }: Props) {
  const [blur, setBlur] = useState<boolean>(true);
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBlur(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!window.confetti || !ref.current) {
        return;
      }

      const rect = ref.current.getBoundingClientRect();
      const y = rect.y / window.innerHeight;

      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y },
      });
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/tsparticles-confetti@2.12.0/tsparticles.confetti.bundle.min.js" />
      <h2
        ref={ref}
        className={twMerge(
          "text-5xl font-bold transition-all ease-in duration-[2000ms]",
          blur && "blur-3xl"
        )}
      >
        {name}
      </h2>
    </>
  );
}
