"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface DocumentViewerProps {
  activityId: string;
  title: string;
  content: string;
  requiredDwellSeconds?: number;
  initialCompleted?: boolean;
  onCompleted?: () => void;
}

export default function DocumentViewer({
  activityId,
  title,
  content,
  requiredDwellSeconds = 30,
  initialCompleted = false,
  onCompleted,
}: DocumentViewerProps) {
  const [dwellTime, setDwellTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setDwellTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingSeconds = Math.max(0, requiredDwellSeconds - dwellTime);
  const canComplete = remainingSeconds === 0;

  const handleComplete = async () => {
    if (!canComplete || submitting || isCompleted) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await fetchApi("/tracking/dwell-complete", {
        method: "POST",
        body: JSON.stringify({
          activity_id: activityId,
          dwell_time_seconds: dwellTime,
        }),
      });
      setIsCompleted(true);
      if (onCompleted) onCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to confirm completion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">Reading Material & Reference Document</p>
          </div>
        </div>

        {/* Reading timer & confirmation */}
        <div className="flex items-center gap-3">
          {!isCompleted && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
              <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>
                {remainingSeconds > 0
                  ? `Minimum reading time: ${remainingSeconds}s remaining`
                  : `Reading requirement completed (${dwellTime}s)`}
              </span>
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={!canComplete || isCompleted || submitting}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              isCompleted
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default"
                : canComplete
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isCompleted
              ? "Completed"
              : submitting
              ? "Verifying..."
              : canComplete
              ? "Mark as Read"
              : `Wait ${remainingSeconds}s`}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Content body */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm prose max-w-none text-slate-800 text-sm leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  );
}
