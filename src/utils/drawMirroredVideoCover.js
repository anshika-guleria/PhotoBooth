/**
 * Draw front-camera video into a cw×ch frame without stretching: crops like CSS object-fit: cover,
 * then mirrors horizontally for a natural selfie preview.
 */
export function drawMirroredVideoCover(ctx, video, cw, ch) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const canvasRatio = cw / ch;
  const videoRatio = vw / vh;
  let sx, sy, sw, sh;
  if (videoRatio > canvasRatio) {
    sh = vh;
    sw = vh * canvasRatio;
    sx = (vw - sw) / 2;
    sy = 0;
  } else {
    sw = vw;
    sh = vw / canvasRatio;
    sx = 0;
    sy = (vh - sh) / 2;
  }

  ctx.save();
  ctx.translate(cw, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  ctx.restore();
}
