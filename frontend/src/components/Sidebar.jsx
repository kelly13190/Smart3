// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react"; // ✅ เพิ่ม useState, useEffect
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiHome,
  FiBook,
  FiFileText,
  FiMonitor,
  FiLogOut,
  FiCamera,
  FiPieChart,
  FiServer,
  FiSettings,
  FiShield,
  FiPlusSquare,
  FiActivity, // ✅ เพิ่มไอคอนสำหรับ Live Session
} from "react-icons/fi";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ป้องกัน Error ถ้าไม่มีข้อมูลใน localStorage
  const userName = localStorage.getItem("user_name") || "Guest";
  const role = localStorage.getItem("role") || "student";

  // ✅ 1. เพิ่ม State เพื่อเช็คว่ามี Live Session ค้างอยู่ไหม
  const [activeSessionId, setActiveSessionId] = useState(null);

  // ✅ 2. เพิ่ม useEffect เช็ค localStorage ทุกครั้งที่เปลี่ยนหน้า
  useEffect(() => {
    const checkSession = () => {
      const storedSession = localStorage.getItem("active_session_id");
      setActiveSessionId(storedSession); // อัปเดต State
    };

    // เช็คครั้งแรก
    checkSession();

    // ✅ เพิ่มตัวฟังเหตุการณ์: ถ้ามีการเซฟ storage (จากหน้า DeviceSetup) ให้ทำทันที
    window.addEventListener("storage", checkSession);

    return () => {
      window.removeEventListener("storage", checkSession);
    };
  }, [location]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // --- เมนูเดิมของคุณ (ไม่แตะต้อง) ---
  const getMenuItems = () => {
    if (role === "admin") {
      return [
        { icon: <FiServer />, label: "Console", path: "/admin/dashboard" },
        {
          icon: <FiShield />,
          label: "User Management",
          path: "/admin/user-management",
        },
        {
          icon: <FiSettings />,
          label: "System Settings",
          path: "/admin/system-settings",
        },
        {
          icon: <FiFileText />,
          label: "Student Attendance History",
          path: "/admin/student-attendance-history",
        },
        {
          icon: <FiMonitor />,
          label: "Real Time Report",
          path: "/admin/realtime-report",
        },
        {
          icon: <FiPlusSquare />,
          label: "Join Course",
          path: "/student/enroll",
        },
      ];
    }

    if (role === "teacher" || role === "admin") {
      return [
        {
          icon: <FiMonitor />,
          label: "Start Session",
          path: "/teacher/device-setup",
        },
        { icon: <FiHome />, label: "Dashboard", path: "/teacher/dashboard" },
        {
          icon: <FiBook />,
          label: "Create Course",
          path: "/teacher/create-course",
        },
        {
          icon: <FiBook />,
          label: "Course Settings",
          path: "/teacher/course-settings",
        },
        {
          icon: <FiFileText />,
          label: "Attendance Report",
          path: "/teacher/attendance-report",
        },
        {
          icon: <FiFileText />,
          label: "Reports",
          path: "/teacher/reports",
        },
      ];
    } else {
      // Student
      return [
        { icon: <FiHome />, label: "Dashboard", path: "/student/dashboard" },
        {
          icon: <FiCamera />,
          label: "Face Register",
          path: "/student/register-face",
        },
        {
          icon: <FiPlusSquare />,
          label: "Join Course",
          path: "/student/enroll",
        },
        {
          icon: <FiPieChart />,
          label: "Attendance Report",
          path: "/student/stu-attendance",
        },
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between h-screen sticky top-0 font-sans">
      <div>
        <div className="p-8">
          <h1 className="text-xl font-bold text-blue-600">
            Smart <span className="text-black">Attendance</span>
          </h1>
        </div>

        {/* ✅ 3. แทรกปุ่ม Live Session ตรงนี้ (จะแสดงเฉพาะตอนมี session ค้าง) */}
        {activeSessionId && (
          <div className="px-4 mb-4">
            <div
              onClick={() =>
                navigate(`/teacher/session/${activeSessionId}/live`)
              }
              className="bg-red-50 border border-red-100 p-3 rounded-xl cursor-pointer hover:bg-red-100 transition-all flex items-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-200 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative z-10 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
              <div className="relative z-10 flex-1">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
                  Live Session
                </p>
                <p className="text-[10px] text-red-400 font-medium">
                  Click to return
                </p>
              </div>
              <FiActivity className="relative z-10 ml-auto text-red-500 animate-pulse" />
            </div>
          </div>
        )}

        <nav className="mt-4 px-4 space-y-2">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <div
                key={index}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && <span className="ml-auto text-xs">›</span>}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-gray-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-800 truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 font-semibold px-2 py-2 rounded-lg hover:bg-red-50 transition w-full"
        >
          <FiLogOut /> Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
