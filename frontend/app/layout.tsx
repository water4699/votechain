import type { Metadata } from "next";
import "./globals.css";

import { TopNav } from "@/components/TopNav";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Votechain Ballot",
  description: "Encrypted MVP voting with RainbowKit + FHEVM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[--background] text-[--foreground] antialiased">
        <Providers>
          <div className="relative isolate min-h-screen">
            <div className="mx-auto max-w-6xl px-6 pb-16">
              <TopNav />
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
