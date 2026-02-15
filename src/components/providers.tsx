"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              background: "#fff",
              color: "#0f172a",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
