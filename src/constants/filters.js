export const CAMERA_FILTERS = [
  { id: "none",   name: "Normal", fn: null },
  { id: "warm",   name: "Warm",   fn: (r,g,b) => [Math.min(255,r+35), Math.min(255,g+12), Math.max(0,b-25)] },
  { id: "cool",   name: "Cool",   fn: (r,g,b) => [Math.max(0,r-20),   Math.min(255,g+8),  Math.min(255,b+38)] },
  { id: "bw",     name: "B&W",    fn: (r,g,b) => { const gr=0.299*r+0.587*g+0.114*b; return [gr,gr,gr]; } },
  { id: "sepia",  name: "Sepia",  fn: (r,g,b) => [Math.min(255,r*0.393+g*0.769+b*0.189), Math.min(255,r*0.349+g*0.686+b*0.168), Math.min(255,r*0.272+g*0.534+b*0.131)] },
  { id: "vivid",  name: "Vivid",  fn: (r,g,b) => [Math.min(255,r*1.28), Math.min(255,g*1.18), Math.min(255,b*1.08)] },
  { id: "fade",   name: "Fade",   fn: (r,g,b) => [r*0.68+52, g*0.68+52, b*0.68+52] },
  { id: "dreamy", name: "Dreamy", fn: (r,g,b) => [Math.min(255,r*1.05+18), Math.min(255,g*1.02+8), Math.min(255,b*1.18+22)] },
];
