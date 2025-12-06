import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import type { Scene } from '../../types';

interface KaraokeViewProps {
  scene: Scene;
}

export function KaraokeView({ scene }: KaraokeViewProps) {
  const { popView } = useViewStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const intervalRef = useRef<number | null>(null);

  // Split narrative into lines
  const lines = scene.narrative
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Calculate time per line based on word count
  const getLineDuration = (line: string) => {
    const words = line.split(/\s+/).length;
    const baseMs = 2000; // 2 seconds base
    const perWordMs = 150; // 150ms per word
    return (baseMs + words * perWordMs) / speed;
  };

  useEffect(() => {
    if (isPlaying && currentLine < lines.length) {
      intervalRef.current = window.setTimeout(() => {
        setCurrentLine((prev) => prev + 1);
      }, getLineDuration(lines[currentLine]));
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentLine, speed, lines]);

  // Stop when reaching end
  useEffect(() => {
    if (currentLine >= lines.length) {
      setIsPlaying(false);
    }
  }, [currentLine, lines.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentLine(0);
    setIsPlaying(false);
  };

  const handleSkipBack = () => {
    setCurrentLine(Math.max(0, currentLine - 1));
  };

  const handleSkipForward = () => {
    setCurrentLine(Math.min(lines.length - 1, currentLine + 1));
  };

  const handleRewind = () => {
    setCurrentLine(Math.max(0, currentLine - 3));
  };

  const handleFastForward = () => {
    setCurrentLine(Math.min(lines.length - 1, currentLine + 3));
  };

  const progress = lines.length > 0 ? (currentLine / lines.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Exit button */}
      <button
        onClick={popView}
        className="absolute top-4 left-4 flex items-center gap-1 text-cyan-400 hover:text-cyan-300 z-10"
      >
        <ArrowLeft size={16} /> Exit Karaoke
      </button>

      {/* Main display area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 bg-gradient-to-b from-neutral-900 via-neutral-850 to-neutral-900">
        {/* Previous lines (faded) */}
        <div className="space-y-2 mb-8 opacity-30">
          {lines.slice(Math.max(0, currentLine - 2), currentLine).map((line, i) => (
            <p
              key={i}
              className="text-xl text-center text-neutral-400"
            >
              {line}.
            </p>
          ))}
        </div>

        {/* Current line */}
        <p
          className={cn(
            'text-3xl font-medium text-center text-neutral-100 max-w-4xl',
            'transition-all duration-300',
            isPlaying && 'text-cyan-300'
          )}
        >
          {lines[currentLine] || 'End of narrative'}.
        </p>

        {/* Upcoming lines (dimmed) */}
        <div className="space-y-2 mt-8 opacity-50">
          {lines.slice(currentLine + 1, currentLine + 3).map((line, i) => (
            <p
              key={i}
              className="text-lg text-center text-neutral-500"
            >
              {line}.
            </p>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-neutral-800 border-t border-neutral-700">
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={handleRestart}
            className="p-2 text-neutral-400 hover:text-neutral-100"
            title="Restart"
          >
            <SkipBack size={20} />
          </button>
          <button
            onClick={handleRewind}
            className="p-2 text-neutral-400 hover:text-neutral-100"
            title="Rewind"
          >
            <Rewind size={20} />
          </button>
          <button
            onClick={handleSkipBack}
            className="p-2 text-neutral-400 hover:text-neutral-100"
            title="Previous line"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={handlePlayPause}
            className={cn(
              'p-4 rounded-full',
              isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-cyan-600 hover:bg-cyan-500'
            )}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            onClick={handleSkipForward}
            className="p-2 text-neutral-400 hover:text-neutral-100"
            title="Next line"
          >
            <SkipForward size={16} />
          </button>
          <button
            onClick={handleFastForward}
            className="p-2 text-neutral-400 hover:text-neutral-100"
            title="Fast forward"
          >
            <FastForward size={20} />
          </button>
        </div>

        {/* Speed control */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className="text-sm text-neutral-400">Speed:</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-mono w-12">{speed.toFixed(1)}x</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>{currentLine + 1} / {lines.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
