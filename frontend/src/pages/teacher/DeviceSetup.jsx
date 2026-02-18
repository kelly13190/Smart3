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
} from "react-icons/fi";

const DeviceSetup = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [rooms] = useState(["M22", "CB2301", "LX1102", "SIT-Train-1"]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState("M22");
  const [selectedDevice, setSelectedDevice] = useState("");

  // --- Helper: แปลงวันที่จาก String (YYYY-MM-DD) เป็นไทย ---
  const formatDate = (dateString) => {
    if (!dateString) return "ไม่ระบุวันที่";
    // แก้ปัญหาเรื่อง Timezone โดยการระบุเวลาเที่ยงวัน
    const date = new Date(dateString + "T12:00:00");

    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  };

  // --- 1. Clock ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. Fetch Courses (ใช้ API เดิมของคุณที่มีอยู่แล้ว) ---
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

  // --- 3. Get Cameras ---
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

  // --- Logic การเลือก ---
  const handleCourseChange = async (courseId) => {
    const course = courses.find((c) => c.id === parseInt(courseId));
    if (!course) return;

    setSelectedCourse(course);
    setSelectedSession(null);

    try {
      const res = await api.get(`/courses/${course.id}/sessions`);
      // เรียงตาม Week Number หรือ ID
      const sortedSessions = res.data.sort((a, b) => a.id - b.id);
      setSessions(sortedSessions);

      // Auto-Select: หาวันนี้ โดยเทียบ String "YYYY-MM-DD" ตรงๆ
      const todayStr = new Date().toISOString().split("T")[0]; // ได้ค่า "2024-02-16"

      const todaySession = sortedSessions.find((s) => s.date === todayStr);

      // ถ้าเจอวันนี้เลือกเลย / ถ้าไม่เจอให้หาอันที่ใกล้วันนี้ที่สุดที่ยังไม่ผ่านไป
      if (todaySession) {
        setSelectedSession(todaySession);
      } else {
        const upcoming = sortedSessions.find((s) => s.date >= todayStr);
        if (upcoming) setSelectedSession(upcoming);
        else if (sortedSessions.length > 0)
          setSelectedSession(sortedSessions[0]);
      }
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
      setSessions([]);
    }
  };

  const handleStartClass = async () => {
    if (!selectedSession || !selectedCourse) {
      return alert("กรุณาเลือกวิชาและคาบเรียนก่อนครับ");
    }

    try {
      setLoading(true);

      // 1. ยิง API บอก Backend ว่า "เริ่มสอนแล้วนะ"
      await api.post(`/sessions/${selectedSession.id}/start`);

      // 2. บันทึก State ลง LocalStorage ให้ Sidebar ทำงาน
      localStorage.setItem("active_session_id", selectedSession.id);
      window.dispatchEvent(new Event("storage")); // กระตุ้น Sidebar

      // 3. ไปหน้า Live พร้อมส่งข้อมูล (Course Name, Session ID) ไปด้วย
      navigate(`/teacher/session/${selectedSession.id}/live`, {
        state: {
          courseName: selectedCourse.name, // ชื่อวิชา
          courseCode: selectedCourse.course_code, // รหัสวิชา
          sessionDate: selectedSession.date, // วันที่สอน
          deviceId: config.device, // กล้องที่เลือก
        },
      });
    } catch (err) {
      console.error("Start Error:", err);
      // ถ้า Error เพราะมี Session ค้างอยู่ ให้แจ้งเตือน
      alert(err.response?.data?.detail || "เกิดข้อผิดพลาดในการเริ่มคลาส");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-64 relative px-10 pt-10 pb-24">
          <div className="relative z-10 flex justify-between items-start text-white">
            <div>
              <h1 className="text-3xl font-bold mb-2">Device Setup</h1>
              <p className="opacity-80">
                Setting device and Select Room&Course{" "}
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

        <div className="px-10 -mt-20 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

            {/* 2. Session (แก้ให้ใช้ s.date) */}
            <div
              className={`relative group h-full ${!selectedCourse ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
            >
              <SelectionCard
                label="Session / Week"
                value={
                  selectedSession
                    ? `Week ${sessions.indexOf(selectedSession) + 1}`
                    : "Select Week"
                }
                // ✅ ใช้ s.date ในการแสดงผล
                subValue={
                  selectedSession
                    ? formatDate(selectedSession.date)
                    : "Waiting for course..."
                }
                icon={<FiCalendar size={22} />}
                color="text-indigo-600"
                bgColor="bg-indigo-50"
                borderColor="hover:border-indigo-400"
              />
              <select
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                disabled={!selectedCourse}
                onChange={(e) => {
                  const s = sessions.find(
                    (x) => x.id === parseInt(e.target.value),
                  );
                  setSelectedSession(s);
                }}
                value={selectedSession?.id || ""}
              >
                <option value="" disabled>
                  Select Week
                </option>
                {sessions.map((s, index) => (
                  <option key={s.id} value={s.id}>
                    {/* ✅ ใช้ s.date ใน Dropdown */}
                    Week {index + 1} : {formatDate(s.date)}
                  </option>
                ))}
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

          <button
            onClick={() => {
              if (selectedSession) {
                localStorage.setItem("active_session_id", selectedSession.id);

                window.dispatchEvent(new Event("storage"));

                navigate(`/teacher/session/${selectedSession.id}/live`, {
                  state: { deviceId: selectedDevice, room: selectedRoom },
                });
              }
            }}
            disabled={!selectedSession}
            className="w-full bg-white text-blue-700 p-8 rounded-[40px] font-black text-2xl shadow-xl shadow-blue-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:grayscale disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
              <FiPlay fill="currentColor" />
            </div>
            START ATTENDANCE SYSTEM
          </button>
        </div>
      </main>
    </div>
  );
};

const SelectionCard = ({
  label,
  value,
  subValue,
  icon,
  color,
  bgColor,
  borderColor,
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
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            {label}
          </span>
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
