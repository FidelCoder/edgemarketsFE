import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./dashboard.css";
import "./panels.css";
import "./dashboard-home.css";
import "./operations.css";

export const metadata: Metadata = {
  title: "EdgeMarkets",
  description: "Open strategy marketplace for AI conditional prediction trading"
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
