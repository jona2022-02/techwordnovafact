"use client"

import Sidebar from '@/components/Sidebar'
import { ThemeProvider } from '@/components/ThemeProvider'
import MembershipGuard from '@/components/MembershipGuard'
import { useEffect, useState } from 'react'
import { Menu, PanelLeftClose } from 'lucide-react'

const SIDEBAR_WIDTH = 256 // w-64

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('sidebarOpen')
    if (saved !== null) setSidebarOpen(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen))
  }, [sidebarOpen])

  return (
    <ThemeProvider>
      <div className="relative flex h-screen overflow-hidden">
        {/* Sidebar desktop */}
        <aside
          className={[
            'hidden md:block fixed z-30 top-0 left-0 h-screen bg-background border-r',
            'transition-transform duration-300 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-64', // usa clase fija
          ].join(' ')}
          style={{ width: SIDEBAR_WIDTH }}
          aria-hidden={!sidebarOpen}
        >
          <Sidebar />
        </aside>

        {/* Sidebar móvil */}
        <aside
          className={[
            'md:hidden fixed z-40 top-0 left-0 h-screen w-64 bg-background border-r shadow-lg',
            'transition-transform duration-300 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
          aria-hidden={!sidebarOpen}
        >
          <Sidebar />
        </aside>

        {/* Overlay móvil */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Main */}
        <main
          className={[
            'relative flex-1 h-screen overflow-y-auto',
            'transition-[margin] duration-300 ease-in-out',
            sidebarOpen ? 'md:ml-64' : 'md:ml-0',
          ].join(' ')}
        >
          <div className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(v => !v)}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
                aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
              >
                {sidebarOpen ? (
                  <>
                    <PanelLeftClose className="w-4 h-4 mr-2" />
                    Ocultar menú
                  </>
                ) : (
                  <>
                    <Menu className="w-4 h-4 mr-2" />
                    Mostrar menú
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4">
            <MembershipGuard>
              {children}
            </MembershipGuard>
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
