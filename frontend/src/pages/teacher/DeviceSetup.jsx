import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Sidebar from "../../components/Sidebar";
import {
  FiBook,
  FiCalendar,
  FiMapPin,
  FiMonitor,
  FiPlay,
  FiChevronDown,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

const DeviceSetup = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]); // ALL sessions รวม completed
  const [allSessions, setAllSessions] = useState([]); // ใช้ lookup week number
  const [devices, setDevices] = useState([]);
  const [rooms] = useState(["M22", "CB2301", "LX1102", "SIT-Train-1"]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState("M22");
  const [selectedDevice, setSelectedDevice] = useState("");

  const formatDate = (dateString) => {
    if (!dateString) return "ไม่ระบุวันที่";
    const date = new Date(dateString + "T12:00:00");
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  };

  const getSessionStatus = (session) => {
    if (session.status === "completed") return "completed";
    if (session.status === "active" || session.is_active) return "active";
    return "pending";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return { label: "✓ เสร็จแล้ว", color: "bg-gray-100 text-gray-500" };
      case "active":
        return { label: "● กำลังเปิด", color: "bg-green-100 text-green-600" };
      default:
        return { label: "รอเริ่ม", color: "bg-blue-50 text-blue-500" };
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get("/courses/my-courses");
        setCourses(res.data);
      } catch (err) {
        console.error("Fetch Courses Error:", err);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        if (videoInputs.length > 0) setSelectedDevice(videoInputs[0].deviceId);
      } catch (err) {
        console.error("Camera Error:", err);
      }
    };
    getDevices();
  }, []);

  // ── เลือกวิชา ───────────────────────────────────────────────────────────────
  const handleCourseChange = async (courseId) => {
    const course = courses.find((c) => c.id === parseInt(courseId));
    if (!course) return;

    setSelectedCourse(course);
    setSelectedSession(null);
    setSessions([]);
    setAllSessions([]);

    try {
      const res = await api.get(`/courses/${course.id}/sessions`);
      const sorted = res.data.sort((a, b) => a.id - b.id);
      setAllSessions(sorted);

      // ✅ แสดง ALL sessions ใน dropdown รวม completed เพื่อดูย้อนหลังได้
      setSessions(sorted);

      const todayStr = new Date().toISOString().split("T")[0];

      // Auto-select: active → pending วันนี้ → pending upcoming → pending แรก
      // ❌ ไม่ auto-select completed → ป้องกัน error "Session is not active"
      const activeSession = sorted.find(
        (s) => s.status === "active" || s.is_active,
      );
      const todayPending = sorted.find(
        (s) => s.date === todayStr && s.status === "pending",
      );
      const upcomingPending = sorted.find(
        (s) => s.date >= todayStr && s.status === "pending",
      );
      const firstPending = sorted.find((s) => s.status === "pending");

      if (activeSession) setSelectedSession(activeSession);
      else if (todayPending) setSelectedSession(todayPending);
      else if (upcomingPending) setSelectedSession(upcomingPending);
      else if (firstPending) setSelectedSession(firstPending);
      // ถ้าทุกคาบ completed หมดแล้ว → ไม่ auto-select ให้ user เลือกดูย้อนหลังเอง
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
      setSessions([]);
      setAllSessions([]);
    }
  };

  // ── กดปุ่ม Start / ดูย้อนหลัง ──────────────────────────────────────────────
  const handleStart = async () => {
    if (!selectedSession) {
      alert("กรุณาเลือกคาบเรียนก่อนครับ");
      return;
    }

    // ✅ ตรวจ status จาก object จริง ก่อนทำอะไรทุกครั้ง
    const currentStatus = getSessionStatus(selectedSession);

    // completed → ไปหน้าสรุปแทน ไม่ start ใหม่
    if (currentStatus === "completed") {
      navigate(`/teacher/session/${selectedSession.id}/summary`);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await api.post(
        `/sessions/${selectedSession.id}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      localStorage.setItem("active_session_id", selectedSession.id);
      window.dispatchEvent(new Event("storage"));

      navigate(`/teacher/session/${selectedSession.id}/live`, {
        state: { deviceId: selectedDevice, room: selectedRoom },
      });
    } catch (error) {
      console.error("Error starting session:", error);
      const httpStatus = error.response?.status;
      const detail = error.response?.data?.detail || "";

      if (httpStatus === 400) {
        // Session active อยู่แล้ว → เข้าห้องสดได้เลย
        localStorage.setItem("active_session_id", selectedSession.id);
        window.dispatchEvent(new Event("storage"));
        navigate(`/teacher/session/${selectedSession.id}/live`, {
          state: { deviceId: selectedDevice, room: selectedRoom },
        });
      } else if (detail.toLowerCase().includes("completed")) {
        // Backend บอกว่า completed → ไปหน้าสรุป
        navigate(`/teacher/session/${selectedSession.id}/summary`);
      } else {
        alert(`เกิดข้อผิดพลาด: ${detail || "ไม่สามารถเริ่มได้"}`);
      }
    }
  };

  const selectedStatus = selectedSession
    ? getSessionStatus(selectedSession)
    : null;
  const isCompleted = selectedStatus === "completed";
  const isActive = selectedStatus === "active";

  const getWeekNumber = (session) => {
    const idx = allSessions.findIndex((s) => s.id === session.id);
    return idx >= 0 ? idx + 1 : "?";
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-64 relative px-10 pt-10 pb-24">
          <div className="relative z-10 flex justify-between items-start text-white">
            <div>
              <h1 className="text-3xl font-bold mb-2">Device Setup</h1>
              <p className="opacity-80">
                Setting device and Select Room & Course
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4">
              <FiClock className="text-2xl" />
              <span className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Cards ── */}
        <div className="px-10 -mt-20 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 1. Course */}
            <div className="relative group h-full">
              <SelectionCard
                label="Course"
                value={
                  selectedCourse ? selectedCourse.course_code : "Select Course"
                }
                subValue={
                  selectedCourse ? selectedCourse.name : "Please select subject"
                }
                icon={<FiBook size={22} />}
                color="text-blue-600"
                bgColor="bg-blue-50"
                borderColor="hover:border-blue-400"
              />
              <select
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={(e) => handleCourseChange(e.target.value)}
                value={selectedCourse?.id || ""}
              >
                <option value="" disabled>
                  Select Course
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Session — แสดงทุก session รวม completed */}
            <div
              className={`relative group h-full ${!selectedCourse ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
            >
              <SelectionCard
                label="Session / Week"
                value={
                  selectedSession
                    ? `Week ${getWeekNumber(selectedSession)}`
                    : "Select Week"
                }
                subValue={
                  selectedSession
                    ? formatDate(selectedSession.date)
                    : "Waiting for course..."
                }
                icon={<FiCalendar size={22} />}
                color="text-indigo-600"
                bgColor="bg-indigo-50"
                borderColor="hover:border-indigo-400"
                badge={selectedStatus ? getStatusBadge(selectedStatus) : null}
              />
              <select
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                disabled={!selectedCourse}
                onChange={(e) => {
                  const s = sessions.find(
                    (x) => x.id === parseInt(e.target.value),
                  );
                  if (s) setSelectedSession(s);
                }}
                value={selectedSession?.id || ""}
              >
                <option value="" disabled>
                  Select Week
                </option>
                {sessions.map((s) => {
                  const st = getSessionStatus(s);
                  const wk = getWeekNumber(s);
                  const tag =
                    st === "active" ? " 🟢" : st === "completed" ? " ✓" : "";
                  return (
                    <option key={s.id} value={s.id}>
                      Week {wk} : {formatDate(s.date)}
                      {tag}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 3. Room */}
            <div className="relative group h-full">
              <SelectionCard
                label="Classroom"
                value={selectedRoom}
                subValue="On-site"
                icon={<FiMapPin size={22} />}
                color="text-pink-600"
                bgColor="bg-pink-50"
                borderColor="hover:border-pink-400"
              />
              <select
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={(e) => setSelectedRoom(e.target.value)}
                value={selectedRoom}
              >
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Camera */}
            <div className="relative group h-full">
              <SelectionCard
                label="Camera"
                value={
                  devices.find((d) => d.deviceId === selectedDevice)?.label ||
                  "Default Camera"
                }
                subValue={devices.length > 0 ? "Ready" : "Not Found"}
                icon={<FiMonitor size={22} />}
                color="text-orange-600"
                bgColor="bg-orange-50"
                borderColor="hover:border-orange-400"
              />
              <select
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={(e) => setSelectedDevice(e.target.value)}
                value={selectedDevice}
              >
                {devices.map((d, index) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Status Banners ── */}
          {isCompleted && (
            <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 px-5 py-4 rounded-2xl">
              <FiAlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">คาบนี้ปิดแล้ว</p>
                <p className="text-xs opacity-80">
                  กดปุ่มด้านล่างเพื่อดูผลเช็คชื่อย้อนหลัง
                </p>
              </div>
            </div>
          )}

          {isActive && (
            <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-2xl">
              <FiCheckCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">คาบนี้กำลังเปิดอยู่</p>
                <p className="text-xs opacity-80">
                  กดปุ่มด้านล่างเพื่อเข้าห้องสดต่อ
                </p>
              </div>
            </div>
          )}

          {/* ── Action Button ── */}
          <button
            onClick={handleStart}
            disabled={!selectedSession}
            className={`w-full p-8 rounded-[40px] font-black text-2xl shadow-xl transition-all flex items-center justify-center gap-4 disabled:grayscale disabled:opacity-50 mb-8
              ${
                isCompleted
                  ? "bg-gray-700 text-white hover:bg-gray-800 shadow-gray-900/10"
                  : "bg-white text-blue-700 hover:scale-[1.02] active:scale-95 shadow-blue-900/10"
              }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg
                ${
                  isCompleted
                    ? "bg-white text-gray-700 shadow-gray-200"
                    : "bg-blue-700 text-white shadow-blue-200"
                }`}
            >
              {isCompleted ? (
                <FiCheckCircle fill="currentColor" />
              ) : (
                <FiPlay fill="currentColor" />
              )}
            </div>
            {isCompleted
              ? "ดูผลเช็คชื่อย้อนหลัง"
              : isActive
                ? "เข้าห้องสดต่อ"
                : "START ATTENDANCE SYSTEM"}
          </button>
        </div>
      </main>
    </div>
  );
};

// ── SelectionCard component ────────────────────────────────────────────────────
const SelectionCard = ({
  label,
  value,
  subValue,
  icon,
  color,
  bgColor,
  borderColor,
  badge,
}) => (
  <div
    className={`group relative p-6 rounded-3xl border border-gray-100 bg-white transition-all ${borderColor} border-l-4 border-l-transparent hover:border-l-current shadow-sm h-full flex flex-col justify-center`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 w-full">
        <div
          className={`w-14 h-14 rounded-2xl ${bgColor} ${color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm`}
        >
          {icon}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {label}
            </span>
            {badge && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          <span className="font-bold text-gray-800 text-lg truncate">
            {value}
          </span>
          <span className="text-sm text-gray-500 font-medium truncate">
            {subValue}
          </span>
        </div>
      </div>
      <div className="text-gray-300 group-hover:text-gray-500 transition-colors ml-2">
        <FiChevronDown size={24} />
      </div>
    </div>
  </div>
);

export default DeviceSetup;
