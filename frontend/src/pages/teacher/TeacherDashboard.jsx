// src/pages/teacher/TeacherDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import {
  FiUsers,
  FiBook,
  FiClock,
  FiCalendar,
  FiChevronDown,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiBarChart2,
  FiPlay,
  FiSearch,
  FiArrowRight,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
};

const fmtTime = (isoStr) => {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusMeta = {
  present: {
    label: "มาเรียน",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    dot: "bg-emerald-400",
    icon: FiCheckCircle,
  },
  late: {
    label: "สาย",
    color: "text-amber-600",
    bg: "bg-amber-50",
    dot: "bg-amber-400",
    icon: FiAlertCircle,
  },
  absent: {
    label: "ขาด",
    color: "text-red-500",
    bg: "bg-red-50",
    dot: "bg-red-400",
    icon: FiXCircle,
  },
};

// ─── Sub-component: Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, gradient, iconBg }) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient} transition-transform hover:scale-[1.02] duration-300`}
  >
    <Icon className="absolute -right-3 -bottom-3 w-28 h-28 opacity-10" />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 ${iconBg} rounded-lg`}>
          <Icon size={16} />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest opacity-90">
          {label}
        </span>
      </div>
      <p className="text-5xl font-black tracking-tight mb-1">{value}</p>
      <p className="text-xs opacity-75 font-medium">{sub}</p>
    </div>
  </div>
);

// ─── Sub-component: Attendance Row ───────────────────────────────────────────
const AttRow = ({ rec, idx }) => {
  const meta = statusMeta[rec.status] || statusMeta.absent;
  const Icon = meta.icon;
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
      style={{ animationDelay: `${idx * 30}ms` }}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
        {(rec.student_name || "?").charAt(0).toUpperCase()}
      </div>
      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">
          {rec.student_name}
        </p>
        <p className="text-xs text-slate-400 font-mono">{rec.student_id}</p>
      </div>
      {/* Time */}
      <p className="text-xs text-slate-400 w-14 text-center flex-shrink-0">
        {rec.timestamp ? fmtTime(rec.timestamp) : "—"}
      </p>
      {/* Confidence */}
      {rec.confidence_score != null && (
        <div className="w-14 flex-shrink-0">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
              style={{ width: `${rec.confidence_score}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-right mt-0.5">
            {rec.confidence_score}%
          </p>
        </div>
      )}
      {/* Status badge */}
      <span
        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${meta.bg} ${meta.color}`}
      >
        <Icon size={11} />
        {meta.label}
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TeacherDashboard = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [summary, setSummary] = useState(null); // { summary:{}, records:[] }
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | present | late | absent
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    avgAttendance: 0,
  });

  // ── Fetch courses on mount ──
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get("/courses/my-courses");
        setCourses(res.data);
        setStats((prev) => ({ ...prev, totalCourses: res.data.length }));
        if (res.data.length > 0) handleCourseSelect(res.data[0]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Select a course → load its sessions ──
  const handleCourseSelect = useCallback(async (course) => {
    setSelectedCourse(course);
    setSelectedSession(null);
    setSummary(null);
    try {
      const res = await api.get(`/courses/${course.id}/sessions`);
      const sorted = res.data.sort((a, b) => a.id - b.id);
      setSessions(sorted);
      // Auto-select last completed session
      const completed = sorted.filter((s) => s.status === "completed");
      if (completed.length > 0) {
        handleSessionSelect(completed[completed.length - 1], sorted);
      }
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Select a session → load its summary ──
  const handleSessionSelect = useCallback(async (session, allSessions) => {
    setSelectedSession(session);
    setSummary(null);
    setSearchQuery("");
    setFilterStatus("all");

    if (session.status !== "completed" && !session.is_active) {
      return; // pending session → ยังไม่มีข้อมูล
    }

    setLoadingSummary(true);
    try {
      const res = await api.get(`/sessions/${session.id}/summary`);
      setSummary(res.data);

      // Update overall stats
      const { present, late, total } = res.data.summary;
      if (total > 0) {
        const rate = Math.round(((present + late) / total) * 100);
        setStats((prev) => ({
          ...prev,
          totalStudents: total,
          avgAttendance: rate,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // ── Filter records ──
  const filteredRecords = (summary?.records || []).filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      r.student_name?.toLowerCase().includes(q) ||
      r.student_id?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const sessionWeekNum = (session) => {
    if (!sessions.length) return "?";
    return sessions.findIndex((s) => s.id === session.id) + 1;
  };

  const sessionStatusMeta = (s) => {
    if (s.status === "completed")
      return { label: "เสร็จแล้ว", cls: "bg-slate-100 text-slate-500" };
    if (s.status === "active" || s.is_active)
      return { label: "● กำลังสด", cls: "bg-green-100 text-green-600" };
    return { label: "รอเริ่ม", cls: "bg-blue-50 text-blue-500" };
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-8 pt-8 pb-28 relative flex-shrink-0">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute top-10 right-40 w-32 h-32 bg-indigo-300/10 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">
                ภาพรวม
              </p>
              <h1 className="text-3xl font-black text-white mb-1">
                Teacher Dashboard
              </h1>
              <p className="text-blue-200 text-sm">
                {new Date().toLocaleDateString("th-TH", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/teacher/device-setup")}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                <FiPlay size={14} fill="currentColor" /> เริ่มเช็คชื่อ
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto -mt-20 px-8 pb-8">
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-3 gap-5 mb-6">
            <StatCard
              icon={FiBook}
              label="Total Courses"
              value={stats.totalCourses}
              sub="วิชาที่สอน"
              gradient="bg-gradient-to-br from-blue-500 to-indigo-500"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={FiUsers}
              label="Total Students"
              value={stats.totalStudents || "—"}
              sub="นักศึกษาในคาบล่าสุด"
              gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={FiBarChart2}
              label="Attendance Rate"
              value={stats.avgAttendance ? `${stats.avgAttendance}%` : "—"}
              sub="อัตราเข้าเรียนรวม"
              gradient="bg-gradient-to-br from-amber-400 to-orange-500"
              iconBg="bg-white/20"
            />
          </div>

          {/* ── Main Panel ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* ── Course + Session Selector ── */}
            <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center gap-4 bg-slate-50/60">
              {/* Course dropdown */}
              <div className="relative flex-shrink-0">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  วิชา
                </label>
                <div className="relative">
                  <select
                    value={selectedCourse?.id || ""}
                    onChange={(e) => {
                      const c = courses.find(
                        (x) => x.id === parseInt(e.target.value),
                      );
                      if (c) handleCourseSelect(c);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl px-4 py-2 pr-9 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[220px] cursor-pointer"
                  >
                    {courses.length === 0 && (
                      <option value="">— ไม่มีวิชา —</option>
                    )}
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} · {c.name}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={14}
                  />
                </div>
              </div>

              {/* Session tabs / pills */}
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  คาบเรียน
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {sessions.length === 0 && (
                    <span className="text-sm text-slate-400 py-2">
                      ไม่มีคาบ
                    </span>
                  )}
                  {sessions.map((s, idx) => {
                    const meta = sessionStatusMeta(s);
                    const isSelected = selectedSession?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSessionSelect(s, sessions)}
                        className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border text-xs font-bold transition-all
                          ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                          }`}
                      >
                        <span className="text-[10px] opacity-70 mb-0.5">
                          W{idx + 1}
                        </span>
                        <span>{fmt(s.date)}</span>
                        <span
                          className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Go to live button if active */}
              {selectedSession &&
                (selectedSession.status === "active" ||
                  selectedSession.is_active) && (
                  <button
                    onClick={() =>
                      navigate(`/teacher/session/${selectedSession.id}/live`)
                    }
                    className="flex-shrink-0 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shadow-green-200"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    เข้าห้องสด <FiArrowRight size={14} />
                  </button>
                )}
            </div>

            {/* ── Attendance Content ── */}
            {!selectedSession ? (
              <EmptyState
                icon={FiCalendar}
                text="เลือกวิชาและคาบเรียนเพื่อดูผล"
              />
            ) : selectedSession.status === "pending" &&
              !selectedSession.is_active ? (
              <EmptyState
                icon={FiClock}
                text={`Week ${sessionWeekNum(selectedSession)} (${fmt(selectedSession.date)}) ยังไม่ได้เปิดคาบเรียน`}
                sub="เริ่มเช็คชื่อเพื่อดูผลที่นี่"
              />
            ) : loadingSummary ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : !summary ? (
              <EmptyState icon={FiBarChart2} text="ไม่พบข้อมูลเช็คชื่อ" />
            ) : (
              <>
                {/* Summary Bar */}
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                      Week {sessionWeekNum(selectedSession)}
                    </p>
                    <p className="font-black text-slate-800 text-lg">
                      {fmt(selectedSession.date)}
                    </p>
                  </div>

                  {/* Donut-style mini bars */}
                  <div className="flex gap-4 flex-1">
                    {[
                      {
                        key: "present",
                        label: "มาเรียน",
                        count: summary.summary.present,
                        color: "bg-emerald-400",
                      },
                      {
                        key: "late",
                        label: "สาย",
                        count: summary.summary.late,
                        color: "bg-amber-400",
                      },
                      {
                        key: "absent",
                        label: "ขาด",
                        count: summary.summary.absent,
                        color: "bg-red-400",
                      },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() =>
                          setFilterStatus((prev) =>
                            prev === item.key ? "all" : item.key,
                          )
                        }
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer
                          ${filterStatus === item.key ? "border-slate-300 bg-slate-50 shadow-sm" : "border-transparent hover:border-slate-200"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-white font-black text-sm shadow-sm`}
                        >
                          {item.count}
                        </div>
                        <span className="text-sm font-semibold text-slate-600">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Attendance rate ring */}
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke={
                            summary.summary.total > 0 &&
                            (summary.summary.present + summary.summary.late) /
                              summary.summary.total >
                              0.8
                              ? "#34d399"
                              : "#f97316"
                          }
                          strokeWidth="3.5"
                          strokeDasharray={`${summary.summary.total > 0 ? Math.round(((summary.summary.present + summary.summary.late) / summary.summary.total) * 100) : 0}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">
                        {summary.summary.total > 0
                          ? Math.round(
                              ((summary.summary.present +
                                summary.summary.late) /
                                summary.summary.total) *
                                100,
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">
                        อัตราเข้า
                      </p>
                      <p className="text-sm font-black text-slate-700">
                        {summary.summary.present + summary.summary.late}/
                        {summary.summary.total} คน
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search + Filter */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <FiSearch
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ / รหัสนักศึกษา..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
                    />
                  </div>
                  <div className="flex gap-2">
                    {["all", "present", "late", "absent"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                          ${
                            filterStatus === s
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                      >
                        {
                          {
                            all: "ทั้งหมด",
                            present: "มาเรียน",
                            late: "สาย",
                            absent: "ขาด",
                          }[s]
                        }
                        <span className="ml-1.5 opacity-70">
                          {
                            {
                              all: summary.summary.total,
                              present: summary.summary.present,
                              late: summary.summary.late,
                              absent: summary.summary.absent,
                            }[s]
                          }
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-[auto_1fr_80px_80px_100px] gap-4 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/50">
                  <span className="w-9" />
                  <span>ชื่อ – รหัส</span>
                  <span className="text-center">เวลา</span>
                  <span className="text-center">ความมั่นใจ</span>
                  <span className="text-center">สถานะ</span>
                </div>

                {/* Records */}
                <div className="overflow-y-auto" style={{ maxHeight: "36vh" }}>
                  {filteredRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <FiSearch size={28} className="mb-2 opacity-40" />
                      <p className="text-sm font-semibold">
                        ไม่พบรายการที่ตรงกัน
                      </p>
                    </div>
                  ) : (
                    filteredRecords.map((rec, i) => (
                      <div
                        key={`${rec.student_id}-${i}`}
                        className="grid grid-cols-[auto_1fr_80px_80px_100px] gap-4 items-center px-6 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                          {(rec.student_name || "?").charAt(0).toUpperCase()}
                        </div>
                        {/* Name + ID */}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">
                            {rec.student_name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            {rec.student_id}
                          </p>
                        </div>
                        {/* Time */}
                        <p className="text-xs text-slate-500 text-center">
                          {rec.timestamp ? fmtTime(rec.timestamp) : "—"}
                        </p>
                        {/* Confidence bar */}
                        <div className="flex flex-col items-center gap-1">
                          {rec.confidence_score != null ? (
                            <>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
                                  style={{ width: `${rec.confidence_score}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400">
                                {rec.confidence_score}%
                              </p>
                            </>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>
                        {/* Status */}
                        {(() => {
                          const m = statusMeta[rec.status] || statusMeta.absent;
                          const Icon = m.icon;
                          return (
                            <span
                              className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${m.bg} ${m.color}`}
                            >
                              <Icon size={11} />
                              {m.label}
                            </span>
                          );
                        })()}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const EmptyState = ({ icon: Icon, text, sub }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
      <Icon size={26} className="opacity-50" />
    </div>
    <p className="font-semibold text-sm text-slate-500">{text}</p>
    {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
  </div>
);

export default TeacherDashboard;
