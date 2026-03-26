import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Radius Sinapse",
  description: "Gestão de Ordens de Serviço — Radius Mining",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInForceRedirectUrl='/dashboard'>
      <html lang="pt-BR">
        <body className={`${inter.className} bg-white antialiased`}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors/>
        </body>
      </html>
    </ClerkProvider>
  );
}
