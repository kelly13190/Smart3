import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import {
  FiSettings,
  FiSearch,
  FiEdit3,
  FiClock,
  FiUsers,
} from "react-icons/fi";

const CourseSettings = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:8000/courses/my-courses",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setCourses(response.data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-64 relative px-10 pt-10 pb-24">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <FiSettings
                  className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"
                  size={36}
                />
                Course Settings
              </h1>
              <p className="text-blue-100 opacity-90 pl-1">
                Manage your {courses.length} courses and view enrolled students.
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
        </div>

        {/* Floating Content Container */}
        <div className="px-10 -mt-20 pb-10 relative z-20">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[600px] flex flex-col">

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h2 className="text-xl font-bold text-gray-800">
                All Courses Configuration
              </h2>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative group flex-1 md:flex-none">
                  <FiSearch className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    type="text"
                    placeholder="Search by code or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 transition-all text-sm font-medium outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-64 text-gray-400 font-medium">
                  Loading courses...
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="flex justify-center items-center h-64 text-gray-400 font-medium">
                  No courses found.
                </div>
              ) : (
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-4 pl-4">Course Name</th>
                      <th className="pb-4">Class Period</th>
                      <th className="pb-4 text-center">Semester</th>
                      <th className="pb-4 text-center">Status</th>
                      <th className="pb-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredCourses.map((course) => (
                      <tr
                        key={course.id}
                        className="border-b border-gray-50 hover:bg-gray-50/80 transition h-20"
                      >
                        <td className="pl-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-base">
                              {course.name}
                            </span>
                            <span className="text-xs font-semibold text-blue-500 bg-blue-50 w-max px-2 py-0.5 rounded mt-1">
                              {course.course_code} (Sec {course.section})
                            </span>
                          </div>
                        </td>
                        <td className="text-gray-500 font-medium">
                          <div className="flex items-center gap-2">
                            <FiClock className="text-gray-400" />
                            {course.day_of_week}{" "}
                            {course.start_time.substring(0, 5)}-
                            {course.end_time.substring(0, 5)}
                          </div>
                        </td>
                        <td className="text-center font-bold text-gray-600">
                          {course.semester}/{course.academic_year}
                        </td>
                        <td className="text-center">
                          <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
                            Active
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                navigate(
                                  `/teacher/course/${course.id}/students`,
                                )
                              }
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="View Enrolled Students"
                            >
                              <FiUsers size={18} />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <FiEdit3 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseSettings;
