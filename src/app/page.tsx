export default function Home() {
  return (
    <main className="flex gap-20 flex-col items-center justify-between p-4 pt-48 max-w-md mx-auto">
      <h1 className="font-bold text-4xl text-center">Elefante Branco</h1>
      <h2 className="font-medium text-xl text-center">
        Qual o código do seu amigo secreto?
      </h2>
      <form action="/v" method="GET" className="h-full w-full">
        <div className="flex flex-col gap-4 w-full justify-center">
          <div className="flex gap-2 flex-row w-full justify-center items-center">
            <label className="font-medium" htmlFor="code">
              Código
            </label>

            <input
              name="code"
              id="code"
              className="bg-black rounded-lg border border-white px-3 py-1 uppercase text-white flex-grow"
              minLength={4}
              maxLength={4}
              size={4}
            />
          </div>

          <button
            type="submit"
            className="bg-purple-700 font-medium rounded-lg px-5 py-2 border border-transparent hover:border-white transition-all box-border"
          >
            Descobrir
          </button>
        </div>
      </form>
    </main>
  );
}
