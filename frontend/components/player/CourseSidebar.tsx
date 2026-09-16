"use client";

import React from "react";
import Link from "next/link";
import { PlayCircle, FileText, HelpCircle, CheckCircle2 } from "lucide-react";

interface CourseSidebarProps {
  courseSlug: string;
  sections: any[];
  currentActivityId: string;
  courseProgress: number;
}

export default function CourseSidebar({
  courseSlug,
  sections,
  currentActivityId,
  courseProgress,
}: CourseSidebarProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "video":
        return <PlayCircle className="w-4 h-4" />;
      case "quiz":
        return <HelpCircle className="w-4 h-4" />;
      case "document":
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col space-y-6 h-fit">
      {/* Course Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Course Progress</span>
          <span className="font-bold text-emerald-700">{courseProgress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
            style={{ width: `${courseProgress}%` }}
          />
        </div>
      </div>

      {/* Curriculum Sections & Activities */}
      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.id} className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {section.title}
            </h3>

            <div className="space-y-1.5">
              {section.activities.map((act: any) => {
                const isActive = act.id === currentActivityId;
                return (
                  <Link
                    key={act.id}
                    href={`/courses/${courseSlug}/learn/${act.id}`}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 text-xs transition border ${
                      isActive
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`${
                          isActive
                            ? "text-emerald-700"
                            : act.is_completed
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {getActivityIcon(act.activity_type)}
                      </div>
                      <span className="truncate">{act.title}</span>
                    </div>

                    <div>
                      {act.is_completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300 block" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
