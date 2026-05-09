import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "admin",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
