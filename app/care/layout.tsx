import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Doorstep — Package Watch',
  description: 'A clear view of Ring package alerts and front-door activity.',
}

export default function CareLayout({ children }: { children: React.ReactNode }) {
  return children
}
