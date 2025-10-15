'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Camera, Info, BarChart3, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserButton, useAuth } from '@clerk/nextjs'
import { SignInButton } from '@clerk/nextjs'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Scan', href: '/scan', icon: Camera },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Blog', href: '/blog', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
]

export default function Navigation() {
  const pathname = usePathname()
  const { isSignedIn } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-20 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-3">
          <div className="rounded-lg bg-primary/10 p-2 border border-primary/20 flex items-center justify-center">
            <ScanLine className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-lg inline-block text-gradient">
            NutriScan
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background btn-interactive',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    // --- CRITICAL FIX: Replaced '-' with ':' ---
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="hidden sm:inline-block">{item.name}</span>
              </Link>
            )
          })}
           <div className="pl-4 flex items-center space-x-2">
             {!isSignedIn && (
               <SignInButton>
                 <button className="btn-interactive px-3 py-2 rounded-md text-sm bg-muted/50">Sign in</button>
               </SignInButton>
             )}
             <UserButton afterSignOutUrl="/" />
           </div>
        </div>
      </div>
    </nav>
  )
}