import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { twMerge } from "tailwind-merge";
import "./globals.css";
import snowflake from "./snowflake.module.scss";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elefante Branco",
  description: "O melhor amigo secreto do mundo",
  metadataBase:
    process.env.NODE_ENV === "development"
      ? new URL("http://localhost:3600")
      : new URL("https://elefantebranco.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={twMerge(inter.className, "min-h-screen relative")}>
        {children}
        <div className="min-h-screen w-full h-full overflow-hidden absolute top-0 pointer-events-none">
          {Array.from({ length: 150 }).map((_, i) => (
            <div
              key={i}
              className={twMerge(
                snowflake.snowflake,
                i > 75 ? "hidden lg:inline" : ""
              )}
            />
          ))}
        </div>
      </body>
    </html>
  );
}
