import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import About from './pages/About';
// import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import App from './pages/Home';
import FaceAttendanceSystem from './pages/FaceAttendance';
import FaceRegister from './pages/FaceRegister';


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        {/* <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} /> */}
        <Route path="/face" element={<FaceAttendanceSystem />} />
        <Route path="/register" element={<FaceRegister />} />
        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
