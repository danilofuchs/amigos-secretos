"use client";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useState } from "react";
import { createRaffle } from "./actions";

import { useFormState } from "react-dom";

export default function CreatePage() {
  const [names, setNames] = useState<string[]>([]);
  const [name, setName] = useState<string>("");

  const [state, dispatch] = useFormState(createRaffle, { type: undefined });

  return (
    <main className="p-4 flex flex-col gap-10 max-w-xl mx-auto pt-56">
      <h1 className="text-4xl font-bold text-center">Elefante Branco</h1>
      <h2 className="text-xl font-medium text-center">
        Quem está participando?
      </h2>
      <ul className="list-disc list-inside">
        {names.map((name, i) => (
          <li key={"name_" + i}>{name}</li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setNames((names) => [...names, name]);
          setName("");
        }}
      >
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={4}
        />
        <Button type="submit">Adicionar</Button>
      </form>

      <form action={dispatch}>
        {names.map((name, i) => (
          <input key={"name_" + i} type="hidden" name="names" value={name} />
        ))}
        <Button className="w-full" type="submit">
          Gerar
        </Button>
      </form>

      {state.type === "error" && (
        <div className="text-red-500">{state.error}</div>
      )}

      {state.type === "success" && (
        <div>
          <h3 className="font-medium text-xl">Códigos gerados</h3>
          <ul className="list-disc list-inside">
            {Object.entries(state.nameToCode).map(([name, code]) => (
              <li key={name}>
                {name} -{" "}
                <a
                  className="underline font-bold"
                  href={new URL(`/${code}`, window.location.origin).toString()}
                >
                  {code}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
