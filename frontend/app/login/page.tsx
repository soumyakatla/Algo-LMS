"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, UserCheck, Sparkles } from "lucide-react";
import { fetchApi, authStorage } from "@/lib/api";
import { getMsalInstance, loginRequest } from "@/lib/msal";

const DEMO_ACCOUNTS = [
  { name: "System Administrator", email: "admin@algolms.com", password: "Admin@123", role: "admin", desc: "Full LMS management & telemetry control" },
  { name: "Soumya Katla", email: "student@algolms.com", password: "Student@123", role: "student", desc: "100% completed AI Microservices" },
  { name: "Alex Chen", email: "alex.chen@algolms.com", password: "Alex@123", role: "student", desc: "Enrolled in AI & Zero Trust" },
  { name: "Priya Sharma", email: "priya.sharma@algolms.com", password: "Priya@123", role: "student", desc: "Completed all 3 certifications" },
  { name: "David Miller", email: "david.miller@algolms.com", password: "David@123", role: "student", desc: "Enrolled in DevOps & K8s" },
  { name: "Sarah Jenkins", email: "sarah.jenkins@algolms.com", password: "Sarah@123", role: "student", desc: "Enrolled in Security & Microservices" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msalLoading, setMsalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      authStorage.setToken(res.access_token);
      const me = await fetchApi<any>("/auth/me");

      if (me.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      setTimeout(() => window.location.reload(), 100);
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setMsalLoading(true);
    setError(null);
    try {
      const msal = await getMsalInstance();
      const loginResponse = await msal.loginPopup(loginRequest);
      
      const account = loginResponse.account;
      if (!account) throw new Error("No Microsoft account returned");

      const res = await fetchApi<{ access_token: string }>("/auth/azure-sso", {
        method: "POST",
        body: JSON.stringify({
          email: account.username || (account.idTokenClaims as any)?.email,
          full_name: account.name || account.username || "Microsoft User",
          azure_oid: account.localAccountId || account.homeAccountId,
        }),
      });

      authStorage.setToken(res.access_token);
      const me = await fetchApi<any>("/auth/me");

      if (me.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      setTimeout(() => window.location.reload(), 100);
    } catch (err: any) {
      console.error("Microsoft login error:", err);
      setError(err.message || "Microsoft authentication was cancelled or failed.");
    } finally {
      setMsalLoading(false);
    }
  };

  const loginWithDemo = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: acc.email, password: acc.password }),
      });

      authStorage.setToken(res.access_token);
      if (acc.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      setTimeout(() => window.location.reload(), 100);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Custom Login Form */}
        <div className="md:col-span-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> Secure Sign-In
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Log in to AlgoLMS</h1>
            <p className="text-xs text-slate-600">
              Access your personalized learning progress and certificates.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Microsoft Entra ID SSO Button */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msalLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold text-xs transition flex items-center justify-center gap-3 shadow-2xs hover:border-slate-400 disabled:opacity-50"
          >
            {/* Microsoft 4-Color Logo */}
            <svg className="w-4 h-4" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            <span>{msalLoading ? "Connecting to Microsoft..." : "Sign in with Microsoft / Teams"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase">or with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Workspace"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account?{" "}
            <Link href="/register" className="text-emerald-700 hover:text-emerald-800 font-semibold">
              Register here
            </Link>
          </div>
        </div>

        {/* Right: Quick Demo Accounts Selector */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Instant Demo Account Switcher</h2>
            </div>
            <p className="text-xs text-slate-600">
              Click any user below to immediately sign in and inspect their individual learning telemetry and gatekept progress.
            </p>

            <div className="space-y-2.5">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => loginWithDemo(acc)}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 flex items-center justify-between text-left transition group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 transition">
                        {acc.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        acc.role === "admin"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{acc.desc}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{acc.email}</span>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
