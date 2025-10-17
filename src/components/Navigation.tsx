'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Camera, Info, BarChart3, ScanLine, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Scan', href: '/scan', icon: Camera },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Blog', href: '/blog', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
]

export default function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession();
  const isSignedIn = !!session;

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
             {!isSignedIn ? (
               <Button
                 onClick={() => signIn()}
                 variant="outline"
                 size="sm"
                 className="btn-interactive"
               >
                 Sign in
               </Button>
             ) : (
               <div className="flex items-center space-x-2">
                 <span className="text-sm text-muted-foreground hidden sm:inline-block">
                   {session?.user?.name || session?.user?.email}
                 </span>
                 <Button
                   onClick={() => signOut()}
                   variant="ghost"
                   size="sm"
                   className="btn-interactive"
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