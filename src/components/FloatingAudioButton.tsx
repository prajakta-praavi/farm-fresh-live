import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import krishVoice from "@/assets/krish-1.mp3";

let sharedAudio: HTMLAudioElement | null = null;

const FloatingAudioButton = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = sharedAudio ?? new Audio(krishVoice);
    sharedAudio = audio;
    audioRef.current = audio;
    setIsPlaying(!audio.paused);

    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleAudio}
      className="fixed left-4 z-[100] h-11 w-11 rounded-full bg-[hsl(142,75%,22%)] text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl sm:left-6 sm:h-14 sm:w-14 flex items-center justify-center pointer-events-auto"
      style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
      aria-label={isPlaying ? "Pause audio" : "Play audio"}
    >
      <span className="absolute inset-2 rounded-full bg-[hsl(142,45%,42%)]/80" />
      <span className="relative z-10">
        {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </span>
    </button>
  );
};

export default FloatingAudioButton;
