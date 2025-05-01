import { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle, AlertCircle } from "lucide-react";

import { ToastContainer, toast } from 'react-toastify';

const baseURL = `${
  import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000"
}`;

interface AttendanceRecord {
  userId: string;
  timestamp: string;
  confidenceScore: number;
}

interface VerifyResponse {
  verified: boolean;
  user_id: string;
  confidence_score: number;
  message?: string;
}

export default function FaceAttendanceSystem() {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [attendanceLog, setAttendanceLog] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Clean up function for camera stream
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startCamera = async (): Promise<void> => {
    try {
      setError(null);
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      // Ensure videoRef is available before setting srcObject
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      videoRef.current.srcObject = streamRef.current;
    } catch (err: unknown) {
      const error = err as Error;
      setError("Could not access camera: " + error.message);
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = (): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = (): Promise<Blob | null> | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    const context = canvas.getContext("2d");
    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  };

  const sendFrameToBackend = async (blob: Blob | null): Promise<boolean> => {
    if (!blob) return false;

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append("imageFile", blob, "capture.jpg");

      const response = await fetch(baseURL + "/verify", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = (await response.json()) as VerifyResponse;
      setProcessing(false);

      if (data.verified) {
        const timestamp = new Date().toLocaleString();
        const newAttendance: AttendanceRecord = {
          userId: data.user_id,
          timestamp,
          confidenceScore: data.confidence_score,
        };
        // Show success message
        const successMessage = `Successfully recorded attendance for ${data.user_id}`;
        toast.success(successMessage);
        // You could also implement a more elegant notification system here
        // For example, setting a state variable to show a toast notification

        setAttendanceLog((prev) => [newAttendance, ...prev]);
        return true;
      }
      else {
        // Show failure message;
        toast.error(data?.message);
        // You could also implement a more elegant notification system here
        // For example, setting a state variable to show a toast notification
      }

      return false;
    } catch (err: unknown) {
      setProcessing(false);
      const error = err as Error;
      setError("Error verifying face: " + error.message);
      console.error("Error sending frame to backend:", error);
      return false;
    }
  };

  const startAttendance = async (): Promise<void> => {
    try {
      // First ensure we're not already capturing
      if (isCapturing) return;

      // Set capturing state first to render the video element
      setIsCapturing(true);

      // Small delay to ensure the video element is rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now start the camera
      await startCamera();

      // Wait for video to be ready
      if (videoRef.current) {
        if (videoRef.current.readyState >= 2) {
          // Video is already loaded
        } else {
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadeddata = () => resolve();
            } else {
              resolve(); // Resolve anyway if video ref is null
            }
          });
        }
      }

      // Capture frame every 2 seconds
      intervalRef.current = window.setInterval(async () => {
        const blob = await captureFrame();
        const verified = await sendFrameToBackend(blob);

        if (verified) {
          // Stop capturing frames once user is verified
          stopAttendance();
          // Display success message or notification could be added here
        }
      }, 2000);
    } catch (err) {
      const error = err as Error;
      setError("Failed to start attendance: " + error.message);
      stopAttendance();
    }
  };

  const stopAttendance = (): void => {
    setIsCapturing(false);
    stopCamera();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Face Attendance System</h1>

      <div className="flex flex-col items-center w-full">
        <div
          className={`relative w-full max-w-xl h-96 bg-gray-100 rounded-lg overflow-hidden mb-4 ${
            processing
              ? "animate-pulse border-4 border-blue-500 border-opacity-75"
              : ""
          }`}
        >
          {isCapturing ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Camera size={96} className="text-gray-400" />
            </div>
          )}

          {processing && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="text-white text-lg font-semibold px-4 py-2 rounded-full bg-blue-600 bg-opacity-80 shadow-lg animate-bounce">
                Processing...
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-4 mb-6">
          {!isCapturing ? (
            <button
              onClick={startAttendance}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Camera size={20} />
              Start Face Attendance
            </button>
          ) : (
            <button
              onClick={stopAttendance}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
            >
              Stop Attendance
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 w-full">
            <div className="flex items-center">
              <AlertCircle size={20} className="mr-2" />
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full mt-6">
        <h2 className="text-xl font-semibold mb-2">Attendance Log</h2>

        {attendanceLog.length === 0 ? (
          <p className="text-gray-500">No attendance records yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">User ID</th>
                  <th className="py-2 px-4 text-left">Time</th>
                  <th className="py-2 px-4 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLog.map((record, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="py-3 px-4 flex items-center">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      {record.userId}
                    </td>
                    <td className="py-3 px-4">{record.timestamp}</td>
                    <td className="py-3 px-4">
                      {(record.confidenceScore * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
