"use client";

import React, { useRef, useState, useEffect } from "react";
import { CheckCircle, ShieldAlert, FastForward } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface VideoPlayerProps {
  activityId: string;
  videoUrl: string;
  title: string;
  initialCompleted?: boolean;
  onCompleted?: () => void;
}

export default function VideoPlayer({
  activityId,
  videoUrl,
  title,
  initialCompleted = false,
  onCompleted,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [percentCompleted, setPercentCompleted] = useState(initialCompleted ? 100 : 0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [skipWarning, setSkipWarning] = useState<string | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = async (current: number, dur: number) => {
    if (dur <= 0) return;
    try {
      const res: any = await fetchApi("/tracking/video-heartbeat", {
        method: "POST",
        body: JSON.stringify({
          activity_id: activityId,
          current_time_seconds: current,
          duration_seconds: dur,
        }),
      });

      setMaxWatchedTime((prev) => Math.max(prev, res.max_watched_seconds));
      setPercentCompleted(res.percent_completed);
      if (res.is_completed && !isCompleted) {
        setIsCompleted(true);
        if (onCompleted) onCompleted();
      }
    } catch (err) {
      console.warn("Heartbeat update failed:", err);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      heartbeatTimer.current = setInterval(() => {
        if (videoRef.current) {
          sendHeartbeat(videoRef.current.currentTime, videoRef.current.duration);
        }
      }, 4000);
    } else {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    }
    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [isPlaying, activityId, isCompleted]);

  const handleSeeking = () => {
    if (!videoRef.current) return;
    const seekTarget = videoRef.current.currentTime;
    
    if (!isCompleted && seekTarget > maxWatchedTime + 3.0) {
      videoRef.current.currentTime = maxWatchedTime;
      setSkipWarning("Skipping forward is restricted. Please watch the video to proceed.");
      setTimeout(() => setSkipWarning(null), 4000);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);
    setMaxWatchedTime((prev) => Math.max(prev, current));
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getFullVideoUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const backendOrigin = apiUrl.replace(/\/api\/v1\/?$/, "");
    return `${backendOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const [videoError, setVideoError] = useState<string | null>(null);

  const handleVideoError = () => {
    setVideoError("Video stream loading error. Please refresh or verify the file format.");
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Video Container */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-md">
        <video
          ref={videoRef}
          src={getFullVideoUrl(videoUrl)}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onLoadedMetadata={() => {
            handleLoadedMetadata();
            setVideoError(null);
          }}
          onError={handleVideoError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls
          controlsList="nodownload"
          className="w-full aspect-video object-contain"
        />

        {/* Video Error Display */}
        {videoError && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-30">
            <ShieldAlert className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-sm font-semibold text-white">{videoError}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">Source: {getFullVideoUrl(videoUrl)}</p>
            <button
              onClick={() => {
                setVideoError(null);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Retry Video Playback
            </button>
          </div>
        )}

        {/* Anti-Skip Warning Overlay */}
        {skipWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-600/95 border border-rose-400 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-md animate-bounce shadow-xl z-20 font-medium">
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>{skipWarning}</span>
          </div>
        )}
      </div>

      {/* Progress & Verification Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`p-2.5 rounded-xl ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-teal-50 text-teal-700"}`}>
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : <FastForward className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              {title}
              {isCompleted && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Completed
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Time: {formatTime(currentTime)} / {formatTime(duration)} • Watched: {formatTime(maxWatchedTime)}
            </div>
          </div>
        </div>

        {/* Completion Progress Gauge */}
        <div className="flex items-center gap-3 w-full md:w-64">
          <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-300 rounded-full ${isCompleted ? "bg-emerald-600" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`}
              style={{ width: `${percentCompleted}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 min-w-[3rem] text-right">
            {percentCompleted}%
          </span>
        </div>
      </div>
    </div>
  );
}
