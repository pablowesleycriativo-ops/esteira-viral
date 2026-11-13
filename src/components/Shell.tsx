import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, Clapperboard, House, LayoutGrid, Plus, Settings, Users } from 'lucide-react'
import { useApp } from '@/state/store'
import { Button } from '@/components/ui/button'

const TABS = [
  { href: '/', label: 'Início', icon: House },
  { href: '/formatos', label: 'Formatos', icon: LayoutGrid },
  { href: '/personagens', label: 'Personagens', icon: Users },
  { href: '/videos', label: 'Vídeos', icon: Clapperboard },
  { href: '/sistema', label: 'Sistema', icon: BookOpen },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Shell() {
  const { pathname } = useLocation()
  const { error, clearError } = useApp()
  const hideFab = pathname === '/ideia' || pathname === '/ajustes' || pathname === '/videos/novo' || pathname.endsWith('/editar')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-20 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="inline-flex min-h-11 items-center font-heading text-lg font-semibold tracking-tight">
            Esteira Viral
          </Link>
          <Button variant={pathname === '/ajustes' ? 'default' : 'ghost'} size="icon" asChild>
            <Link to="/ajustes" aria-label="Ajustes" aria-current={pathname === '/ajustes' ? 'page' : undefined}>
              <Settings />
            </Link>
          </Button>
        </div>
      </header>
      {error ? (
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-3 px-4 pt-3">
          <p className="text-sm" role="status">
            {error}
          </p>
          <button type="button" className="min-h-11 shrink-0 text-sm font-medium underline" onClick={clearError}>
            Fechar
          </button>
        </div>
      ) : null}
      <main id="conteudo" className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      {hideFab ? null : (
        <Link
          to="/ideia"
          className="fixed right-4 z-30 inline-flex min-h-14 items-center gap-2 rounded-full bg-foreground px-4 text-base font-semibold text-background shadow-lg bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
        >
          <Plus className="size-5" aria-hidden />
          Ideia
        </Link>
      )}
      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-3xl grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                to={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] leading-tight ${active ? 'font-semibold' : 'font-medium text-muted-foreground'}`}
              >
                <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 1.75} />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
