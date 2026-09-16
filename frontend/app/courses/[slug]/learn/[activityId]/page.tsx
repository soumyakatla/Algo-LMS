"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import CourseSidebar from "@/components/player/CourseSidebar";
import VideoPlayer from "@/components/player/VideoPlayer";
import DocumentViewer from "@/components/player/DocumentViewer";
import QuizViewer from "@/components/player/QuizViewer";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

export default function LearningPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const activityId = params?.activityId as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadCourseData = async () => {
    try {
      const data = await fetchApi<any>(`/courses/${slug}`);
      setCourse(data);
    } catch (err) {
      console.error("Error loading course for player:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) loadCourseData();
  }, [slug]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading learning player...</div>;
  }

  if (!course) {
    return <div className="p-12 text-center text-rose-600 text-sm">Course not found.</div>;
  }

  // Flatten all activities in order to handle next/previous navigation
  const allActivities: any[] = [];
  course.sections?.forEach((s: any) => {
    s.activities?.forEach((a: any) => allActivities.push(a));
  });

  const currentIndex = allActivities.findIndex((a) => a.id === activityId);
  const currentActivity = allActivities[currentIndex] || allActivities[0];
  const prevActivity = currentIndex > 0 ? allActivities[currentIndex - 1] : null;
  const nextActivity = currentIndex < allActivities.length - 1 ? allActivities[currentIndex + 1] : null;

  const handleActivityCompleted = () => {
    loadCourseData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/courses/${slug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Course Overview
        </Link>
        <div className="text-xs text-slate-500 font-medium">
          Activity {currentIndex + 1} of {allActivities.length}
        </div>
      </div>

      {/* Main Player Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Active Content Viewer */}
        <div className="flex-1 w-full space-y-6">
          {currentActivity?.activity_type === "video" && (
            <VideoPlayer
              key={currentActivity.id}
              activityId={currentActivity.id}
              videoUrl={
                currentActivity.content_url ||
                "/media/videos/demo_lecture_1.mp4"
              }
              title={currentActivity.title}
              initialCompleted={currentActivity.is_completed}
              onCompleted={handleActivityCompleted}
            />
          )}

          {currentActivity?.activity_type === "document" && (
            <DocumentViewer
              key={currentActivity.id}
              activityId={currentActivity.id}
              title={currentActivity.title}
              content={currentActivity.content_body || "Content not available."}
              requiredDwellSeconds={currentActivity.required_dwell_seconds || 30}
              initialCompleted={currentActivity.is_completed}
              onCompleted={handleActivityCompleted}
            />
          )}

          {currentActivity?.activity_type === "quiz" && (
            <QuizViewer
              key={currentActivity.id}
              activityId={currentActivity.id}
              title={currentActivity.title}
              initialCompleted={currentActivity.is_completed}
              onCompleted={handleActivityCompleted}
            />
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {prevActivity ? (
              <Link
                href={`/courses/${slug}/learn/${prevActivity.id}`}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Activity
              </Link>
            ) : (
              <div />
            )}

            {nextActivity && (
              <Link
                href={`/courses/${slug}/learn/${nextActivity.id}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm"
              >
                Next Activity <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <CourseSidebar
          courseSlug={slug}
          sections={course.sections || []}
          currentActivityId={currentActivity?.id}
          courseProgress={course.progress_percentage || 0}
        />
      </div>
    </div>
  );
}
