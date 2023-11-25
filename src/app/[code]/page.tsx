export default function Page({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { code: string };
}) {
  const code = params.code === "v" ? searchParams.code : params.code;
  return <h1>My Page {code}</h1>;
}
