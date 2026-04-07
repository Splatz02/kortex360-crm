export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        {children}
      </body>
    </html>
  )
}