'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Camera, Info, BarChart3, ScanLine, LogOut, History, Target, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useState } from 'react'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Scan', href: '/scan', icon: Camera },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'History', href: '/history', icon: History },
  { name: 'Goals', href: '/settings', icon: Target },
  { name: 'Blog', href: '/blog', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
]

export default function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-emerald-500/10 glass backdrop-blur-xl">
      <div className="container flex h-16 md:h-20 items-center justify-between">
        {/* Logo - Premium Design */}
        <Link href="/" className="flex items-center space-x-2 md:space-x-3 group">
          <div className="rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-2 md:p-2.5 border border-emerald-500/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/30">
            <ScanLine className="h-5 w-5 md:h-6 md:w-6 text-emerald-400" />
          </div>
          <span className="font-black text-lg md:text-xl text-gradient-premium">
            NutriScan
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex flex-1 items-center justify-end space-x-2">
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
                <span>{item.name}</span>
              </Link>
            )
          })}

          {/* Auth Section - Desktop */}
          <div className="pl-4 ml-4 border-l border-emerald-500/20 flex items-center space-x-3">
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
                <span className="text-sm text-muted-foreground font-medium glass-card px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  {session?.user?.name || session?.user?.email}
                </span>
                <Button
                  onClick={() => signOut()}
                  variant="ghost"
                  size="sm"
                  className="glass-card hover:bg-red-500/10 hover:border-red-500/30 border border-transparent font-semibold hover:scale-105 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2">Sign out</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden items-center space-x-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-emerald-500/10 glass backdrop-blur-xl">
          <div className="container py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'text-muted-foreground hover:text-foreground glass-card border border-transparent hover:border-emerald-500/30',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* Mobile Auth Section */}
            <div className="pt-4 mt-4 border-t border-emerald-500/20 space-y-2">
              {!isSignedIn ? (
                <Button
                  onClick={() => {
                    signIn();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full glass-card border-emerald-500/30 hover:border-emerald-500/50 font-semibold"
                >
                  Sign in
                </Button>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground font-medium glass-card px-4 py-3 rounded-lg border border-emerald-500/20 text-center">
                    {session?.user?.name || session?.user?.email}
                  </div>
                  <Button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    className="w-full glass-card hover:bg-red-500/10 hover:border-red-500/30 border border-transparent font-semibold"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}