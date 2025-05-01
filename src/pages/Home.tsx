import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, Camera } from "lucide-react";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Welcome to Face Attendance System
        </h1>
        <div className="bg-gray-50 rounded-md p-6 border border-gray-200">
          <p className="text-gray-700 text-lg mb-6 text-center">
            Choose an option below:
          </p>
          <div className="flex flex-col space-y-4">
            <Link
              to="/register"
              className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md transition duration-300 ease-in-out"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Register
            </Link>
            <Link
              to="/face"
              className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md transition duration-300 ease-in-out"
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Face Attendance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
