"use client";

import { useEffect } from "react";
import { getMsalInstance } from "@/lib/msal";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function processAuth() {
      try {
        const msal = await getMsalInstance();
        await msal.handleRedirectPromise();
      } catch (err) {
        console.error("Auth redirect callback processing:", err);
      }
    }
    processAuth();
  }, []);

  return (
    <div className="p-12 text-center text-xs text-slate-500">
      Completing authentication...
    </div>
  );
}
