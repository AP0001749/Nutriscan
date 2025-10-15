import Link from 'next/link'
import { ScanLine, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-background/80 backdrop-blur-lg border-t border-white/10">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
               <div className="rounded-lg bg-primary/10 p-2 border border-primary/20">
                    <ScanLine className="h-7 w-7 text-primary" />
                </div>
              <div>
                <span className="text-2xl font-bold text-gradient-primary">
                  NutriScan
                </span>
                <p className="text-xs text-muted-foreground -mt-1">Sovereign Food Intelligence</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
              An AI-powered food analysis tool to help you make smarter, healthier choices—fast.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-muted p-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors shadow-sm">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="bg-muted p-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors shadow-sm">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="bg-muted p-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors shadow-sm">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link></li>
              <li><Link href="/scan" className="text-muted-foreground hover:text-foreground transition-colors">Scan Food</Link></li>
              <li><Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">API Docs</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} NutriScan. All rights reserved. For a Sovereign Individual.</p>
        </div>
      </div>
    </footer>
  )
}