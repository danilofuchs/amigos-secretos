import { kv } from "@vercel/kv";
import { twMerge } from "tailwind-merge";
import snowflake from "./snowflake.module.scss";

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
    <main className="min-h-screen snow h-full w-full relative overflow-hidden">
      {Array.from({ length: 150 }).map((_, i) => (
        <div
          key={i}
          className={twMerge(
            snowflake.snowflake,
            i > 75 ? "hidden lg:inline" : ""
          )}
        />
      ))}
      <h1>
        O seu amigo secreto é...
        {gifted}
      </h1>
    </main>
  );
}
