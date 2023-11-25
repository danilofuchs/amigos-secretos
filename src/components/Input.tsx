export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="bg-black rounded-lg border border-white px-3 py-1 uppercase text-white flex-grow"
      {...props}
    />
  );
}
