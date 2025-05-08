import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Check,
  X,
  User,
  RefreshCw,
} from "lucide-react";

const baseURL = `${
  import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000"
}`;

// Type definitions
interface CapturedImage {
  id: number;
  blob: Blob;
  url: string;
}

interface MessageState {
  text: string;
  type: "error" | "success" | "info" | "";
}

interface VerificationResult {
  verified: boolean;
  user_id?: string;
  confidence_score?: number;
}

const FaceRegister: React.FC = () => {
  const [userId, setUserId] = useState<string>("");
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  //const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stremLoaded, setSteamLoaded] = useState<boolean>(false);
  const [message, setMessage] = useState<MessageState>({ text: "", type: "" });
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Initialize camera when component mounts
    startCamera();

    // Clean up when component unmounts
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async (): Promise<void> => {
    try {
      // Stop any existing stream before starting a new one
      if (videoStreamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
      });

      if (stream) {
        videoStreamRef.current = stream;
        setSteamLoaded(true);
      }
      //setVideoStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setMessage({
        text: `Camera access error: ${err.message}. Please grant camera permissions.`,
        type: "error",
      });
    }
  };

  const stopCamera = (): void => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setSteamLoaded(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = async (): Promise<void> => {


    // Toggle facing mode
    setFacingMode((prevMode) => (prevMode === "user" ? "environment" : "user"));


  };

  const captureImage = (): void => {
    if (capturedImages.length >= 10) {
      setMessage({
        text: "Maximum number of images (10) reached",
        type: "error",
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext("2d");
      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const imageObj: CapturedImage = {
              id: Date.now(),
              blob: blob,
              url: URL.createObjectURL(blob),
            };
            setCapturedImages((prev) => [...prev, imageObj]);
            setMessage({
              text: "Image captured successfully",
              type: "success",
            });
          }
        },
        "image/jpeg",
        0.8
      );
    }
  };

  const removeImage = (imageId: number): void => {
    setCapturedImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const registerUser = async (): Promise<void> => {
    if (!userId.trim()) {
      setMessage({ text: "Please enter a user ID", type: "error" });
      return;
    }

    if (capturedImages.length === 0) {
      setMessage({ text: "Please capture at least one image", type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "Registering user...", type: "info" });

    try {
      // Register each image one by one
      await Promise.all(
        capturedImages.map(async (image) => {
          const formData = new FormData();
          formData.append("id", userId);
          formData.append("imageFile", image.blob, `face_${image.id}.jpg`);
          const response = await fetch(`${baseURL}/register`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Registration failed: ${response.statusText}`);
          }

          return await response.json();
        })
      );

      setMessage({
        text: `User ${userId} registered successfully with ${capturedImages.length} images`,
        type: "success",
      });
    } catch (error: any) {
      setMessage({ text: `Error: ${error.message}`, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyFace = async (): Promise<void> => {
    if (videoStreamRef.current === null) {
      setMessage({ text: "Camera not available", type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "Verifying...", type: "info" });

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas) {
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert the canvas content to a blob
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.8)
        );

        if (!blob) {
          throw new Error("Failed to capture image for verification");
        }

        const formData = new FormData();
        formData.append("imageFile", blob, "verify.jpg");

        const response = await fetch(`${baseURL}/verify`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Verification failed: ${response.statusText}`);
        }

        const result: VerificationResult = await response.json();
        setVerificationResult(result);

        setMessage({
          text: result.verified
            ? `Verification successful! User: ${result.user_id}`
            : "Verification failed",
          type: result.verified ? "success" : "error",
        });
      }
    } catch (error: any) {
      setMessage({ text: `Error: ${error.message}`, type: "error" });
      setVerificationResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = (): void => {
    setUserId("");
    setCapturedImages([]);
    setMessage({ text: "", type: "" });
    setVerificationResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6">
        Face Registration System
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Camera */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Camera</h2>

          <div className="relative bg-black rounded-lg overflow-hidden mb-4 aspect-square max-w-sm mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
             <button
                onClick={toggleCamera}
                className="absolute top-4 right-4 bg-white bg-opacity-70 p-2 rounded-full hover:bg-opacity-100 transition-all cursor-pointer"
                title={`Switch to ${
                  facingMode === "user" ? "back" : "front"
                } camera`}
              >
                <RefreshCw size={24} className="text-blue-600" />
              </button>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex justify-between mb-4">
            <button
              onClick={captureImage}
              disabled={
                isLoading || !stremLoaded || capturedImages.length >= 10
              }
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 cursor-pointer"
            >
              <Camera size={20} />
              Take Photo ({capturedImages.length}/10)
            </button>

            {/* <button
              onClick={toggleCamera}
              disabled={isLoading}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded disabled:bg-gray-400 cursor-pointer"
            >
              <Repeat size={20} />
              Switch Camera
            </button> */}

            <button
              onClick={verifyFace}
              disabled={isLoading || !stremLoaded}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 cursor-pointer"
            >
              <Check size={20} />
              Verify Face
            </button>
          </div>

          {/* User ID input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <div className="flex items-center border rounded overflow-hidden">
              <div className="bg-gray-100 p-2 border-r">
                <User size={20} className="text-gray-500" />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUserId(e.target.value)
                }
                placeholder="Enter user ID"
                className="flex-1 p-2 outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between">
            <button
              onClick={registerUser}
              disabled={
                isLoading || capturedImages.length === 0 || !userId.trim()
              }
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded disabled:bg-gray-400 cursor-pointer"
            >
              <Upload size={20} />
              Register User
            </button>

            <button
              onClick={resetForm}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded cursor-pointer"
            >
              <RefreshCw size={20} />
              Reset
            </button>
          </div>
        </div>

        {/* Right column - Captured Images & Results */}
        <div>
          {/* Status message */}
          {message.text && (
            <div
              className={`mb-4 p-3 rounded ${
                message.type === "error"
                  ? "bg-red-100 text-red-700"
                  : message.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Verification result */}
          {verificationResult && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">
                Verification Result
              </h2>
              <div
                className={`p-3 rounded ${
                  verificationResult.verified ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  {verificationResult.verified
                    ? "Verified ✓"
                    : "Not Verified ✗"}
                </p>
                {verificationResult.verified &&
                  verificationResult.user_id &&
                  verificationResult.confidence_score && (
                    <>
                      <p>
                        <span className="font-medium">User ID:</span>{" "}
                        {verificationResult.user_id}
                      </p>
                      <p>
                        <span className="font-medium">Confidence:</span>{" "}
                        {Math.round(verificationResult.confidence_score * 100)}%
                      </p>
                    </>
                  )}
              </div>
            </div>
          )}

          {/* Captured images gallery */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">
              Captured Images ({capturedImages.length}/10)
            </h2>

            {capturedImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No images captured yet. Click "Take Photo" to capture your face.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {capturedImages.map((image) => (
                  <div key={image.id} className="relative aspect-square">
                    <img
                      src={image.url}
                      alt="Captured face"
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 cursor-pointer"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRegister;
