import { Confetti } from "@/components/Confetti";
import { kv } from "@vercel/kv";

export default async function Page({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { code: string };
}) {
  const code = params.code.toUpperCase();

  const gifted = await kv.get<string>(code);

  if (!gifted) {
    return (
      <main className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-3xl font-bold">Código inválido!</h1>
        <a href="/" className="underline">
          Voltar
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-xl font-bold">O seu amigo secreto é...</h1>
      <h2 className="text-5xl font-bold">{gifted}</h2>
      <Confetti />
    </main>
  );
}
