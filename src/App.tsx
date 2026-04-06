import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Wand2, 
  Loader2, 
  Download, 
  Trash2,
  CheckCircle2,
  LayoutTemplate,
  RefreshCw,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { cn } from './lib/utils';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface UploadedScreen {
  id: string;
  file: File;
  base64: string;
  previewUrl: string;
}

interface GeneratedGraphic {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  sourceScreen: UploadedScreen;
}

const ASPECT_RATIOS = [
  { label: 'Square (1:1)', value: '1:1' },
  { label: 'Landscape (16:9)', value: '16:9' },
  { label: 'Portrait (9:16)', value: '9:16' },
  { label: 'Classic (4:3)', value: '4:3' },
  { label: 'Tall (3:4)', value: '3:4' },
  { label: 'Custom Dimensions', value: 'custom' },
];

const TEMPLATE_CATEGORIES = [
  {
    name: "Web Mockups",
    templates: [
      { label: 'MacBook on Desk', prompt: 'Place this UI in a realistic MacBook Pro mockup resting on a wooden desk with a cup of coffee. Natural sunlight, photorealistic.' },
      { label: 'Floating Safari Glassmorphism', prompt: 'Place this web UI in a floating Safari browser window with a frosted glassmorphism effect over a colorful abstract blurred background.' },
      { label: 'Isometric Clay Laptop', prompt: 'Place this web UI in a clean, 3D isometric clay laptop mockup. Monochromatic pastel background, soft studio lighting.' },
      { label: 'Dark Mode Neon Browser', prompt: 'Place this UI in a dark mode browser window floating in a dark room with glowing neon accents and reflections.' },
      { label: 'Minimalist Chrome', prompt: 'Place this web UI in a minimalist, flat Chrome browser window on a solid vibrant yellow background with a harsh drop shadow.' },
      { label: 'Dual Monitor Gaming Setup', prompt: 'Mockup this UI on a curved monitor in a dark, high-tech gaming room with RGB lighting.' },
      { label: 'Vintage CRT Web', prompt: 'Display this web UI on a vintage, bulky CRT monitor resting on a 90s office desk. Include scanlines and screen glare.' },
      { label: 'Projected Web Page', prompt: 'Mockup this UI as being projected onto a rough concrete wall in a dark, industrial loft.' },
      { label: 'Neo-Brutalist Web', prompt: 'Place this web UI in a tilted browser window with harsh neo-brutalist styling: thick black borders, solid hot pink background, and sharp black drop shadows.' },
      { label: 'Clean Safari Abstract', prompt: 'Place this UI in a pristine Safari window floating over a smooth, 3D rendered abstract geometric landscape.' }
    ]
  },
  {
    name: "App / Mobile Mockups",
    templates: [
      { label: 'iPhone in Hand', prompt: 'Place this app UI in a photorealistic mockup of an iPhone 15 Pro being held in a hand. The background should be a blurred busy city street.' },
      { label: 'Floating Isometric Phones', prompt: 'Place this app UI in a dynamic composition of multiple floating isometric clay smartphones. Soft lighting, clean pastel background.' },
      { label: 'Android on Marble', prompt: 'Mockup this app UI on a sleek Android smartphone resting flat on a white marble kitchen counter. Photorealistic lighting.' },
      { label: 'Dynamic Flying Phones', prompt: 'Place this app UI on several smartphones flying through the air dynamically. Dark background with dramatic cinematic spotlights.' },
      { label: 'Minimalist White Phone', prompt: 'Place this app UI in a minimalist, pure white phone mockup floating on a solid hot pink background with a hard shadow.' },
      { label: 'Rainy Street Reflection', prompt: 'Mockup this app UI on a phone screen reflecting in a puddle on a dark, rainy cyberpunk street with neon lights.' },
      { label: 'Over-the-Shoulder Commute', prompt: 'Photorealistic over-the-shoulder shot of a person using this app on a smartphone while sitting on a moving train.' },
      { label: 'Neo-Brutalist Phone', prompt: 'Place this app UI in a blocky, neo-brutalist phone mockup with thick black borders, harsh shadows, and a bright yellow background.' },
      { label: 'Glassmorphism Mobile', prompt: 'Place this app UI in a translucent glassmorphism phone mockup floating over a vibrant 3D gradient landscape.' },
      { label: 'Vintage Gameboy App', prompt: 'Display this app UI on the screen of a vintage 90s Gameboy handheld console resting on a colorful retro carpet.' }
    ]
  },
  {
    name: "Physical / Outdoor",
    templates: [
      { label: 'Times Square Billboard', prompt: 'Mockup this image as a giant illuminated billboard in the middle of Times Square at night. Realistic reflections, crowds, and cinematic lighting.' },
      { label: 'Sunny Bus Stop Ad', prompt: 'Place this UI as an advertisement poster inside a glass bus stop shelter on a sunny city street.' },
      { label: 'Subway Station Display', prompt: 'Mockup this image on a glowing digital ad display in a gritty, underground subway station.' },
      { label: 'Polaroid on Desk', prompt: 'Make this screen look like a physical Polaroid photograph resting on a textured wooden desk next to a cup of coffee. Photorealistic, top-down view.' },
      { label: 'Magazine Spread', prompt: 'Mockup this UI printed as a glossy full-page spread in an open magazine lying on a modern coffee table.' },
      { label: 'Framed Brick Wall Poster', prompt: 'Place this image in a black picture frame hanging on an exposed, weathered brick wall. Gallery lighting.' },
      { label: 'Crumpled Street Flyer', prompt: 'Mockup this UI as a crumpled, slightly weathered paper flyer dropped on a wet city sidewalk.' },
      { label: 'Cinematic Projector', prompt: 'Display this image on a massive projector screen in a dark, empty cinematic auditorium with a visible light beam.' },
      { label: 'Street Lamp Sticker', prompt: 'Mockup this UI as a vinyl sticker slapped onto a weathered metal street lamp pole covered in other torn stickers.' },
      { label: 'Breakfast Newspaper', prompt: 'Place this image as the front page graphic of a folded newspaper resting on a breakfast table next to a croissant.' }
    ]
  },
  {
    name: "Artistic / Stylized",
    templates: [
      { label: 'Pure Neo-Brutalism', prompt: 'Place this UI in a pure neo-brutalist composition. Use harsh black drop shadows, thick black outlines, and vibrant solid colors (electric yellow, hot pink). The device should look blocky and physical.' },
      { label: '80s Retrofuturistic', prompt: 'Place this screen in a retrofuturistic 80s sci-fi mockup. Use glowing neon grids, dark synthwave colors (purple, cyan), and adapt the frame to look like a vintage CRT monitor.' },
      { label: 'Y2K Cyber Aesthetic', prompt: 'Place this screen in a Y2K era cyber aesthetic mockup. Use translucent frosted plastics, metallic silver textures, and liquid blob shapes in the background with bright cyan and magenta.' },
      { label: 'Vaporwave Dream', prompt: 'Mockup this UI in a vaporwave aesthetic. Include classical marble statues, palm trees, grid floors, and a pink and teal color palette.' },
      { label: 'Minimalist Zen', prompt: 'Place this UI in a minimalist zen composition. Use soft, diffused shadows, warm beige and sand tones, and natural sunlight filtering through leaves.' },
      { label: 'Cyberpunk Neon Grime', prompt: 'Mockup this UI in a gritty Cyberpunk style. Dark alleys, pouring rain, glowing neon signs, and holographic projections.' },
      { label: 'Liquid Chrome', prompt: 'Place this UI surrounded by abstract, flowing liquid chrome and metallic shapes. High contrast reflections and futuristic vibes.' },
      { label: 'Pop Art Comic', prompt: 'Mockup this UI in a vintage pop art comic book style. Use halftone dot patterns, bold primary colors, and thick black ink outlines.' },
      { label: 'Surrealist Dreamscape', prompt: 'Place this UI floating in a surrealist dreamscape with impossible geometry, floating fluffy clouds, and pastel skies.' },
      { label: 'Origami Papercraft', prompt: 'Mockup this UI as if the device and background are made entirely of folded origami paper. Soft, tactile paper textures and studio lighting.' }
    ]
  }
];

const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

export default function App() {
  const [screens, setScreens] = useState<UploadedScreen[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [customWidth, setCustomWidth] = useState('1920');
  const [customHeight, setCustomHeight] = useState('1080');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [generatedGraphics, setGeneratedGraphics] = useState<GeneratedGraphic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewingGraphic, setViewingGraphic] = useState<GeneratedGraphic | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newScreens: UploadedScreen[] = [];
    
    for (const file of acceptedFiles) {
      try {
        const base64 = await fileToBase64(file);
        const previewUrl = URL.createObjectURL(file);
        const id = Math.random().toString(36).substring(7);
        
        newScreens.push({
          id,
          file,
          base64,
          previewUrl
        });
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }
    
    setScreens(prev => [...prev, ...newScreens]);
    
    // Auto-select if it's the first upload
    if (screens.length === 0 && newScreens.length > 0) {
      setSelectedScreenIds(new Set([newScreens[0].id]));
    }
  }, [screens.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    }
  });

  const toggleScreenSelection = (id: string) => {
    setSelectedScreenIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const removeScreen = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScreens(prev => {
      const screen = prev.find(s => s.id === id);
      if (screen) {
        URL.revokeObjectURL(screen.previewUrl);
      }
      return prev.filter(s => s.id !== id);
    });
    setSelectedScreenIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const generateGraphic = async () => {
    if (selectedScreenIds.size === 0) {
      setError('Please select at least one screen to use as a reference.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt describing the mockup you want.');
      return;
    }

    let finalAspectRatio = aspectRatio;
    if (aspectRatio === 'custom') {
      const w = parseInt(customWidth, 10);
      const h = parseInt(customHeight, 10);
      if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
        setError('Width and height must be valid positive numbers.');
        return;
      }
      const divisor = gcd(w, h);
      finalAspectRatio = `${w / divisor}:${h / divisor}`;
    }

    const selectedScreens = screens.filter(s => selectedScreenIds.has(s.id));

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: selectedScreens.length });
    setError(null);

    let completed = 0;
    let failed = 0;

    const promises = selectedScreens.map(async (screen) => {
      try {
        const parts: any[] = [
          {
            inlineData: {
              data: screen.base64,
              mimeType: screen.file.type || 'image/png'
            }
          },
          { text: aspectRatio === 'custom' ? `${prompt} (Generate with exact aspect ratio ${customWidth}:${customHeight})` : prompt }
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: finalAspectRatio as any
            }
          }
        });

        let newImageUrl: string | null = null;
        
        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              newImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (newImageUrl) {
          setGeneratedGraphics(prev => [{
            id: Math.random().toString(36).substring(7),
            url: newImageUrl!,
            prompt,
            aspectRatio: aspectRatio === 'custom' ? `${customWidth}x${customHeight}` : aspectRatio,
            sourceScreen: screen
          }, ...prev]);
        } else {
          failed++;
        }
      } catch (err) {
        console.error('Error generating graphic for screen:', err);
        failed++;
      } finally {
        completed++;
        setGenerationProgress(prev => ({ ...prev, current: completed }));
      }
    });

    await Promise.allSettled(promises);

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0 });
    
    if (failed > 0) {
      setError(`Failed to generate ${failed} mockup(s).`);
    }
  };

  const downloadImage = (url: string, id: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `mockup-${id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const regenerateGraphic = async (graphic: GeneratedGraphic) => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 1 });
    setError(null);

    try {
      let finalAspectRatio = graphic.aspectRatio;
      if (graphic.aspectRatio.includes('x')) {
        const [wStr, hStr] = graphic.aspectRatio.split('x');
        const w = parseInt(wStr, 10);
        const h = parseInt(hStr, 10);
        const divisor = gcd(w, h);
        finalAspectRatio = `${w / divisor}:${h / divisor}`;
      }

      const parts: any[] = [
        {
          inlineData: {
            data: graphic.sourceScreen.base64,
            mimeType: graphic.sourceScreen.file.type || 'image/png'
          }
        },
        { text: graphic.aspectRatio.includes('x') ? `${graphic.prompt} (Generate with exact aspect ratio ${graphic.aspectRatio.replace('x', ':')})` : graphic.prompt }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: finalAspectRatio as any
          }
        }
      });

      let newImageUrl: string | null = null;
      
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            newImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (newImageUrl) {
        setGeneratedGraphics(prev => [{
          id: Math.random().toString(36).substring(7),
          url: newImageUrl!,
          prompt: graphic.prompt,
          aspectRatio: graphic.aspectRatio,
          sourceScreen: graphic.sourceScreen
        }, ...prev]);
      } else {
        setError('Failed to re-generate image. No image data returned.');
      }
    } catch (err) {
      console.error('Error re-generating graphic:', err);
      setError('An error occurred while re-generating the graphic.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full font-sans flex flex-col lg:overflow-hidden selection:bg-[#93c5fd] selection:text-black">
      {/* Header */}
      <header className="shrink-0 border-b-4 border-black px-6 py-4 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ffc900] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center rounded-xl">
            <LayoutTemplate className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
            Mockup Generator
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block font-bold text-sm border-4 border-black px-3 py-1 bg-[#bbf7d0] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
            v2.5 Flash
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Left Sidebar - Assets */}
        <aside className="w-full lg:w-80 xl:w-96 border-b-4 lg:border-b-0 lg:border-r-4 border-black bg-white flex flex-col shrink-0 z-0 lg:h-full">
          <div className="p-5 border-b-4 border-black bg-[#e0e7ff]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black uppercase">1. Upload Screens</h2>
              <span className="font-bold text-sm bg-white border-2 border-black px-2 py-0.5 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{screens.length}</span>
            </div>
            
            <div 
              {...getRootProps()} 
              className={cn(
                "border-4 border-dashed border-black rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ease-out bg-white",
                isDragActive 
                  ? "bg-[#ffc900] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-[1.02]" 
                  : "hover:bg-[#93c5fd] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 mx-auto mb-3 text-black" strokeWidth={2.5} />
              <p className="font-bold text-sm uppercase">Drop Screens Here</p>
              <p className="font-medium text-xs text-gray-600 mt-1">PNG/JPG (MAX 10MB)</p>
            </div>
          </div>

          <div className="flex-1 lg:overflow-y-auto p-5 bg-white">
            {screens.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-black space-y-4 opacity-50">
                <ImageIcon className="w-12 h-12" strokeWidth={2} />
                <p className="font-bold text-sm uppercase text-center">No screens uploaded</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {screens.map((screen) => {
                    const isSelected = selectedScreenIds.has(screen.id);
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={screen.id}
                        onClick={() => toggleScreenSelection(screen.id)}
                        className={cn(
                          "relative group rounded-xl overflow-hidden cursor-pointer border-4 transition-all duration-200",
                          isSelected 
                            ? "border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1" 
                            : "border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
                        )}
                      >
                        <img 
                          src={screen.previewUrl} 
                          alt="Uploaded screen" 
                          className="w-full h-auto object-contain bg-gray-100 block"
                        />
                        
                        {isSelected && (
                          <div className="absolute top-2 left-2 bg-[#ffc900] border-2 border-black rounded-full p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <CheckCircle2 className="w-4 h-4 text-black" strokeWidth={3} />
                          </div>
                        )}

                        <button
                          onClick={(e) => removeScreen(screen.id, e)}
                          className="absolute top-2 right-2 p-1.5 bg-[#ff4d4d] border-2 border-black text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content - Studio */}
        <section className="flex-1 flex flex-col lg:h-full lg:overflow-hidden relative">
          {/* Prompt Area */}
          <div className="border-b-4 border-black bg-[#93c5fd] shrink-0 z-10">
            <div className="p-4 border-b-4 border-black bg-white">
              <h2 className="text-lg font-black uppercase">2. Configure & Generate</h2>
            </div>
            <div className="p-6">
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-6">
                <div className="flex-1 relative flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-xs uppercase flex items-center gap-1 mr-1"><Sparkles className="w-3 h-3" /> Templates:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setPrompt(e.target.value);
                          e.target.value = ""; // Reset after selection
                        }
                      }}
                      className="bg-white border-2 border-black text-black font-bold text-xs px-2 py-1.5 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all max-w-[250px] truncate appearance-none"
                    >
                      <option value="">✨ Choose a template...</option>
                      {TEMPLATE_CATEGORIES.map(category => (
                        <optgroup key={category.name} label={category.name}>
                          {category.templates.map(t => (
                            <option key={t.label} value={t.prompt}>{t.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your mockup... (e.g., 'Place this screen in an isometric clay iPhone mockup on a bright yellow background')"
                    className="w-full flex-1 min-h-[128px] bg-white border-4 border-black rounded-2xl p-4 text-black font-medium text-base placeholder:text-gray-500 focus:outline-none focus:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-shadow resize-none"
                  />
                </div>
                
                <div className="w-full sm:w-64 flex flex-col gap-4">
                  <div className="space-y-2">
                    <label className="font-black text-sm uppercase">Aspect Ratio</label>
                    <div className="relative">
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full bg-white border-4 border-black rounded-xl px-4 py-3 text-base font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] appearance-none cursor-pointer transition-shadow"
                      >
                        {ASPECT_RATIOS.map(ratio => (
                          <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                        ▼
                      </div>
                    </div>
                  </div>

                  {aspectRatio === 'custom' && (
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="font-black text-sm uppercase">Width</label>
                        <input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                          className="w-full bg-white border-4 border-black rounded-xl px-4 py-3 text-base font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                          placeholder="1920"
                          min="1"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="font-black text-sm uppercase">Height</label>
                        <input
                          type="number"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(e.target.value)}
                          className="w-full bg-white border-4 border-black rounded-xl px-4 py-3 text-base font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                          placeholder="1080"
                          min="1"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={generateGraphic}
                    disabled={isGenerating || selectedScreenIds.size === 0 || !prompt.trim()}
                    className="w-full mt-auto bg-[#ffc900] border-4 border-black text-black disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 font-black text-lg py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
                  >
                    {isGenerating ? (
                      <div className="flex flex-col items-center w-full gap-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} /> 
                          <span>Generating ({generationProgress.current}/{generationProgress.total})</span>
                        </div>
                        {generationProgress.total > 1 && (
                          <div className="w-full h-2 bg-white border-2 border-black rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#93c5fd] transition-all duration-300"
                              style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-6 h-6" strokeWidth={3} /> 
                        Generate
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-5xl mx-auto mt-6 bg-[#ff4d4d] border-4 border-black text-white px-4 py-3 rounded-xl font-bold text-sm flex items-start gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <X className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={3} />
                  <p>{error}</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Results Gallery */}
          <div className="flex-1 lg:overflow-y-auto p-6 relative">
            <div className="max-w-6xl mx-auto">
              {generatedGraphics.length === 0 ? (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-black space-y-6">
                  <div className="w-24 h-24 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center rounded-2xl rotate-3">
                    <Wand2 className="w-10 h-10" strokeWidth={2.5} />
                  </div>
                  <div className="text-center bg-white border-4 border-black p-6 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-1 max-w-md">
                    <p className="text-xl font-black uppercase mb-2">Ready to Generate</p>
                    <p className="text-sm font-medium text-gray-700">Select screens, write a prompt, and hit generate to see your mockups appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  <AnimatePresence>
                    {generatedGraphics.map((graphic) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={graphic.id}
                        className="group bg-white border-4 border-black rounded-2xl flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 overflow-hidden"
                      >
                        <div className="relative bg-gray-100 flex items-center justify-center overflow-hidden border-b-4 border-black">
                          {/* Checkerboard pattern */}
                          <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                          }} />
                          <img 
                            src={graphic.url} 
                            alt={graphic.prompt}
                            className="relative z-10 w-full h-auto max-h-[400px] object-contain"
                          />
                          
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex items-center justify-center gap-4 backdrop-blur-sm">
                            <button
                              onClick={() => setViewingGraphic(graphic)}
                              className="bg-[#ffc900] border-4 border-black text-black font-black text-sm py-3 px-4 rounded-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#e6b500] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                            >
                              <Maximize2 className="w-5 h-5" strokeWidth={2.5} />
                              View
                            </button>
                            <button
                              onClick={() => downloadImage(graphic.url, graphic.id)}
                              className="bg-[#bbf7d0] border-4 border-black text-black font-black text-sm py-3 px-4 rounded-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#86efac] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                            >
                              <Download className="w-5 h-5" strokeWidth={2.5} />
                              Download
                            </button>
                          </div>
                        </div>
                        <div className="p-5 bg-white">
                          <p className="font-bold text-sm text-black line-clamp-2 leading-relaxed" title={graphic.prompt}>
                            {graphic.prompt}
                          </p>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs bg-[#e0e7ff] border-2 border-black px-2 py-1 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {graphic.aspectRatio}
                              </span>
                              {graphic.sourceScreen && (
                                <img 
                                  src={graphic.sourceScreen.previewUrl} 
                                  alt="Source" 
                                  className="w-6 h-6 object-cover border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                                  title="Original Source Screen" 
                                />
                              )}
                            </div>
                            <button
                              onClick={() => regenerateGraphic(graphic)}
                              disabled={isGenerating}
                              className="bg-[#ffc900] border-2 border-black text-black font-black text-xs py-1.5 px-3 rounded-md flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Re-generate with same prompt and screen"
                            >
                              <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} strokeWidth={3} />
                              Re-generate
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Fullscreen Viewer Modal */}
      <AnimatePresence>
        {viewingGraphic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingGraphic(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-4 border-black rounded-2xl shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col max-w-6xl w-full max-h-full overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b-4 border-black bg-[#93c5fd]">
                <h3 className="font-black text-lg uppercase truncate pr-4">Mockup Viewer</h3>
                <button
                  onClick={() => setViewingGraphic(null)}
                  className="bg-white border-4 border-black p-1 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                >
                  <X className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center relative" style={{
                backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}>
                <img
                  src={viewingGraphic.url}
                  alt={viewingGraphic.prompt}
                  className="max-w-full max-h-full object-contain border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
                />
              </div>
              <div className="p-4 border-t-4 border-black bg-white flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex-1">
                  <p className="font-bold text-sm text-black line-clamp-2">{viewingGraphic.prompt}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-black text-xs bg-[#e0e7ff] border-2 border-black px-2 py-1 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {viewingGraphic.aspectRatio}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      regenerateGraphic(viewingGraphic);
                      setViewingGraphic(null);
                    }}
                    className="flex-1 sm:flex-none bg-[#ffc900] border-4 border-black text-black font-black text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                  >
                    <RefreshCw className="w-4 h-4" strokeWidth={3} />
                    Re-generate
                  </button>
                  <button
                    onClick={() => downloadImage(viewingGraphic.url, viewingGraphic.id)}
                    className="flex-1 sm:flex-none bg-[#bbf7d0] border-4 border-black text-black font-black text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                  >
                    <Download className="w-4 h-4" strokeWidth={3} />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
