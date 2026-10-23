import './globals.css'

export const metadata = {
  title: 'Doorstep — Ring package watch',
  description: 'A clear signal for package arrivals at your door.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">
        {children}
      </body>
    </html>
  )
}
