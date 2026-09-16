"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi, authStorage } from "@/lib/api";
import {
  Shield,
  Users,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Activity as ActivityIcon,
  AlertTriangle,
  PlayCircle,
  Award,
  RefreshCw,
  PlusCircle,
  Eye,
  X,
  FileText,
  Clock,
  ChevronRight,
  UploadCloud,
  FileVideo,
  HelpCircle,
  FileEdit,
  Trash2,
  ClipboardList,
  UserPlus,
  UserCheck
} from "lucide-react";

interface AdminStats {
  total_students: number;
  total_courses: number;
  total_enrollments: number;
  avg_progress: number;
  total_quiz_attempts: number;
  total_video_telemetry_records: number;
}

interface StudentDetail {
  id: string;
  full_name: string;
  email: string;
  role: string;
  enrolled_courses: number;
  avg_progress: number;
  completed_courses: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "courses" | "telemetry">("overview");

  // Selected student for detailed telemetry drawer
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  // New course modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newThumbnail, setNewThumbnail] = useState("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800");
  const [newSectionTitle, setNewSectionTitle] = useState("Module 1: Core Training");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("/media/videos/demo_lecture_1.mp4");
  const [newDwellSeconds, setNewDwellSeconds] = useState(30);
  const [creating, setCreating] = useState(false);

  // Initial Activity selection for Course creation modal
  const [courseInitialType, setCourseInitialType] = useState<"video" | "quiz" | "document" | "none">("video");
  const [courseDocBody, setCourseDocBody] = useState("# Module Introduction\n\nPlease read and understand the core policies outlined below.");
  const [courseDocDwell, setCourseDocDwell] = useState(30);
  const [courseQuizQuestions, setCourseQuizQuestions] = useState([
    {
      question_text: "What is the primary compliance objective of this course?",
      options: [
        { id: 1, text: "Ensure full knowledge retention & verified completion", is_correct: true, feedback: "Correct!" },
        { id: 2, text: "Skip all instructions", is_correct: false, feedback: "Incorrect." },
        { id: 3, text: "Manual paper submissions", is_correct: false, feedback: "Incorrect." },
      ],
      marks: 10,
    }
  ]);

  const addCourseQuizQuestion = () => {
    setCourseQuizQuestions((prev) => [
      ...prev,
      {
        question_text: "New compliance question?",
        options: [
          { id: 1, text: "Option A", is_correct: true, feedback: "Correct!" },
          { id: 2, text: "Option B", is_correct: false, feedback: "Incorrect." },
          { id: 3, text: "Option C", is_correct: false, feedback: "Incorrect." },
        ],
        marks: 10,
      }
    ]);
  };

  const removeCourseQuizQuestion = (qIdx: number) => {
    setCourseQuizQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
  };

  const updateCourseQuestionText = (qIdx: number, text: string) => {
    setCourseQuizQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].question_text = text;
      return copy;
    });
  };

  const updateCourseOptionText = (qIdx: number, optIdx: number, text: string) => {
    setCourseQuizQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].options[optIdx].text = text;
      return copy;
    });
  };

  const setCourseCorrectOption = (qIdx: number, optId: number) => {
    setCourseQuizQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].options = copy[qIdx].options.map((opt) => ({
        ...opt,
        is_correct: opt.id === optId,
      }));
      return copy;
    });
  };

  // Add Activity to existing course modal state
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedCourseForAct, setSelectedCourseForAct] = useState<any | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<"video" | "quiz" | "document" | "assignment">("video");
  const [newActTitle, setNewActTitle] = useState("");
  const [newActUrl, setNewActUrl] = useState("/media/videos/demo_lecture_2.mp4");
  const [newActDwell, setNewActDwell] = useState(30);
  const [addingAct, setAddingAct] = useState(false);

  // Document & Assignment states
  const [docBody, setDocBody] = useState("# Training Instructions\n\nPlease read through this module carefully to complete your requirement.");
  const [docDwell, setDocDwell] = useState(30);

  // Quiz creation state
  const [quizQuestions, setQuizQuestions] = useState([
    {
      question_text: "What is the primary benefit of our verified training system?",
      options: [
        { id: 1, text: "It ensures compliance videos are genuinely watched", is_correct: true, feedback: "Correct! Watch time is strictly verified." },
        { id: 2, text: "It allows employees to skip all training", is_correct: false, feedback: "Incorrect." },
        { id: 3, text: "It requires manual paper signatures", is_correct: false, feedback: "Incorrect." },
      ],
      marks: 10,
    }
  ]);

  const addQuizQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      {
        question_text: "New compliance question?",
        options: [
          { id: 1, text: "Option A", is_correct: true, feedback: "Correct!" },
          { id: 2, text: "Option B", is_correct: false, feedback: "Incorrect." },
          { id: 3, text: "Option C", is_correct: false, feedback: "Incorrect." },
        ],
        marks: 10,
      }
    ]);
  };

  const removeQuizQuestion = (qIdx: number) => {
    setQuizQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
  };

  const updateQuestionText = (qIdx: number, text: string) => {
    setQuizQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].question_text = text;
      return copy;
    });
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    setQuizQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].options[optIdx].text = text;
      return copy;
    });
  };

  const setCorrectOption = (qIdx: number, optId: number) => {
    setQuizQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].options = copy[qIdx].options.map((opt) => ({
        ...opt,
        is_correct: opt.id === optId,
      }));
      return copy;
    });
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForAct || !newActTitle) return;
    setAddingAct(true);
    try {
      const payload: any = {
        title: newActTitle,
        activity_type: selectedActivityType,
        required_dwell_seconds: Number(newActDwell) || 30,
      };

      if (selectedActivityType === "video") {
        payload.content_url = newActUrl;
      } else if (selectedActivityType === "document" || selectedActivityType === "assignment") {
        payload.content_body = docBody || "# Training Material\n\nPlease review these guidelines carefully.";
        payload.required_dwell_seconds = Number(docDwell) || 30;
      } else if (selectedActivityType === "quiz") {
        payload.questions = quizQuestions;
        payload.required_dwell_seconds = 0;
      }

      await fetchApi(`/admin/courses/${selectedCourseForAct.id}/activities`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowActivityModal(false);
      setNewActTitle("");
      setDocBody("# Training Instructions\n\nPlease read through this module carefully.");
      setSelectedCourseForAct(null);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to add activity");
    } finally {
      setAddingAct(false);
    }
  };

  // Course Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCourseId, setAssignCourseId] = useState("");
  const [assignUserId, setAssignUserId] = useState<string>("all");
  const [assigning, setAssigning] = useState(false);

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCourseId) return;
    setAssigning(true);
    try {
      const payload: any = {
        course_id: assignCourseId,
        user_id: assignUserId === "all" ? null : assignUserId,
      };
      const res = await fetchApi<any>("/admin/enroll", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert(res.message || "Course assigned successfully!");
      setShowAssignModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to assign course");
    } finally {
      setAssigning(false);
    }
  };

  // Video Upload States
  const [videoSourceType, setVideoSourceType] = useState<"upload" | "url">("upload");
  const [actVideoSourceType, setActVideoSourceType] = useState<"upload" | "url">("upload");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isForExistingCourse = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setUploadProgressText(`Uploading ${file.name} (${sizeMb} MB)...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = authStorage.getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiUrl}/admin/upload-video`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Video upload failed");
      }

      const data = await res.json();
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

      if (isForExistingCourse) {
        setNewActUrl(data.video_url);
        if (!newActTitle) setNewActTitle(formattedTitle);
      } else {
        setNewVideoUrl(data.video_url);
        if (!newVideoTitle) setNewVideoTitle(`1.1 ${formattedTitle}`);
      }
      setUploadProgressText(`✓ Ready: ${file.name} (${sizeMb} MB)`);
    } catch (err: any) {
      alert(err.message || "Failed to upload video from computer");
      setUploadProgressText("");
    } finally {
      setUploadingVideo(false);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const me = await fetchApi<any>("/auth/me").catch(() => null);
      setCurrentUser(me);

      if (me?.role === "admin") {
        const [statsData, studentsData, coursesData] = await Promise.all([
          fetchApi<AdminStats>("/admin/stats").catch(() => null),
          fetchApi<StudentDetail[]>("/admin/students").catch(() => []),
          fetchApi<any[]>("/courses").catch(() => []),
        ]);
        setStats(statsData);
        setStudents(studentsData);
        setCourses(coursesData);
      }
    } catch (err) {
      console.error("Admin data loading failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const openStudentDetail = async (studentId: string) => {
    setLoadingStudentDetail(true);
    try {
      const detail = await fetchApi(`/admin/students/${studentId}`);
      setSelectedStudent(detail);
    } catch (err) {
      console.error("Failed to load student detail:", err);
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSlug) return;
    setCreating(true);
    try {
      const payload: any = {
        title: newTitle,
        slug: newSlug,
        description: newDescription,
        thumbnail_url: newThumbnail,
        is_published: true,
        section_title: newSectionTitle || "Module 1: Core Training",
        activity_type: courseInitialType,
        activity_title: newVideoTitle || `${newTitle} - Initial Lesson`,
      };

      if (courseInitialType === "video") {
        payload.video_url = newVideoUrl || "/media/videos/demo_lecture_1.mp4";
        payload.required_dwell_seconds = Number(newDwellSeconds) || 30;
      } else if (courseInitialType === "document") {
        payload.content_body = courseDocBody;
        payload.required_dwell_seconds = Number(courseDocDwell) || 30;
      } else if (courseInitialType === "quiz") {
        payload.questions = courseQuizQuestions;
        payload.required_dwell_seconds = 0;
      }

      await fetchApi("/admin/courses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setShowCourseModal(false);
      setNewTitle("");
      setNewSlug("");
      setNewDescription("");
      setNewVideoTitle("");
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to create course");
    } finally {
      setCreating(false);
    }
  };


  const switchToAdminAccount = async () => {
    try {
      const res = await fetchApi<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@algolms.com",
          password: "Admin@123",
        }),
      });
      authStorage.setToken(res.access_token);
      window.location.reload();
    } catch (err) {
      alert("Failed to switch to admin: " + err);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
        <span className="text-sm">Loading enterprise admin dashboard...</span>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-6 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
          <Shield className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Admin Privileges Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You are currently browsing with the student account (<span className="text-emerald-700 font-semibold">{currentUser?.email || "student"}</span>). Switch to the Administrator account to manage courses, view learner telemetry, and inspect completion gatekeeping.
          </p>
        </div>
        <button
          onClick={switchToAdminAccount}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4" /> Log In as Administrator (admin@algolms.com)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 rounded-3xl p-8 border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <Shield className="w-3.5 h-3.5 text-emerald-600" /> Admin Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Training & Compliance Dashboard
          </h1>
          <p className="text-xs text-slate-600">
            Monitor employee training completion, verify video watch time, and manage company courses.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => setShowCourseModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" /> Create Course
          </button>
          <button
            onClick={loadAdminData}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-white text-slate-700 hover:text-emerald-700 border border-slate-200 shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Enrolled Employees</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.total_students ?? students.length}</div>
          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Active Learners
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Available Courses</span>
            <BookOpen className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.total_courses ?? courses.length}</div>
          <div className="text-[10px] text-slate-500">Published modules</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Verified Watch Records</span>
            <ActivityIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {stats?.total_video_telemetry_records ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">Watch checks verified</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Quizzes Completed</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {stats?.total_quiz_attempts ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">Graded submissions</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Employee Training Status
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "courses"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Course Management
        </button>
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "telemetry"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Anti-Skip & Security Rules
        </button>
      </div>

      {/* Tab: Learner Roster */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Employee Course & Completion Records</h3>
                <p className="text-[11px] text-slate-500">Click any employee row to view their detailed watch history and quiz scores.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAssignUserId("all");
                    if (courses.length > 0) setAssignCourseId(courses[0].id);
                    setShowAssignModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Assign Course
                </button>
                <span className="text-[11px] text-slate-500">{students.length} Learners registered</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Employee Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Enrolled Courses</th>
                    <th className="px-6 py-3">Avg Progress</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => openStudentDetail(st.id)}
                      className="hover:bg-emerald-50/40 cursor-pointer transition"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {st.full_name.charAt(0)}
                        </div>
                        <div>
                          <div>{st.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {st.id.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{st.email}</td>
                      <td className="px-6 py-4 font-medium">{st.enrolled_courses} Course(s)</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${st.avg_progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-700">{st.avg_progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {st.avg_progress >= 100 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            Completed ({st.completed_courses})
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 text-[11px]">
                          View Details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Courses */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {courses.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <img
                    src={c.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"}
                    alt={c.title}
                    className="w-full h-36 rounded-xl object-cover border border-slate-100"
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        Published
                      </span>
                      <span className="text-[11px] text-slate-500">{c.total_activities} Lessons</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{c.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{c.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{c.total_activities || 0} Lessons • {c.enrolled_count || 0} Learners</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourseForAct(c);
                        setShowActivityModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> Add Content
                    </button>
                    <Link
                      href={`/courses/${c.slug}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Anti-Skip & Security Rules */}
      {activeTab === "telemetry" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Anti-Skip Video Protection Active</h3>
              <p className="text-xs text-slate-600">
                Videos cannot be fast-forwarded or skipped. Completion is confirmed as the employee watches.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl space-y-1 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-500">Progress Update Rate</span>
              <div className="text-lg font-bold text-slate-900">Every 5 Seconds</div>
              <p className="text-[11px] text-slate-500">Live attendance sync</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl space-y-1 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-500">Fast-Forward Block</span>
              <div className="text-lg font-bold text-emerald-700">Active Protection</div>
              <p className="text-[11px] text-slate-500">Prevents skipping ahead</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl space-y-1 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-500">Reading Time Requirements</span>
              <div className="text-lg font-bold text-teal-700">Enforced</div>
              <p className="text-[11px] text-slate-500">Minimum reading duration</p>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {selectedStudent.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedStudent.full_name}</h3>
                  <p className="text-xs text-slate-500">{selectedStudent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Enrolled Courses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" /> Course Enrollments ({selectedStudent.enrollments?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignUserId(selectedStudent.id);
                      if (courses.length > 0) setAssignCourseId(courses[0].id);
                      setShowAssignModal(true);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Assign New Course
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedStudent.enrollments?.map((e: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{e.course_title}</div>
                        <div className="text-[10px] text-slate-500">Status: <span className="text-emerald-700 font-semibold">{e.status}</span></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${e.progress_percentage}%` }} />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-800">{e.progress_percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Watch History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-emerald-600" /> Verified Video Watch History ({selectedStudent.video_progress?.length || 0})
                </h4>
                {selectedStudent.video_progress?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.video_progress.map((v: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{v.activity_title}</div>
                          <div className="text-[10px] text-slate-500">
                            Time Watched: {Math.round(v.max_watched_seconds)}s / {Math.round(v.duration_seconds)}s
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.is_completed ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-teal-50 text-teal-800 border border-teal-200"
                        }`}>
                          {v.percent_completed}% Completed
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No video activity recorded yet.</div>
                )}
              </div>

              {/* Quiz Assessment Results */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" /> Quiz & Test Results ({selectedStudent.quiz_attempts?.length || 0})
                </h4>
                {selectedStudent.quiz_attempts?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.quiz_attempts.map((q: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{q.activity_title}</div>
                          <div className="text-[10px] text-slate-500">
                            Score: <span className="text-slate-900 font-mono font-bold">{q.score} / {q.total_marks}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.passed ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          {q.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No quiz attempts submitted yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" /> Create New Course
                </h3>
                <p className="text-[11px] text-slate-500">Publish a course with Video Lessons, Quizzes, or Reading Materials.</p>
              </div>
              <button
                onClick={() => setShowCourseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              {/* Basic Details */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">1. Course Details</span>
                <div>
                  <label className="block text-[11px] text-slate-700 font-semibold mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                      if (!newVideoTitle) {
                        setNewVideoTitle(`1.1 Introduction to ${e.target.value}`);
                      }
                    }}
                    placeholder="e.g. Full-Stack Cloud Microservices"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      placeholder="e.g. full-stack-cloud"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">Thumbnail Cover URL</label>
                    <input
                      type="url"
                      value={newThumbnail}
                      onChange={(e) => setNewThumbnail(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-700 font-semibold mb-1">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Course overview, outcomes, and syllabus details..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Initial Activity Selection */}
              <div className="space-y-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                    2. Initial Lesson / Content Type
                  </span>
                </div>

                {/* Activity Type Tabs */}
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCourseInitialType("video")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                      courseInitialType === "video"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseInitialType("quiz")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                      courseInitialType === "quiz"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" /> Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseInitialType("document")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                      courseInitialType === "document"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseInitialType("none")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                      courseInitialType === "none"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Skip
                  </button>
                </div>

                {/* Initial Lesson Title (if not none) */}
                {courseInitialType !== "none" && (
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      {courseInitialType === "video" && "Initial Video Title"}
                      {courseInitialType === "quiz" && "Initial Quiz Title"}
                      {courseInitialType === "document" && "Initial Document Title"}
                    </label>
                    <input
                      type="text"
                      value={newVideoTitle}
                      onChange={(e) => setNewVideoTitle(e.target.value)}
                      placeholder="e.g. Lesson 1.1: Platform Introduction"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Video Option Form */}
                {courseInitialType === "video" && (
                  <div className="space-y-3">
                    {/* Source Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setVideoSourceType("upload")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          videoSourceType === "upload"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Upload from Computer
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoSourceType("url")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          videoSourceType === "url"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Video URL / Link
                      </button>
                    </div>

                    {videoSourceType === "upload" ? (
                      <div className="space-y-2">
                        <label className="block text-[11px] text-slate-700 font-semibold">Choose Video from Your Machine (.mp4, .webm, .mov) *</label>
                        <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-4 text-center bg-white cursor-pointer transition relative">
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                            onChange={(e) => handleFileUpload(e, false)}
                            disabled={uploadingVideo}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                              <UploadCloud className={`w-5 h-5 ${uploadingVideo ? "animate-bounce" : ""}`} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {uploadingVideo ? "Uploading..." : "Click or drag video file here"}
                              </p>
                              <p className="text-[10px] text-slate-500">Fast local upload with instant streaming</p>
                            </div>
                          </div>
                        </div>
                        {uploadProgressText && (
                          <div className="p-2.5 rounded-xl bg-emerald-100/90 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                            <FileVideo className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="truncate">{uploadProgressText}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] text-slate-700 font-semibold">Video Stream / Direct MP4 URL *</label>
                          <button
                            type="button"
                            onClick={() => setNewVideoUrl("/media/videos/demo_lecture_1.mp4")}
                            className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold underline"
                          >
                            Sample Video
                          </button>
                        </div>
                        <input
                          type="url"
                          required={videoSourceType === "url"}
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                          placeholder="/media/videos/... or https://.../sample.mp4"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] text-slate-700 font-semibold mb-1">Required Minimum Watch Time (Seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="7200"
                        value={newDwellSeconds}
                        onChange={(e) => setNewDwellSeconds(parseInt(e.target.value) || 30)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Quiz Option Form */}
                {courseInitialType === "quiz" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-600" /> Multiple Choice Questions ({courseQuizQuestions.length})
                      </span>
                      <button
                        type="button"
                        onClick={addCourseQuizQuestion}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1 transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Add Question
                      </button>
                    </div>

                    <div className="space-y-3">
                      {courseQuizQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              Question {qIdx + 1}
                            </span>
                            {courseQuizQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCourseQuizQuestion(qIdx)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            required
                            value={q.question_text}
                            onChange={(e) => updateCourseQuestionText(qIdx, e.target.value)}
                            placeholder="Enter question text..."
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                          />

                          <div className="space-y-1.5">
                            <span className="text-[10px] text-slate-500 font-semibold block">Select correct answer:</span>
                            {q.options.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`course_correct_opt_${qIdx}`}
                                  checked={opt.is_correct}
                                  onChange={() => setCourseCorrectOption(qIdx, opt.id)}
                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  required
                                  value={opt.text}
                                  onChange={(e) => updateCourseOptionText(qIdx, optIdx, e.target.value)}
                                  placeholder={`Option ${optIdx + 1}`}
                                  className={`flex-1 px-3 py-1 rounded-xl text-xs border focus:outline-none ${
                                    opt.is_correct
                                      ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-900"
                                      : "bg-slate-50 border-slate-200 text-slate-800"
                                  }`}
                                />
                                {opt.is_correct && (
                                  <span className="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-100">
                                    Correct
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Option Form */}
                {courseInitialType === "document" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-700 font-semibold mb-1">Document Guidelines / Reading Material *</label>
                      <textarea
                        required
                        value={courseDocBody}
                        onChange={(e) => setCourseDocBody(e.target.value)}
                        rows={4}
                        placeholder="# Course Overview\n\nExplain module instructions..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-700 font-semibold mb-1">Minimum Reading Time Required (Seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={courseDocDwell}
                        onChange={(e) => setCourseDocDwell(parseInt(e.target.value) || 30)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Skip Option Notice */}
                {courseInitialType === "none" && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    Course will be created without lessons. You can add video lessons, quizzes, or documents anytime from the Course Management tab.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || uploadingVideo}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> {creating ? "Creating Course..." : "Create & Publish Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Activity Modal for existing courses (Video, Quiz, Document, Assignment) */}
      {showActivityModal && selectedCourseForAct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600" /> Add Course Content
                </h3>
                <p className="text-[11px] text-slate-500">Adding to: <span className="font-semibold text-emerald-800">{selectedCourseForAct.title}</span></p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Activity Type Selector */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setSelectedActivityType("video")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  selectedActivityType === "video"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PlayCircle className="w-4 h-4 text-emerald-600" /> Video Lesson
              </button>
              <button
                type="button"
                onClick={() => setSelectedActivityType("quiz")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  selectedActivityType === "quiz"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" /> Quiz / Test
              </button>
              <button
                type="button"
                onClick={() => setSelectedActivityType("document")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  selectedActivityType === "document"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-4 h-4 text-teal-600" /> Document / Guide
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                  {selectedActivityType === "video" && "Video Lesson Title *"}
                  {selectedActivityType === "quiz" && "Quiz / Assessment Title *"}
                  {selectedActivityType === "document" && "Document / Reading Title *"}
                </label>
                <input
                  type="text"
                  required
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                  placeholder={
                    selectedActivityType === "video"
                      ? "e.g. Lesson 2: Workplace Safety Protocols"
                      : selectedActivityType === "quiz"
                      ? "e.g. Module 2: Compliance Knowledge Check"
                      : "e.g. Policy Guide: Information Security Standards"
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* VIDEO TYPE */}
              {selectedActivityType === "video" && (
                <div className="space-y-4">
                  {/* Source Selection Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActVideoSourceType("upload")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        actVideoSourceType === "upload"
                          ? "bg-white text-emerald-800 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload from Computer
                    </button>
                    <button
                      type="button"
                      onClick={() => setActVideoSourceType("url")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        actVideoSourceType === "url"
                          ? "bg-white text-emerald-800 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Video URL / Link
                    </button>
                  </div>

                  {actVideoSourceType === "upload" ? (
                    <div className="space-y-2">
                      <label className="block text-[11px] text-slate-700 font-semibold">Select Video File (.mp4, .webm, .mov) *</label>
                      <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-4 text-center bg-slate-50 cursor-pointer transition relative">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                          onChange={(e) => handleFileUpload(e, true)}
                          disabled={uploadingVideo}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <UploadCloud className={`w-5 h-5 ${uploadingVideo ? "animate-bounce" : ""}`} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {uploadingVideo ? "Uploading..." : "Click or drag video file here"}
                            </p>
                            <p className="text-[10px] text-slate-500">Saved securely to company LMS storage</p>
                          </div>
                        </div>
                      </div>
                      {uploadProgressText && (
                        <div className="p-2.5 rounded-xl bg-emerald-100/90 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                          <FileVideo className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="truncate">{uploadProgressText}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] text-slate-700 font-semibold">Video Stream / Direct MP4 URL *</label>
                        <button
                          type="button"
                          onClick={() => setNewActUrl("/media/videos/demo_lecture_2.mp4")}
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold underline"
                        >
                          Sample Video
                        </button>
                      </div>
                      <input
                        type="url"
                        required={actVideoSourceType === "url"}
                        value={newActUrl}
                        onChange={(e) => setNewActUrl(e.target.value)}
                        placeholder="/media/videos/... or https://.../sample.mp4"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">Required Minimum Watch Time (Seconds)</label>
                    <input
                      type="number"
                      min="5"
                      max="7200"
                      value={newActDwell}
                      onChange={(e) => setNewActDwell(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* QUIZ TYPE */}
              {selectedActivityType === "quiz" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" /> Multiple Choice Questions ({quizQuestions.length})
                    </span>
                    <button
                      type="button"
                      onClick={addQuizQuestion}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Question {qIdx + 1}
                          </span>
                          {quizQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuizQuestion(qIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div>
                          <input
                            type="text"
                            required
                            value={q.question_text}
                            onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                            placeholder="Enter the question text here..."
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            Options (Select the radio button for the correct answer):
                          </span>
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_opt_${qIdx}`}
                                checked={opt.is_correct}
                                onChange={() => setCorrectOption(qIdx, opt.id)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <input
                                type="text"
                                required
                                value={opt.text}
                                onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className={`flex-1 px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                                  opt.is_correct
                                    ? "bg-emerald-50/70 border-emerald-300 font-semibold text-emerald-900"
                                    : "bg-white border-slate-200 text-slate-800"
                                }`}
                              />
                              {opt.is_correct && (
                                <span className="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-100">
                                  Correct
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DOCUMENT / READING TYPE */}
              {selectedActivityType === "document" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Reading Content / Guidelines *
                    </label>
                    <textarea
                      required
                      value={docBody}
                      onChange={(e) => setDocBody(e.target.value)}
                      placeholder="# Section Overview\n\nExplain policies, procedures, and required guidelines here..."
                      rows={5}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Minimum Reading Time Required (Seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="3600"
                      value={docDwell}
                      onChange={(e) => setDocDwell(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Employees must spend at least this duration before the completion check unlocks.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingAct || uploadingVideo}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />{" "}
                  {addingAct
                    ? "Adding..."
                    : selectedActivityType === "video"
                    ? "Add Video Lesson"
                    : selectedActivityType === "quiz"
                    ? "Create Quiz Assessment"
                    : "Add Document Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" /> Assign Course to Employees
                </h3>
                <p className="text-[11px] text-slate-500">Enroll specific individuals or assign mandatory training to everyone.</p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCourse} className="space-y-4">
              {/* Select Course */}
              <div>
                <label className="block text-[11px] text-slate-700 font-semibold mb-1">Select Course *</label>
                <select
                  required
                  value={assignCourseId}
                  onChange={(e) => setAssignCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Employee */}
              <div>
                <label className="block text-[11px] text-slate-700 font-semibold mb-1">Assign To *</label>
                <select
                  required
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="all">👥 All Employees ({students.length} Learners)</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      👤 {st.full_name} ({st.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !assignCourseId}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" /> {assigning ? "Enrolling..." : "Confirm & Assign Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
