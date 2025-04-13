"use client";

import { useState, useEffect, useRef } from "react";
import FlappyBird from "./Flappy";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.15);

  const audioRef = useRef<HTMLAudioElement | null>(null); // holds the same audio object

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1500);
    const hideTimer = setTimeout(() => {
      setLoading(false);

      // Create the audio only once
      if (!audioRef.current) {
        const audio = new Audio("/music.mp3");
        audio.loop = true;
        audio.volume = musicVolume;
        audioRef.current = audio;

        audio
          .play()
          .catch(() => {
            console.log("Autoplay blocked, waiting for interaction...");
            document.addEventListener(
              "click",
              () => {
                audio.play();
              },
              { once: true }
            );
          });
      }
    }, 3300);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Update volume directly on the same audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
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
          <span className="text-white md:text-7xl text-4xl mx-6 text-center font-bold animate-pulse">
            Dazed Bird By kelompok 5
          </span>
        </div>
      )}

      {/* Page fade-in */}
      <div
        className={`transition-opacity duration-[2000ms] ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        <FlappyBird
          musicVolume={musicVolume}
          setMusicVolume={setMusicVolume}
        />
      </div>
    </div>
  );
}
