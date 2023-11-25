"use client";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useState } from "react";

export default function CreatePage() {
  const [names, setNames] = useState<string[]>([]);
  const [name, setName] = useState<string>("");

  return (
    <main className="p-4 flex flex-col gap-10">
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
          minLength={4}
        />
        <Button type="submit">Adicionar</Button>
      </form>
    </main>
  );
}
