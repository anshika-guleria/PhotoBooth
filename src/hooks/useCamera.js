import { useEffect, useRef, useState } from "react";
import { CAMERA_FILTERS } from '../constants/filters';
import { applyFilterToPixels } from '../utils/filterUtils';
import { drawArtBorder } from '../utils/glitter';

export default function useCamera(selectedFilter, selectedBorder) {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const animationRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Start the camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 480, height: 360, facingMode: "user" } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      })
      .catch(() => setCameraError(true));

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Live render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || !cameraReady) return;
    const ctx = canvas.getContext("2d");

    const renderFrame = () => {
      ctx.save(); ctx.translate(480, 0); ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 480, 360); ctx.restore();
      if (selectedFilter !== "none") {
        const filterFn = CAMERA_FILTERS.find(f => f.id === selectedFilter)?.fn;
        const imageData = ctx.getImageData(0, 0, 480, 360);
        applyFilterToPixels(imageData, filterFn);
        ctx.putImageData(imageData, 0, 0);
      }
      drawArtBorder(ctx, 480, 360, selectedBorder);
      animationRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();
    return () => cancelAnimationFrame(animationRef.current);
  }, [cameraReady, selectedFilter, selectedBorder]);

  return { videoRef, canvasRef, cameraReady, cameraError };
}
