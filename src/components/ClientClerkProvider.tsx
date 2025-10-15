"use client";

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

type Props = {
  frontendApi?: string | null;
  publishableKey?: string | null;
  children: React.ReactNode;
};

export default function ClientClerkProvider({ frontendApi, publishableKey, children }: Props) {
  const props: Record<string, string> = {};
  if (frontendApi) props.frontendApi = frontendApi;
  if (publishableKey) props.publishableKey = publishableKey;
  // Client-side debug: log which Clerk init props were received (redact keys partially)
  React.useEffect(() => {
    const redacted = {
      frontendApi: props.frontendApi ? 'REDACTED' : undefined,
      publishableKey: props.publishableKey ? `${String(props.publishableKey).slice(0, 8)}…` : undefined,
    };
    console.debug('Client ClerkProvider init props:', redacted);
  }, [props.frontendApi, props.publishableKey]);

  return <ClerkProvider {...props}>{children}</ClerkProvider>;
}
