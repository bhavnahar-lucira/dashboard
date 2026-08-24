"use client";

import { useRef, useEffect } from "react";

export default function SafeVideo({ src, className, ...props }) {
  const videoRef = useRef(null);
  const playPromiseRef = useRef(null);

  const handlePlay = async () => {
    if (videoRef.current) {
      try {
        playPromiseRef.current = videoRef.current.play();
        await playPromiseRef.current;
      } catch (err) {
        // Ignore AbortError or other playback issues
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handlePause = async () => {
    if (videoRef.current) {
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (err) {
          // Ignore
        }
      }
      videoRef.current.pause();
    }
  };

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      onMouseOver={handlePlay}
      onMouseOut={handlePause}
      {...props}
    />
  );
}
