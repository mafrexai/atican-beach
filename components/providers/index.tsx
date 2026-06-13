'use client'

import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { PageLoadTracker } from './PageLoadTracker'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <PageLoadTracker />
      {children}
      <Toaster position="top-right" />
    </>
  )
}