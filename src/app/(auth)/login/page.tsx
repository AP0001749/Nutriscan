"use client";

import { signIn, getProviders, ClientSafeProvider } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, ScanLine, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getProviders();
        if (mounted) setProviders(p as Record<string, ClientSafeProvider> | null);
      } catch {
        // ignore - providers may not be configured in dev
        if (mounted) setProviders(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/scan' });
  };

  // GitHub provider removed

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('credentials', {
      email,
      password,
      callbackUrl: '/scan',
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_200%_100%_at_50%_-20%,rgba(16,185,129,0.3),rgba(255,255,255,0))] animate-aurora"></div>
      <Card className="w-full max-w-md z-10 bg-card/80 backdrop-blur-lg">
        <CardHeader className="text-center items-center">
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
            <ScanLine className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-gradient">Welcome</CardTitle>
          <CardDescription>Sign in to access NutriScan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers?.google ? (
            <Button 
              onClick={handleGoogleSignIn}
              className="w-full"
              size="lg"
            >
              <Chrome className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          ) : null}

          {/* GitHub provider removed */}

          {!providers || (Object.keys(providers).length === 0) ? (
            <p className="text-xs text-center text-muted-foreground">
              OAuth providers not configured. Use email sign-in (dev mode) or set
              up providers in your `.env.local`.
            </p>
          ) : null}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleCredentialsSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              required
            />
            <Button type="submit" className="w-full" variant="secondary">
              <Mail className="mr-2 h-4 w-4" />
              Sign in with Email
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Dev mode: Any email/password combination works
          </p>
        </CardContent>
      </Card>
    </div>
  );
}