"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { BookOpen, CheckCircle, Clock, Award, ArrowRight, Layers } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [me, courseList] = await Promise.all([
          fetchApi<any>("/auth/me").catch(() => null),
          fetchApi<any[]>("/courses").catch(() => []),
        ]);
        setUser(me);
        setCourses(courseList);
      } catch (err) {
        console.error("Dashboard loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading your dashboard...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-5 shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">Sign In Required</h2>
          <p className="text-xs text-slate-600">
            Please log in to view your enrolled courses, certifications, and learning telemetry.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm"
        >
          Go to Sign In <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Welcome & Stats Banner */}
      <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-3xl p-8 border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Employee Workspace
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Welcome back, {user?.full_name || "Learner"}!
          </h1>
          <p className="text-xs text-slate-600">
            Track your training courses, watch progress, and quiz achievements.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 text-center shadow-xs">
            <div className="text-xl font-bold text-emerald-600">{courses.length}</div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">Enrolled</div>
          </div>
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 text-center shadow-xs">
            <div className="text-xl font-bold text-teal-600">100%</div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">Verified</div>
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" /> Assigned Courses & Training
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between space-y-6 hover:border-emerald-500/50 hover:shadow-md hover:shadow-emerald-500/5 transition"
            >
              <div className="flex gap-4 items-start">
                <img
                  src={c.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"}
                  alt={c.title}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-100 shadow-xs"
                />
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-base text-slate-900 truncate">{c.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Progress & Verifications</span>
                  <span className="font-semibold text-slate-800">{c.total_activities} Units</span>
                </div>

                <Link
                  href={`/courses/${c.slug}`}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
                >
                  Resume Course <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
