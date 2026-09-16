"use client";

import React, { useEffect, useState } from "react";
import CourseCard from "@/components/CourseCard";
import { fetchApi } from "@/lib/api";
import { Sparkles, ShieldCheck, Zap, Layers } from "lucide-react";

export default function HomePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await fetchApi<any[]>("/courses");
        setCourses(data);
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white p-8 md:p-12 border border-emerald-100/80 shadow-sm">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Next-Generation Learning Management
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Learn with <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Verified</span> Course Training.
          </h1>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Corporate training with verified video watch compliance, minimum reading requirements, and automatic quiz certifications.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-emerald-100/80">
          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-100/60 shadow-xs">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Anti-Skip Video Protection</h4>
              <p className="text-[11px] text-slate-500">Ensures videos are fully watched</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-100/60 shadow-xs">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Automatic Quiz Grading</h4>
              <p className="text-[11px] text-slate-500">Instant score and answer feedback</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-100/60 shadow-xs">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Microsoft Teams & Single Sign-On</h4>
              <p className="text-[11px] text-slate-500">Sign in with your company account</p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Available Courses & Training</h2>
            <p className="text-xs text-slate-500">Explore assigned training modules and certifications</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
            No courses published yet.
          </div>
        )}
      </section>
    </div>
  );
}
