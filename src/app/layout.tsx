import "@/styles/globals.css";

import { type Metadata } from "next";
import { Manrope } from "next/font/google";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCReactProvider } from "@/trpc/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/topnav";
import SignInPage from "./sign-in/page";

export const metadata: Metadata = {
  title: "0bs-chat",
  description: "the everyting ai app",
  icons: [{ rel: "icon", url: "/logo.svg" }],
};

const manrope = Manrope({
  // Changed to Manrope
  subsets: ["latin"],
  variable: "--font-manrope", // Updated variable name
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} bg-black`}
      suppressHydrationWarning
    >
      <body>
        <ClerkProvider>
          <SignedIn>
            <SidebarProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <TopNav />
                <TRPCReactProvider>
                  <AppSidebar />
                  {children}
                </TRPCReactProvider>
              </ThemeProvider>
            </SidebarProvider>
          </SignedIn>
          <SignedOut>
            <SignInPage />
          </SignedOut>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
