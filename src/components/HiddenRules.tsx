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
        <li>Troca de presentes dia 16/11 (a confirmar no grupo)</li>
        <li>De R$50,00 a R$60,00</li>
        <li>
          Coloque no grupo do Whats sugestões de presentes que gostaria de
          receber.
        </li>
      </ul>
    </div>
  );
}
