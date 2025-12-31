'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock } from 'lucide-react';

interface LoginFormProps {
    onSubmit?: (email: string, password: string) => void;
}

interface VideoBackgroundProps {
    videoUrl: string;
}

// Video Background Component
export const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoUrl }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(err => console.error("Video autoplay failed:", err));
        }
    }, []);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-black/30 z-10" />
            <video
                ref={videoRef}
                className="absolute inset-0 min-w-full min-h-full object-cover w-auto h-auto"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

// Login Form Component
export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSubmit) onSubmit(email, password);
    };

    return (
        <div className="w-full max-w-md p-8 bg-black/50 border border-white/10 rounded-2xl relative z-20">
            <h2 className="text-3xl font-bold text-white text-center mb-6">Sign In</h2>
            <p className="text-white/70 text-center text-sm mb-6">
    Enter your email and password to access your account
  </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Mail className="text-white/60" size={18} />
                    </div>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                {/* Password */}
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Lock className="text-white/60" size={18} />
                    </div>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                {/* Login Button */}
                <button
                    type="submit"
                   className="
    w-full py-3
    bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
    text-white font-medium rounded-lg
    shadow-lg
    hover:from-blue-600 hover:via-blue-700 hover:to-blue-800
    transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                >
                    Log In
                </button>
            </form>
        </div>
    );
};
