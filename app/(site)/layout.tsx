import { ThemeProvider } from "@/components/theme-provider";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        storageKey="site-theme"
        enableSystem={false}
        disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
