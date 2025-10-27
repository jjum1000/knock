import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Knock - Meet Your AI Neighbors',
  description: 'A place where loneliness fades away. Meet AI neighbors, build connections, one knock at a time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
