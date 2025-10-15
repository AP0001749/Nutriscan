'use client';

import { useSignIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, ScanLine } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useSignIn();

  // This function correctly uses the Clerk hook to initiate the OAuth flow.
  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/scan', // Redirect to the scan page after successful sign-in
        redirectUrlComplete: '/dashboard', // The final destination after the OAuth flow
      });
    } catch (error) {
      console.error('Error during Google Sign-In:', error);
    }
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
          <CardDescription>Sign in to access the Sovereign Analysis Engine</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGoogleSignIn}
            className="w-full"
            size="lg"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}