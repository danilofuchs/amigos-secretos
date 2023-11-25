export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="bg-purple-700 font-medium rounded-lg px-5 py-2 border border-transparent hover:border-white transition-all box-border"
      {...props}
    />
  );
}
