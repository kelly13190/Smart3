// แก้ไขไฟล์ CreateCourse.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import {
  FiSave,
  FiX,
  FiBook,
  FiType,
  FiAlignLeft,
  FiClock,
  FiCalendar,
  FiCheck,
} from "react-icons/fi";

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const daysOptions = [
    { label: "Mo", value: "Monday" },
    { label: "Tu", value: "Tuesday" },
    { label: "We", value: "Wednesday" },
    { label: "Th", value: "Thursday" },
    { label: "Fr", value: "Friday" },
    { label: "Sa", value: "Saturday" },
    { label: "Su", value: "Sunday" },
  ];

  const [formData, setFormData] = useState({
    course_code: "",
    section: "",
    name: "",
    semester: "1",
    academic_year: currentYear.toString(),
    day_of_week: "Monday",
    start_time: "09:00",
    end_time: "12:00",
    start_date: new Date().toISOString().split("T")[0], // ✅ เพิ่มช่องวันที่เริ่มเรียน
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDaySelect = (dayValue) => {
    setFormData({ ...formData, day_of_week: dayValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      // ส่ง formData ไปที่ API (ตอนนี้มี start_date ตามที่ Backend ต้องการแล้ว )
      await axios.post("http://localhost:8000/courses/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + (error.response?.data?.detail || "Unknown Error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-64 relative px-10 pt-10">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Create New Course
              </h1>
              <p className="text-blue-100 opacity-90">
                Setup your class schedule and 15-week sessions.
              </p>
            </div>
            <button
              onClick={() => navigate("/teacher/dashboard")}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg backdrop-blur-sm transition"
            >
              <FiX size={24} />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </div>

        <div className="px-10 -mt-16 pb-10 relative z-20">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FiBook />
                    </span>
                    Course Information
                  </h3>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div className="md:col-span-1">
                        <label className="text-sm font-semibold text-gray-600 mb-1.5 block">
                          Code
                        </label>
                        <input
                          type="text"
                          name="course_code"
                          required
                          placeholder="CS101"
                          value={formData.course_code}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-gray-700"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-sm font-semibold text-gray-600 mb-1.5 block">
                          Section
                        </label>
                        <input
                          type="text"
                          name="section"
                          required
                          placeholder="1"
                          value={formData.section}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-gray-700 text-center"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-gray-600 mb-1.5 block">
                          Course Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          placeholder="Introduction to Computer Science"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                      <FiCalendar />
                    </span>
                    Term & Start Date
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Semester
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["1", "2", "Summer"].map((sem) => (
                          <div
                            key={sem}
                            onClick={() =>
                              setFormData({ ...formData, semester: sem })
                            }
                            className={`cursor-pointer rounded-lg py-2 text-center text-sm font-semibold transition-all border ${formData.semester === sem ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-500 border-gray-200"}`}
                          >
                            {sem}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* ✅ เพิ่มส่วนเลือก Start Date เพื่อใช้ใน Loop 15 สัปดาห์ */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Start Date (First Class)
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl font-semibold text-gray-700 focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <FiClock />
                    </span>
                    Schedule
                  </h3>
                  <div className="mb-6">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                      Class Day
                    </label>
                    <div className="flex justify-between">
                      {daysOptions.map((day) => (
                        <button
                          type="button"
                          key={day.value}
                          onClick={() => handleDaySelect(day.value)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${formData.day_of_week === day.value ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Start Time
                      </label>
                      <input
                        type="time"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border border-transparent focus:border-orange-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        End Time
                      </label>
                      <input
                        type="time"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border border-transparent focus:border-orange-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4 pb-10">
              <button
                type="button"
                onClick={() => navigate("/teacher/dashboard")}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg transform hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                {loading ? (
                  "Creating Sessions..."
                ) : (
                  <>
                    <FiCheck size={20} /> Create Course & 15 Sessions
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateCourse;
