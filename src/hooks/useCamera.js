import { useEffect, useRef, useState } from "react";
import { CAMERA_FILTERS } from '../constants/filters';
import { drawMirroredVideoCover } from '../utils/drawMirroredVideoCover';
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
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
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
      drawMirroredVideoCover(ctx, video, 480, 360, 0.58);
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
