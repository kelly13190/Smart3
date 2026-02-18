// src/pages/teacher/TeacherDashboard.jsx
import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import {
  FiUsers,
  FiBook,
  FiClock,
  FiCalendar,
  FiMoreVertical,
} from "react-icons/fi";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  // --- 1. State สำหรับเก็บข้อมูล ---
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0, // รอ API นักเรียน
  });

  // --- 2. useEffect ดึงข้อมูลเมื่อโหลดหน้าเว็บ ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ยิง API ไปที่ /courses/ (ตามที่ Backend ตั้งไว้)
        const coursesRes = await api.get("/courses/");

        // อัปเดตตัวเลขจำนวนวิชา
        setStats((prev) => ({
          ...prev,
          totalCourses: coursesRes.data.length,
        }));
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };
    fetchData();
  }, []);

  // --- 3. Logic ส่วน Date Picker (ของเดิม) ---
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateDisplay = (date) => {
    return {
      day: date.getDate(),
      monthYear: date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    };
  };

  const { day, monthYear, weekday } = formatDateDisplay(selectedDate);

  const handleDateChange = (e) => {
    if (e.target.value) setSelectedDate(new Date(e.target.value));
  };

  const dateValue = selectedDate.toISOString().split("T")[0];

  // --- 4. ส่วนแสดงผล (JSX) ---
  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header Background */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-64 relative px-10 pt-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Teacher Dashboard
              </h1>
              <p className="text-blue-100 text-sm">
                Overview of your courses and students
              </p>
            </div>

            {/* Date Picker Widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white flex items-center gap-4 shadow-lg">
              <div className="text-center px-4 border-r border-white/20">
                <span className="block text-3xl font-bold">{day}</span>
                <span className="text-xs uppercase tracking-wider opacity-80">
                  {weekday.substr(0, 3)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{monthYear}</p>
                <p className="text-xs opacity-75">{weekday}</p>
              </div>
              <div className="relative ml-2">
                <input
                  type="date"
                  value={dateValue}
                  onChange={handleDateChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors cursor-pointer">
                  <FiCalendar size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Cards Section --- */}
        <div className="px-10 -mt-24 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Total Courses (Dynamic Data) */}
          <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-xl bg-gradient-to-br from-blue-400 to-indigo-400 transition-transform hover:scale-[1.02] duration-300 min-h-[160px]">
            <FiBook className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-20 transform rotate-12" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 opacity-90">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FiBook size={18} />
                  </div>
                  <span className="font-bold text-sm tracking-wide uppercase">
                    Total Courses
                  </span>
                </div>
                <h2 className="text-5xl font-extrabold tracking-tight">
                  {stats.totalCourses}
                </h2>
                <p className="text-white/80 text-sm mt-1 font-medium">
                  Active courses this term
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Total Students (Static Mockup) */}
          <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-xl bg-gradient-to-br from-emerald-400 to-teal-400 transition-transform hover:scale-[1.02] duration-300 min-h-[160px]">
            <FiUsers className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-20 transform rotate-12" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 opacity-90">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FiUsers size={18} />
                  </div>
                  <span className="font-bold text-sm tracking-wide uppercase">
                    Total Students
                  </span>
                </div>
                <h2 className="text-5xl font-extrabold tracking-tight">32</h2>
                <p className="text-white/80 text-sm mt-1 font-medium">
                  Enrolled students
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Attendance Rate (Static Mockup) */}
          <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-xl bg-gradient-to-br from-amber-400 to-orange-400 transition-transform hover:scale-[1.02] duration-300 min-h-[160px]">
            <FiClock className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-20 transform rotate-12" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 opacity-90">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FiClock size={18} />
                  </div>
                  <span className="font-bold text-sm tracking-wide uppercase">
                    Avg. Attendance
                  </span>
                </div>
                <h2 className="text-5xl font-extrabold tracking-tight">95%</h2>
                <p className="text-white/80 text-sm mt-1 font-medium">
                  Overall attendance rate
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- Recent Activity / Placeholders --- */}
        <div className="px-10 mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                Recent Activity
              </h3>
              <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <FiMoreVertical />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
              <p>No recent activities found.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
