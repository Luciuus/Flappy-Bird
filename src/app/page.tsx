"use client";

import { useState, useEffect } from "react";
import FlappyBird from "./Flappy";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.15); // Default music volume

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1500); // Background starts fading out
    const hideTimer = setTimeout(() => {
      setLoading(false);

      // Play music when the page fully fades in
      const audio = new Audio("/music.mp3");
      audio.loop = true;
      audio.volume = musicVolume;
      audio.play().catch(() => {
        console.log("Autoplay blocked, waiting for interaction...");
        document.addEventListener("click", () => {
          audio.play();
        }, { once: true }); // Plays only after the first click
      });
    }, 3300); // Fully disappears at 3.3s

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [musicVolume]);

  return (
    <div className="h-screen w-screen relative">
      {/* Background fade-out */}
      {loading && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gray-900 transition-opacity duration-[2000ms] ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="text-white text-5xl font-bold animate-pulse">
            Dazed Bird By kelompok 5
          </span>
        </div>
      )}

      {/* Page fade-in effect */}
      <div
        className={`transition-opacity duration-[2000ms] ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        <FlappyBird musicVolume={musicVolume} setMusicVolume={setMusicVolume} />
      </div>
    </div>
  );
}
