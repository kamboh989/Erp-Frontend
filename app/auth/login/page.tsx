'use client';
import { LoginForm, VideoBackground } from './login';

function App() {
  const handleLogin = (email: string, password: string) => {
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className="relative min-h-screen w-full flex">
      {/* Video Background */}
      <VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

      <div className="mx-auto max-w-7xl w-full flex items-center justify-center min-h-screen px-4">
        {/* Overlay content */}
        <div className="relative z-20 w-full flex flex-col md:flex-row items-center md:items-stretch min-h-screen">
          
          {/* Left side - Logo + Title + Content */}
          <div className="flex-1 flex flex-col items-center md:items-start justify-center p-4  text-center md:text-left">
            <img
              src="/home/ai-verse.png"
              alt="Company Logo"
              className="w-20 h-20 mb-6"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Welcome to AIVerse
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-md">
              ERP and CRM streamline business operations and customer management, boosting efficiency and growth.
            </p>
          </div>

          {/* Right side - Login Form */}
          <div className="flex-1 flex items-center justify-center ">
            <div className="w-full max-w-md">
              <LoginForm/>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
