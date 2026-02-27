import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import {
  FiSearch,
  FiDownload,
  FiFilter,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiMoreHorizontal,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiChevronDown,
} from "react-icons/fi";

const AttendanceReport = () => {
  const [loading, setLoading] = useState(true);

  // --- 1. State ทั้งหมด ---
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("id");

  // --- 2. Step 1: โหลดรายชื่อวิชาทั้งหมด ---
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:8000/courses/my-courses",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setCourses(res.data);
        if (res.data.length > 0) setSelectedCourse(res.data[0]);
      } catch (err) {
        console.error("Error fetching courses", err);
      }
    };
    fetchCourses();
  }, []);

  // --- 3. Step 2: โหลดคาบเรียน (Sessions 1-15) เมื่อเปลี่ยนวิชา ---
  useEffect(() => {
    if (!selectedCourse) return;
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:8000/courses/${selectedCourse.id}/sessions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setSessions(res.data);
        if (res.data.length > 0) setSelectedSession(res.data[0]);
      } catch (err) {
        console.error("Error fetching sessions", err);
      }
    };
    fetchSessions();
  }, [selectedCourse]);

  // --- 4. Step 3: โหลดรายชื่อนักเรียน (Report) เมื่อเปลี่ยนคาบเรียน ---
  useEffect(() => {
    if (!selectedSession) {
      setRecords([]);
      setLoading(false);
      return;
    }
    const fetchReport = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:8000/attendance/report/${selectedSession.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setRecords(res.data);
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedSession]);

  // --- 5. Logic การค้นหาและเรียงลำดับ ---
  const filteredAndSortedRecords = records
    .filter((record) => {
      const matchSearch =
        (record.name &&
          record.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.studentId &&
          record.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "status")
        return (a.status || "").localeCompare(b.status || "");
      return (a.studentId || "").localeCompare(b.studentId || "");
    });

  // --- 6. ฟังก์ชัน Export CSV ---
  const exportToCSV = () => {
    if (filteredAndSortedRecords.length === 0)
      return alert("No data to export");
    let csvContent = "Student ID,Name,Time,Status,Point\n";
    filteredAndSortedRecords.forEach((row) => {
      csvContent += `${row.studentId},${row.name},${row.time},${row.status},${row.point}\n`;
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-64 relative px-10 pt-10 pb-24">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FiFileText
                className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"
                size={36}
              />
              Attendance Report
            </h1>
            <p className="text-blue-100 opacity-90 pl-1">
              View and export detailed student attendance records.
            </p>
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-blue-500/30 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Content Container */}
        <div className="px-10 -mt-20 pb-10 relative z-20">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[600px] flex flex-col">
            {/* --- Toolbar: แถวเดียว --- */}
            <div className="flex items-center gap-3 mb-3 pb-6 border-b border-gray-100 flex-wrap">

              {/* Select Class */}
              <div className="relative">
                <select
                  className="appearance-none h-[42px] bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold pl-3 pr-9 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer transition-all min-w-[200px]"
                  value={selectedCourse?.id || ""}
                  onChange={(e) => {
                    const course = courses.find(
                      (c) => c.id === parseInt(e.target.value),
                    );
                    setSelectedCourse(course);
                  }}
                >
                  {courses.length === 0 && <option>Loading courses...</option>}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_code} — {course.name}
                    </option>
                  ))}
                </select>
                <FiChevronDown
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Select Week */}
              <div className="relative">
                <select
                  className="appearance-none h-[42px] bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold pl-3 pr-9 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer transition-all min-w-[160px]"
                  value={selectedSession?.id || ""}
                  onChange={(e) => {
                    const session = sessions.find(
                      (s) => s.id === parseInt(e.target.value),
                    );
                    setSelectedSession(session);
                  }}
                >
                  {sessions.length === 0 && <option>No sessions...</option>}
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      Week {session.week_number} ({session.date})
                    </option>
                  ))}
                </select>
                <FiChevronDown
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Time Info Chip */}
              {selectedCourse && (
                <div className="h-[42px] flex items-center gap-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium whitespace-nowrap">
                  <FiClock size={14} className="text-gray-400" />
                  {selectedCourse.day_of_week} · {selectedCourse.start_time?.substring(0, 5)}–{selectedCourse.end_time?.substring(0, 5)}
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Search */}
              <div className="relative group">
                <FiSearch className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[42px] w-52 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all text-sm font-medium outline-none"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none h-[42px] bg-gray-50 hover:bg-gray-100 text-gray-600 pl-3 pr-9 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 text-sm font-medium cursor-pointer transition-colors"
                >
                  <option value="id">Sort: ID</option>
                  <option value="name">Sort: Name</option>
                  <option value="status">Sort: Status</option>
                </select>
                <FiFilter
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                  size={14}
                />
              </div>

              {/* Export */}
              <button
                onClick={exportToCSV}
                className="h-[42px] flex items-center gap-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200 transition-all font-bold text-sm"
              >
                <FiDownload size={16} /> Export CSV
              </button>
            </div>

            {/* Table Section (เหมือนเดิม) */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-4 pl-4 w-16">#</th>
                    <th className="pb-4">Student Name</th>
                    <th className="pb-4">ID Number</th>
                    <th className="pb-4 text-center">Check-in Time</th>
                    <th className="pb-4">Email</th>
                    <th className="pb-4 text-center">Point</th>
                    <th className="pb-4 text-center">Status</th>
                    <th className="pb-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredAndSortedRecords.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-50 hover:bg-gray-50/80 transition h-16 group"
                    >
                      <td className="pl-4 text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {item.name.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-700">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-gray-500 font-mono">
                        {item.studentId}
                      </td>
                      <td className="text-center font-medium text-gray-700">
                        {item.time === "-" ? (
                          <span className="text-gray-300">-</span>
                        ) : (
                          item.time
                        )}
                      </td>
                      <td className="text-gray-500">{item.email}</td>
                      <td className="text-center font-bold text-gray-700">
                        {item.point}
                      </td>
                      <td className="text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(item.status)}`}
                        >
                          {item.status === "Present" && (
                            <FiCheckCircle className="mr-1" />
                          )}
                          {item.status === "Late" && (
                            <FiClock className="mr-1" />
                          )}
                          {item.status === "Absent" && (
                            <FiXCircle className="mr-1" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <button className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                          <FiEdit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination (เหมือนเดิม) */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
              <span className="text-sm text-gray-400">
                Total {records.length} students in this class
              </span>
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 disabled:opacity-50">
                  <FiChevronLeft />
                </button>
                <div className="flex items-center justify-center w-9 h-9 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-200 text-sm font-bold">
                  1
                </div>
                <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                  2
                </button>
                <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AttendanceReport;
