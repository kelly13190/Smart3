import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import Sidebar from "../../components/Sidebar";
import {
  FiSettings,
  FiSearch,
  FiEdit3,
  FiClock,
  FiX,
  FiCheck,
  FiTrash2,
  FiAlertCircle,
  FiStar,
  FiPercent,
} from "react-icons/fi";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function CourseSettings() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editCourse, setEditCourse] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchCourses = () => {
    setLoading(true);
    api
      .get("/courses/my-courses")
      .then((r) => setCourses(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.course_code.toLowerCase().includes(search.toLowerCase()),
  );

  const openEdit = (course) => {
    setEditCourse(course);
    setEditData({
      name: course.name,
      section: course.section,
      day_of_week: course.day_of_week,
      start_time: course.start_time?.substring(0, 5) || "09:00",
      end_time: course.end_time?.substring(0, 5) || "12:00",
      late_after_minutes: course.late_after_minutes ?? 15,
      absent_after_minutes: course.absent_after_minutes ?? 60,
      use_scoring: course.use_scoring ?? true,
      score_present: course.score_present ?? 1.0,
      score_late: course.score_late ?? 0.5,
      attendance_threshold: course.attendance_threshold ?? 80,
    });
  };

  const isTimingValid =
    (editData.absent_after_minutes || 0) > (editData.late_after_minutes || 0);

  const handleSave = async () => {
    if (!isTimingValid) return;
    setSaving(true);
    try {
      await api.patch(`/courses/${editCourse.id}`, editData);
      fetchCourses();
      setEditCourse(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courseId) => {
    try {
      await api.delete(`/courses/${courseId}`);
      fetchCourses();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete");
    }
  };

  const ed = editData;
  const setEd = (k, v) => setEditData((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-64 relative px-10 pt-10 pb-24">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FiSettings className="bg-white/20 p-1.5 rounded-lg" size={36} />
              Course Settings
            </h1>
            <p className="text-blue-100 opacity-80">
              Manage courses, schedules, timing thresholds, and scoring
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        </div>

        <div className="px-10 -mt-20 pb-10 relative z-20">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[600px] flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                All Courses ({filtered.length})
              </h2>
              <div className="relative">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium w-60 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 font-medium">
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 font-medium">
                No courses found
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-4 pl-4">Course</th>
                      <th className="pb-4">Schedule</th>
                      <th className="pb-4 text-center">Semester</th>
                      <th className="pb-4 text-center">Late After</th>
                      <th className="pb-4 text-center">Absent After</th>
                      <th className="pb-4 text-center">Scoring</th>
                      <th className="pb-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((course) => (
                      <tr
                        key={course.id}
                        className="border-b border-gray-50 hover:bg-gray-50/80 transition h-20"
                      >
                        <td className="pl-4">
                          <p className="font-bold text-gray-800">
                            {course.name}
                          </p>
                          <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded mt-0.5 inline-block">
                            {course.course_code} · Sec {course.section}
                          </span>
                        </td>
                        <td className="text-gray-500 font-medium">
                          <div className="flex items-center gap-2 text-sm">
                            <FiClock size={13} className="text-gray-400" />
                            {course.day_of_week}{" "}
                            {course.start_time?.substring(0, 5)}–
                            {course.end_time?.substring(0, 5)}
                          </div>
                        </td>
                        <td className="text-center text-gray-600 font-bold text-sm">
                          {course.semester}/{course.academic_year}
                        </td>
                        <td className="text-center">
                          <span className="bg-orange-50 text-orange-600 font-bold px-3 py-1 rounded-lg text-sm">
                            +{course.late_after_minutes ?? 15} min
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="bg-rose-50 text-rose-600 font-bold px-3 py-1 rounded-lg text-sm">
                            +{course.absent_after_minutes ?? 60} min
                          </span>
                        </td>
                        <td className="text-center">
                          {course.use_scoring ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded text-xs">
                                P: {course.score_present}pt
                              </span>
                              <span className="bg-orange-50 text-orange-500 font-bold px-2 py-0.5 rounded text-xs">
                                L: {course.score_late}pt
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs font-semibold bg-gray-100 px-2 py-1 rounded">
                              No scoring
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(course)}
                              className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                              title="Edit"
                            >
                              <FiEdit3 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(course)}
                              className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition"
                              title="Delete"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Edit Modal ── */}
      {editCourse && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Edit Course</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editCourse.course_code} · {editCourse.name}
                </p>
              </div>
              <button
                onClick={() => setEditCourse(null)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Name & Section */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="field-label">Course Name</label>
                  <input
                    className="field-input"
                    value={ed.name || ""}
                    onChange={(e) => setEd("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Section</label>
                  <input
                    className="field-input"
                    value={ed.section || ""}
                    onChange={(e) => setEd("section", e.target.value)}
                  />
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="field-label">Teaching Day</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setEd("day_of_week", d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        ed.day_of_week === d
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {d.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Start Time</label>
                  <input
                    type="time"
                    className="field-input"
                    value={ed.start_time || ""}
                    onChange={(e) => setEd("start_time", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">End Time</label>
                  <input
                    type="time"
                    className="field-input"
                    value={ed.end_time || ""}
                    onChange={(e) => setEd("end_time", e.target.value)}
                  />
                </div>
              </div>

              {/* ── Attendance Timing ── */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                  <FiClock size={14} className="text-teal-500" /> Attendance
                  Timing
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Counted from the moment <strong>Start Session</strong> is
                  pressed — not scheduled class time
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <label className="field-label text-orange-600">
                      Late After (minutes)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        className="field-input text-center font-black text-lg"
                        value={ed.late_after_minutes ?? 15}
                        onChange={(e) =>
                          setEd(
                            "late_after_minutes",
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-orange-400 mt-1 font-medium">
                      After this → Late
                    </p>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                    <label className="field-label text-rose-600">
                      Absent After (minutes)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        className={`field-input text-center font-black text-lg ${!isTimingValid ? "border-rose-400" : ""}`}
                        value={ed.absent_after_minutes ?? 60}
                        onChange={(e) =>
                          setEd(
                            "absent_after_minutes",
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-rose-400 mt-1 font-medium">
                      After this → locked out
                    </p>
                  </div>
                </div>

                {!isTimingValid && (
                  <div className="mt-2 flex items-center gap-2 text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                    <FiAlertCircle size={13} /> Absent threshold must be greater
                    than Late threshold
                  </div>
                )}

                {/* Timeline preview */}
                {isTimingValid && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-400 h-full"
                        style={{
                          width: `${(ed.late_after_minutes / ed.absent_after_minutes) * 100}%`,
                        }}
                      />
                      <div className="bg-orange-400 h-full flex-1" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1 font-medium">
                      <span className="text-emerald-600 font-bold">
                        ▶ Start
                      </span>
                      <span className="text-orange-500 font-bold">
                        +{ed.late_after_minutes}m Late
                      </span>
                      <span className="text-rose-500 font-bold">
                        +{ed.absent_after_minutes}m Absent
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Scoring ── */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <FiStar size={14} className="text-amber-500" /> Attendance
                    Scoring
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-gray-500">
                      {ed.use_scoring ? "Enabled" : "Disabled"}
                    </span>
                    <div
                      onClick={() => setEd("use_scoring", !ed.use_scoring)}
                      className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${
                        ed.use_scoring ? "bg-blue-500" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          ed.use_scoring ? "left-5" : "left-0.5"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {ed.use_scoring ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="field-label text-emerald-600">
                        Present Score
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          className="field-input pr-10"
                          value={ed.score_present ?? 1.0}
                          onChange={(e) =>
                            setEd("score_present", parseFloat(e.target.value))
                          }
                        />
                        <span className="absolute right-3 top-3 text-xs text-gray-400">
                          pt
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="field-label text-orange-600">
                        Late Score
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          className="field-input pr-10"
                          value={ed.score_late ?? 0.5}
                          onChange={(e) =>
                            setEd("score_late", parseFloat(e.target.value))
                          }
                        />
                        <span className="absolute right-3 top-3 text-xs text-gray-400">
                          pt
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="field-label text-blue-700 flex items-center gap-1">
                        <FiPercent size={11} /> Pass Threshold
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="5"
                          min="0"
                          max="100"
                          className="field-input pr-8"
                          value={ed.attendance_threshold ?? 80}
                          onChange={(e) =>
                            setEd(
                              "attendance_threshold",
                              parseInt(e.target.value),
                            )
                          }
                        />
                        <span className="absolute right-3 top-3 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                    <p className="col-span-3 text-xs text-blue-500 font-medium">
                      💡 Absent = 0 pts always · Pass requires at least{" "}
                      {ed.attendance_threshold}% attendance
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 font-medium text-center">
                    Scoring disabled — attendance tracked as Present / Late /
                    Absent only
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditCourse(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isTimingValid}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <FiCheck size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Delete this course?
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              <span className="font-bold text-gray-700">
                {deleteConfirm.course_code}: {deleteConfirm.name}
              </span>
              <br />
              All data including sessions and attendance records will be
              permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold shadow-md shadow-rose-200 hover:bg-rose-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .field-label { display: block; font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.375rem; }
        .field-input { width: 100%; padding: 0.625rem 0.875rem; background: #f9fafb; border: 1.5px solid transparent; border-radius: 0.75rem; font-weight: 600; color: #374151; font-size: 0.875rem; outline: none; transition: all 0.15s; }
        .field-input:focus { background: white; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      `}</style>
    </div>
  );
}
