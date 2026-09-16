"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle, CheckCircle, XCircle, Award, RotateCcw, ArrowRight } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface QuizViewerProps {
  activityId: string;
  title: string;
  initialCompleted?: boolean;
  onCompleted?: () => void;
}

export default function QuizViewer({
  activityId,
  title,
  initialCompleted = false,
  onCompleted,
}: QuizViewerProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true);
        const data = await fetchApi<any[]>(`/quizzes/${activityId}`);
        setQuestions(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load quiz questions");
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [activityId]);

  const handleSelectOption = (questionId: string, optionId: number) => {
    if (attemptResult) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async () => {
    if (submitting || attemptResult) return;
    const answersPayload = Object.entries(selectedAnswers).map(([qid, oid]) => ({
      question_id: qid,
      selected_option_id: oid,
    }));

    if (answersPayload.length < questions.length) {
      setErrorMsg("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res: any = await fetchApi(`/quizzes/${activityId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          activity_id: activityId,
          answers: answersPayload,
        }),
      });
      setAttemptResult(res);
      if (res.passed && onCompleted) {
        onCompleted();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit quiz attempt");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAttemptResult(null);
    setSelectedAnswers({});
    setErrorMsg(null);
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 text-sm">
        Loading quiz assessment...
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Quiz Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">
              Passing threshold: 70% • Total questions: {questions.length}
            </p>
          </div>
        </div>
      </div>

      {/* Result banner if submitted */}
      {attemptResult && (
        <div
          className={`p-6 rounded-2xl border ${
            attemptResult.passed
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          } flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl ${
                attemptResult.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {attemptResult.passed ? "Assessment Passed!" : "Assessment Incomplete"}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                You scored {attemptResult.score} / {attemptResult.total_marks} ({attemptResult.percentage}%)
              </p>
            </div>
          </div>

          {!attemptResult.passed && (
            <button
              onClick={handleRetake}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <RotateCcw className="w-4 h-4" /> Retake Assessment
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => {
          const evalResult = attemptResult?.results?.find((r: any) => r.question_id === q.id);

          return (
            <div
              key={q.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Question {qIndex + 1}
                </span>
                <span className="text-xs text-slate-500 font-medium">{q.marks} Marks</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{q.question_text}</p>

              {/* Options */}
              <div className="space-y-2.5 pt-2">
                {q.options.map((opt: any) => {
                  const isSelected = selectedAnswers[q.id] === opt.id;
                  let optStyle =
                    "border-slate-200 hover:border-emerald-400 bg-slate-50 text-slate-700";

                  if (attemptResult && evalResult) {
                    if (opt.id === evalResult.correct_option_id) {
                      optStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
                    } else if (isSelected && !evalResult.is_correct) {
                      optStyle = "border-rose-400 bg-rose-50 text-rose-900 font-semibold";
                    }
                  } else if (isSelected) {
                    optStyle = "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs";
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id)}
                      disabled={Boolean(attemptResult)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition flex items-center justify-between ${optStyle}`}
                    >
                      <span>{opt.text}</span>
                      {attemptResult && opt.id === evalResult?.correct_option_id && (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      {attemptResult && isSelected && !evalResult?.is_correct && (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback text */}
              {evalResult?.feedback && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                  <span className="font-semibold text-slate-800">Explanation: </span>
                  {evalResult.feedback}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      {!attemptResult && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {submitting ? "Evaluating..." : "Submit Assessment"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
