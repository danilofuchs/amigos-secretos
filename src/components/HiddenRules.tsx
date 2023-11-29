"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export function HiddenRules() {
  const [hidden, setHidden] = useState<boolean>(true);

  useEffect(() => {
    setHidden(false);
  }, []);

  return (
    <div
      className={twMerge(
        "w-full mt-72 text-start transition-all delay-[2200ms] duration-1000",
        hidden && "opacity-0"
      )}
    >
      <h3 className="font-medium text-lg">Regras</h3>
      <ul className="list-disc list-inside">
        <li>Troca de presentes dia 25/12</li>
        <li>A partir de R$100,00</li>
        <li>
          Envie no grupo do Whats sugestões de presentes que gostaria de
          receber. Alguns não se conhecem ainda!
        </li>
        <li>Proibido canecas!</li>
      </ul>
    </div>
  );
}
