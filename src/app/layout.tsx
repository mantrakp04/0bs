import "@/styles/globals.css";

import { type Metadata } from "next";
import { Manrope } from "next/font/google"; // Changed to Manrope
import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "@/components/theme-provider";
import { TRPCReactProvider } from "@/trpc/react";
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar";

export const metadata: Metadata = {
  title: "0bs-chat",
  description: "No bs",
  icons: [{ rel: "icon", url: "/logo.svg" }],
};

const manrope = Manrope({ // Changed to Manrope
  subsets: ["latin"],
  variable: "--font-manrope", // Updated variable name
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable}`} suppressHydrationWarning>
      <body>
        <SessionProvider>
          <SidebarProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TRPCReactProvider>
                <AppSidebar />
                {children}
              </TRPCReactProvider>
            </ThemeProvider>
          </SidebarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
