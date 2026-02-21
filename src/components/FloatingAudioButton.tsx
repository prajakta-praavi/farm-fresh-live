import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import krishVoice from "@/assets/krish-1.mp3";

const FloatingAudioButton = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(krishVoice);
    audioRef.current = audio;

    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("ended", onEnded);
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
      className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-[hsl(142,75%,22%)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
      aria-label={isPlaying ? "Pause audio" : "Play audio"}
    >
      <span className="absolute inset-2 rounded-full bg-[hsl(142,45%,42%)]/80" />
      <span className="relative z-10">
        {isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </span>
    </button>
  );
};

export default FloatingAudioButton;
