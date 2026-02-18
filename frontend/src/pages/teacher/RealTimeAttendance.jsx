import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom"; // ตัด useNavigate ออกถ้าไม่ใช้
import Webcam from "react-webcam"; // ใช้ react-webcam แทน video tag ดิบๆ จะจัดการง่ายกว่า
import * as faceapi from "face-api.js";
import axios from "axios";
import {
  FiUsers,
  FiClock,
  FiStopCircle,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import Sidebar from "../../components/Sidebar";

const RealTimeAttendance = () => {
  const { sessionId } = useParams(); // รับ sessionId จาก URL
  // const location = useLocation(); // รับ state ถ้าจำเป็น

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false); // กันยิง API ซ้อนกัน
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(true);

  // 1. โหลด Model
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setIsModelLoaded(true);
    };
    loadModels();
  }, []);

  // 2. Main Loop (Detect & Check)
  useEffect(() => {
    let interval;

    const runDetection = async () => {
      // เช็คความพร้อม: Model โหลดเสร็จ? กล้องเปิดอยู่? ไม่ได้กำลังส่ง API? Session ยังเปิด?
      if (
        !isModelLoaded ||
        !webcamRef.current ||
        !webcamRef.current.video ||
        isProcessing ||
        !isSessionActive
      )
        return;

      const video = webcamRef.current.video;
      if (video.readyState !== 4) return;

      // A. ตรวจจับหน้า (Frontend)
      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      faceapi.matchDimensions(canvasRef.current, displaySize);

      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }), // inputSize น้อย = เร็ว
      );

      // B. วาดกรอบ
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, displaySize.width, displaySize.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

      // C. Logic การส่ง API: ถ้าเจอหน้าอย่างน้อย 1 คน
      if (detections.length > 0) {
        await handleCheckIn();
      }
    };

    // รัน Loop ทุก 500ms (ครึ่งวินาที)
    interval = setInterval(runDetection, 500);
    return () => clearInterval(interval);
  }, [isModelLoaded, isProcessing, isSessionActive]);

  // 3. ฟังก์ชันยิง API ไป Backend
  const handleCheckIn = async () => {
    setIsProcessing(true); // ล็อกไม่ให้ยิงซ้ำ
    try {
      const imageSrc = webcamRef.current.getScreenshot();

      // ยิงไปที่ Backend ที่เราแก้ไว้ (attendance_check.py)
      const res = await axios.post(
        "http://localhost:8000/attendance/recognize",
        {
          session_id: sessionId || 1, // ใส่ ID จริง หรือ Mock 1 ไปก่อน
          image: imageSrc,
        },
      );

      if (res.data.status === "detected") {
        const student = res.data.student;
        // เพิ่มลงใน Log ถ้ายังไม่มีในรายการ (หรือจะโชว์ซ้ำก็ได้แล้วแต่ UX)
        setLogs((prev) => {
          if (prev.find((l) => l.student_id === student.student_id))
            return prev;
          return [
            {
              id: Date.now(),
              student_name: student.name,
              student_id: student.student_id,
              time: new Date().toLocaleTimeString(),
              confidence: student.confidence,
            },
            ...prev,
          ];
        });
      }
    } catch (err) {
      console.error("Check-in error:", err);
    } finally {
      // เว้นระยะสัก 2 วินาทีค่อยให้สแกนใหม่ (Cooldown)
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const handleStopSession = () => {
    setIsSessionActive(false);
    // เรียก API ปิด Session ถ้ามี
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      <main className="flex-1 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Live Attendance: Session {sessionId}
          </h1>
          <button
            onClick={handleStopSession}
            className="bg-red-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-red-600"
          >
            <FiStopCircle /> End Session
          </button>
        </div>

        <div className="flex gap-6 h-[calc(100vh-150px)]">
          {/* ซ้าย: กล้อง Live View */}
          <div className="flex-1 bg-black rounded-3xl overflow-hidden relative shadow-2xl border-4 border-gray-200">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />

            {/* Status Indicator */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-4 py-1 rounded-full text-sm flex items-center gap-2 backdrop-blur-md">
              <div
                className={`w-3 h-3 rounded-full ${isSessionActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              ></div>
              {isProcessing ? "Processing..." : "Scanning..."}
            </div>
          </div>

          {/* ขวา: Real-time List */}
          <div className="w-96 bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <FiUsers /> Present
              </h3>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                {logs.length} Students
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm animate-fade-in-down"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {log.student_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-800">
                      {log.student_name}
                    </p>
                    <p className="text-xs text-gray-500">{log.student_id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-green-500 flex items-center text-xs gap-1 font-bold">
                      <FiCheckCircle /> {log.time}
                    </span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center text-gray-400 mt-10">
                  Waiting for students...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RealTimeAttendance;
