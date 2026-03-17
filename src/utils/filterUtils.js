export function applyFilterToPixels(imageData, filterFn) {
  if (!filterFn) return;
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const [nr, ng, nb] = filterFn(pixels[i], pixels[i+1], pixels[i+2]);
    pixels[i] = nr; pixels[i+1] = ng; pixels[i+2] = nb;
  }
}
