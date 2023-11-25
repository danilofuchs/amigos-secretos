import { twMerge } from "tailwind-merge";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={twMerge(
        "bg-transparent transition-all rounded-lg border border-white px-3 py-1 text-white flex-grow",
        className
      )}
      {...props}
    />
  );
}
