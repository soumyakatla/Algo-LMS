import React from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, CheckCircle2 } from "lucide-react";

interface CourseCardProps {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    thumbnail_url: string;
    total_activities: number;
    enrolled_count: number;
  };
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col group hover:-translate-y-1">
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={course.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white font-medium backdrop-blur-md flex items-center gap-1.5 shadow-sm">
            <BookOpen className="w-3.5 h-3.5" />
            {course.total_activities} Modules
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/90 text-slate-800 font-semibold backdrop-blur-md shadow-sm">
            {course.enrolled_count} Learners
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
            {course.title}
          </h3>
          <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Gatekept Verified
          </span>
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl transition shadow-sm"
          >
            Open Course
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
