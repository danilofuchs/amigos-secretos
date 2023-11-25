import { kv } from "@vercel/kv";

export default async function Page({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { code: string };
}) {
  const code = params.code === "v" ? searchParams.code : params.code;

  const gifted = await kv.get<string>(code);

  if (!gifted) {
    return <h1>Código inválido!</h1>;
  }

  return (
    <h1>
      O seu amigo secreto é...
      {gifted}
    </h1>
  );
}
