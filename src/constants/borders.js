// Border thickness in px
export const BORDER_T = 18;

// 4 corner RGB colors per theme — bilinearly interpolated across the full frame
// so every corner blends seamlessly into its neighbors
export const BORDER_CORNERS = {
  forest:    { tl:[60,210,185],  tr:[90,225,120],  bl:[30,190,155],  br:[60,210,185]  },
  ocean:     { tl:[80,210,255],  tr:[80,245,240],  bl:[40,215,225],  br:[130,160,255] },
  anime:     { tl:[190,160,255], tr:[230,120,255], bl:[255,150,210], br:[255,100,180] },
  halloween: { tl:[255,160,60],  tr:[255,100,20],  bl:[200,80,10],   br:[255,120,40]  },
  sakura:    { tl:[255,195,220], tr:[225,185,255], bl:[255,165,210], br:[255,195,220] },
  galaxy:    { tl:[140,155,255], tr:[200,130,255], bl:[120,170,255], br:[160,140,255] },
  pixel:     { tl:[80,255,100],  tr:[40,230,80],   bl:[20,200,60],   br:[60,240,90]   },
  autumn:    { tl:[255,160,60],  tr:[255,100,80],  bl:[220,100,20],  br:[255,140,50]  },
  disco:     { tl:[255,160,210], tr:[140,200,255], bl:[80,230,185],  br:[255,210,100] },
  music:     { tl:[255,140,160], tr:[210,150,255], bl:[255,100,130], br:[220,130,255] },
};

export const GLOW_COLORS = {
  forest:"#4ade80", ocean:"#38bdf8", anime:"#f472b6", halloween:"#f97316",
  sakura:"#f9a8d4", galaxy:"#a78bfa", pixel:"#00ff41", autumn:"#fb923c",
  disco:"#f0abfc",  music:"#fb7185",
};

// 40 star positions: [perimeterFraction 0-1, depthFraction 0-1]
export const STAR_POSITIONS = [
  [0.02,0.3],[0.06,0.7],[0.08,0.2],[0.12,0.8],[0.15,0.5],[0.18,0.15],[0.22,0.7],
  [0.26,0.4],[0.30,0.9],[0.33,0.2],[0.37,0.6],[0.41,0.15],[0.44,0.75],[0.47,0.4],
  [0.50,0.5],[0.53,0.2],[0.56,0.85],[0.60,0.35],[0.63,0.65],[0.67,0.1],[0.70,0.4],
  [0.73,0.8],[0.76,0.25],[0.79,0.55],[0.82,0.7],[0.85,0.1],[0.88,0.45],[0.90,0.85],
  [0.93,0.3],[0.96,0.6],[0.04,0.55],[0.10,0.35],[0.20,0.9],[0.28,0.15],[0.39,0.5],
  [0.46,0.9],[0.58,0.2],[0.65,0.75],[0.75,0.4],[0.95,0.15],
];

export const PHOTO_BORDERS = [
  { id: "none",      name: "None",      preview: "○" },
  { id: "forest",    name: "Forest",    preview: "🌿" },
  { id: "ocean",     name: "Ocean",     preview: "🌊" },
  { id: "anime",     name: "Anime",     preview: "✨" },
  { id: "halloween", name: "Halloween", preview: "🎃" },
  { id: "sakura",    name: "Sakura",    preview: "🌸" },
  { id: "galaxy",    name: "Galaxy",    preview: "🪐" },
  { id: "pixel",     name: "Pixel",     preview: "👾" },
  { id: "autumn",    name: "Autumn",    preview: "🍂" },
  { id: "disco",     name: "Disco",     preview: "🪩" },
  { id: "music",     name: "Music",     preview: "🎵" },
];
