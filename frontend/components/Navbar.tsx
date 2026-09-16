"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, User, LogOut, CheckCircle, Shield } from "lucide-react";
import { authStorage, fetchApi } from "@/lib/api";

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = authStorage.getToken();
      if (token) {
        try {
          const me = await fetchApi("/auth/me");
          setCurrentUser(me);
        } catch {
          authStorage.removeToken();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const handleLogout = () => {
    authStorage.removeToken();
    setCurrentUser(null);
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                Algo<span className="text-emerald-600">LMS</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Enterprise
                </span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-emerald-50/60 transition"
            >
              Courses
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-emerald-50/60 transition"
            >
              My Learning
            </Link>
            {currentUser?.role === "admin" && (
              <Link
                href="/admin"
                className="px-3 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 border border-emerald-200/80 transition flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Admin Portal
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                title="Switch Account"
                className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                Switch Account
              </Link>
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.full_name?.charAt(0) || "U"}
                </div>
                <span className="text-xs font-semibold text-slate-800">{currentUser.full_name}</span>
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                  currentUser.role === "admin"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-600 hover:bg-slate-100 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
