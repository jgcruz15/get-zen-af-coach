export const metadata = {
  title: "Get Zen AF Coach",
  description: "Ambitious • Mom • Reset — your AI mindset & wellness coach",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
        {children}
      </body>
    </html>
  );
}
