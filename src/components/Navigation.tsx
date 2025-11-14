'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Camera, Info, BarChart3, ScanLine, LogOut, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Scan', href: '/scan', icon: Camera },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'History', href: '/history', icon: History },
  { name: 'Blog', href: '/blog', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
]

export default function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession();
  const isSignedIn = !!session;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-emerald-500/10 glass backdrop-blur-xl">
      <div className="container flex h-20 items-center">
        {/* Logo - Premium Design */}
        <Link href="/" className="mr-8 flex items-center space-x-3 group">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-2.5 border border-emerald-500/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/30">
            <ScanLine className="h-6 w-6 text-emerald-400" />
          </div>
          <span className="font-black text-xl text-gradient-premium">
            NutriScan
          </span>
        </Link>

        {/* Navigation Links - Glassmorphism */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background',
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                    : 'text-muted-foreground hover:text-foreground glass-card hover:scale-105 border border-transparent hover:border-emerald-500/30',
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="hidden sm:inline-block">{item.name}</span>
              </Link>
            )
          })}

          {/* Auth Section - Premium Style */}
          <div className="pl-4 ml-4 border-l border-emerald-500/20 flex items-center space-x-3">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {!isSignedIn ? (
              <Button
                onClick={() => signIn()}
                variant="outline"
                size="sm"
                className="glass-card border-emerald-500/30 hover:border-emerald-500/50 font-semibold hover:scale-105 transition-all duration-300"
              >
                Sign in
              </Button>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-muted-foreground font-medium hidden sm:inline-block glass-card px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  {session?.user?.name || session?.user?.email}
                </span>
                <Button
                  onClick={() => signOut()}
                  variant="ghost"
                  size="sm"
                  className="glass-card hover:bg-red-500/10 hover:border-red-500/30 border border-transparent font-semibold hover:scale-105 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline-block">Sign out</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}