"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/boards" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-lg text-slate-900">
              AI Track
            </span>
          </Link>

          {session?.user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-slate-500 hover:text-slate-700 transition"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
