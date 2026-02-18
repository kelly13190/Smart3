import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import {
  FiPlusCircle,
  FiSearch,
  FiBookOpen,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
} from "react-icons/fi";

const StudentEnroll = () => {
  const navigate = useNavigate();
  const [courseCode, setCourseCode] = useState("");
  const [courseInfo, setCourseInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 1. ฟังก์ชันค้นหาววชาจากรหัส (Preview ก่อน Enroll)
  const handleSearchCourse = async () => {
    if (!courseCode) return;
    setLoading(true);
    setError("");
    setCourseInfo(null);

    try {
      const token = localStorage.getItem("token");
      // เรียก API เพื่อดูว่ารหัสนี้คือวิชาอะไร (ต้องสร้าง Endpoint นี้เพิ่มที่ Backend)
      const response = await axios.get(
        `http://localhost:8000/courses/search/${courseCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCourseInfo(response.data);
    } catch (err) {
      setError("Course not found. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  // 2. ฟังก์ชันยืนยันการ Enroll
  const handleEnroll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/courses/enroll",
        { course_code: courseCode },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccess(true);
      setTimeout(() => navigate("/student/dashboard"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header ส่วนบนสไตล์เดิม */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-64 relative px-10 pt-10">
          <div className="relative z-10 text-white">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <FiPlusCircle size={32} /> Join New Course
            </h1>
            <p className="text-indigo-100 opacity-90">
              Enter the course code provided by your instructor.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </div>

        {/* Card สำหรับกรอกรหัส */}
        <div className="px-10 -mt-20 pb-10 relative z-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="mb-8 text-center">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FiSearch size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Ready to learn?
                </h2>
                <p className="text-gray-500">
                  Search for your subject to register
                </p>
              </div>

              {/* Input Group */}
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Enter Course Code (e.g. CS101)"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-xl uppercase tracking-widest text-gray-700"
                />
                <button
                  onClick={handleSearchCourse}
                  disabled={loading || !courseCode}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  Search
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl mb-6">
                  <FiAlertCircle />{" "}
                  <span className="font-semibold text-sm">{error}</span>
                </div>
              )}

              {/* Course Preview & Enroll Button */}
              {courseInfo && !success && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-dashed border-indigo-200 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                        Subject Found
                      </span>
                      <h3 className="text-xl font-bold text-gray-800">
                        {courseInfo.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Section {courseInfo.section} • {courseInfo.day_of_week}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase">
                        Instructor
                      </p>
                      <p className="font-semibold text-gray-700">
                        {courseInfo.teacher_name}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleEnroll}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-100 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                  >
                    Confirm Enrollment <FiArrowRight />
                  </button>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="text-center py-6 animate-bounce">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Successfully Enrolled!
                  </h3>
                  <p className="text-gray-500">
                    Redirecting to your dashboard...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentEnroll;
