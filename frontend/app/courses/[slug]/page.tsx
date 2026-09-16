"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { BookOpen, PlayCircle, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      try {
        const data = await fetchApi<any>(`/courses/${slug}`);
        setCourse(data);
      } catch (err) {
        console.error("Error loading course:", err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadCourse();
  }, [slug]);

  const handleEnrollOrResume = async () => {
    if (!course) return;

    // Find first activity
    const firstActivity = course.sections?.[0]?.activities?.[0];
    if (!firstActivity) return;

    if (!course.user_enrolled) {
      setEnrolling(true);
      try {
        await fetchApi(`/courses/${course.id}/enroll`, { method: "POST" });
      } catch (err) {
        console.warn("Enrollment notice:", err);
      } finally {
        setEnrolling(false);
      }
    }

    router.push(`/courses/${course.slug}/learn/${firstActivity.id}`);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading course details...</div>;
  }

  if (!course) {
    return <div className="p-12 text-center text-rose-600 text-sm">Course not found.</div>;
  }

  const totalActivities = course.sections?.reduce(
    (acc: number, s: any) => acc + (s.activities?.length || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-white p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center">
        <div className="w-full md:w-1/3 aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
          <img
            src={course.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="w-full md:w-2/3 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Certified Course
            </span>
            {course.user_enrolled && (
              <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                Enrolled ({course.progress_percentage}% Done)
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
            {course.title}
          </h1>

          <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
            {course.description}
          </p>

          <div className="pt-2 flex items-center gap-4">
            <button
              onClick={handleEnrollOrResume}
              disabled={enrolling}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition"
            >
              {enrolling
                ? "Enrolling..."
                : course.user_enrolled
                ? "Continue Learning"
                : "Start Course"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Syllabus / Module List */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Course Lessons & Modules</h2>
          <p className="text-xs text-slate-500">
            {course.sections?.length || 0} Modules • {totalActivities} Lessons
          </p>
        </div>

        <div className="space-y-4">
          {course.sections?.map((section: any, idx: number) => (
            <div
              key={section.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                {section.title}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {section.activities?.map((act: any) => (
                  <Link
                    key={act.id}
                    href={`/courses/${course.slug}/learn/${act.id}`}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/40 text-xs flex items-center justify-between text-slate-700 hover:text-emerald-900 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white text-emerald-700 border border-slate-200 group-hover:bg-emerald-600 group-hover:text-white transition shadow-2xs">
                        <PlayCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{act.title}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 font-medium">
                          {act.activity_type}
                        </div>
                      </div>
                    </div>

                    {act.is_completed && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
