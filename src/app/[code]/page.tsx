import { kv } from "@vercel/kv";

export default async function Page({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { code: string };
}) {
  let code = params.code;
  if (code === "v") {
    code = searchParams.code;
  }
  code = code.toUpperCase();

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
    <main className="min-h-screen h-full w-full">
      <h1>
        O seu amigo secreto é...
        {gifted}
      </h1>
    </main>
  );
}
