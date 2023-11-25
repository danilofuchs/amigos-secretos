import { HiddenName } from "@/components/HiddenName";
import { HiddenRules } from "@/components/HiddenRules";
import { kv } from "@vercel/kv";

export default async function Page({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();

  const name = await kv.get<string>(code);

  if (!name) {
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
    <main className="min-h-screen flex items-center justify-center flex-col gap-4 max-w-xl mx-auto px-8">
      <h1 className="text-xl font-bold">O seu amigo secreto é...</h1>
      <HiddenName name={name} />

      <HiddenRules />
    </main>
  );
}
