/**
 * Draw mirrored selfie preview into cw×ch without stretching.
 * `coverBias` 1 = full cover (fills frame, crops edges). 0 = full contain (letterbox).
 * Default pulls back slightly from full cover so more of the scene is visible on phones.
 */
export function drawMirroredVideoCover(ctx, video, cw, ch, coverBias = 0.58) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const scaleCover = Math.max(cw / vw, ch / vh);
  const scaleContain = Math.min(cw / vw, ch / vh);
  const scale = scaleContain + (scaleCover - scaleContain) * coverBias;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);

  const dw = vw * scale;
  const dh = vh * scale;

  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, vw, vh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}
