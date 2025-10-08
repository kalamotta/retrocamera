// This file has been renamed to RetroCamera.tsx
// Please use the new RetroCamera component instead
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const outRef = useRef<HTMLCanvasElement | null>(null);     // preview canvas
  const srcRef = useRef<HTMLCanvasElement | null>(null);     // low-res processed source

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [hasCapture, setHasCapture] = useState(false);

  const [levels, setLevels] = useState(4);               // 2/4/8/16 shades
  const [palette, setPalette] = useState<Palette>("gb"); // default pea-soup
  const [dither, setDither] = useState(true);
  const [captureW, setCaptureW] = useState(320);         // 160/320/480
  const [exportScale, setExportScale] = useState<1|2|4|6>(2); // 1x/2x/4x/6x

  const PREVIEW_SCALE = 6; // preview pixel size stays constant (doesn't follow export size)

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setRunning(true);
        setStatus("camera running");
      }
    } catch (e) {
      console.error(e);
      setStatus("failed to start camera (check HTTPS & permissions)");
    }
  }

  function quantizeWithOptions(img: ImageData, N: number, useDither: boolean, pal: Palette) {
    const data = img.data;
    const step = 255 / (N - 1);

    // pea-soup green endpoints
    const gbStart = [18, 56, 18];
    const gbEnd   = [172, 196, 46];

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];

        let gray = luminance(r, g, b);
        if (useDither) {
          const t = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
          gray = clamp(gray + t * step, 0, 255);
        }
        const q = Math.round(gray / step) * step;

        if (pal === "gray") {
          data[i] = data[i+1] = data[i+2] = q;
        } else {
          const tt = q / 255;
          data[i]   = Math.round(gbStart[0] + (gbEnd[0] - gbStart[0]) * tt);
          data[i+1] = Math.round(gbStart[1] + (gbEnd[1] - gbStart[1]) * tt);
          data[i+2] = Math.round(gbStart[2] + (gbEnd[2] - gbStart[2]) * tt);
        }
        data[i+3] = a;
      }
    }
    return img;
  }

  // draw src -> preview (nearest-neighbor)
  function drawPreview(sx: number, sy: number) {
    const out = outRef.current!;
    const src = srcRef.current!;
    const octx = out.getContext("2d")!;
    const outW = sx * PREVIEW_SCALE;
    const outH = sy * PREVIEW_SCALE;
    out.width = outW;
    out.height = outH;
    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, outW, outH);
    octx.drawImage(src, 0, 0, sx, sy, 0, 0, outW, outH);
  }

  function capture() {
    const video = videoRef.current!;
    if (!video.videoWidth || !video.videoHeight) {
      setStatus("waiting for video… try again");
      return;
    }
    setStatus("capturing…");

    const src = (srcRef.current ||= document.createElement("canvas"));
    const sctx = src.getContext("2d", { willReadFrequently: true })!;

    const targetW = captureW;
    const targetH = Math.round((video.videoHeight / video.videoWidth) * targetW);
    src.width = targetW;
    src.height = targetH;

    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(video, 0, 0, targetW, targetH);

    let frame = sctx.getImageData(0, 0, targetW, targetH);
    frame = quantizeWithOptions(frame, levels, dither, palette);
    sctx.putImageData(frame, 0, 0);

    drawPreview(targetW, targetH);
    setHasCapture(true);
    setStatus("captured");
  }

  function download() {
    if (!hasCapture || !srcRef.current) return;

    const src = srcRef.current;
    const tw = src.width * exportScale;
    const th = src.height * exportScale;

    const tmp = document.createElement("canvas");
    const tctx = tmp.getContext("2d")!;
    tmp.width = tw;
    tmp.height = th;
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, tw, th);

    const url = tmp.toDataURL("image/png");
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `photo-${exportScale}x.png`; // filename requirement
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black min-h-screen p-4">
      {/* Game Boy Camera Housing */}
      <div className="relative w-[1000px] h-[1000px] bg-gradient-to-b from-[#e8e0d0] to-[#d4c8b8] shadow-2xl rounded-2xl overflow-hidden border-4 border-[#c4b8a8]">
        
        {/* Top bezel with Game Boy Camera branding */}
        <div className="bg-gradient-to-b from-[#f0e8d8] to-[#e8e0d0] border-b-2 border-[#c4b8a8] p-4 text-center relative">
          {/* Decorative corner elements */}
          <div className="absolute top-2 left-4 w-2 h-2 bg-[#c4b8a8] rounded-full"></div>
          <div className="absolute top-2 right-4 w-2 h-2 bg-[#c4b8a8] rounded-full"></div>
          
          <div className="text-[#2d2d2d] font-bold text-lg tracking-wider">GAME BOY</div>
          <div className="text-[#666] text-sm tracking-widest -mt-1">CAMERA</div>
          
          {/* Power indicator LED */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm animate-pulse"></div>
            <div className="text-[8px] text-[#666] tracking-widest">PWR</div>
          </div>
        </div>

        {/* Main content area */}
        <div className="bg-[#0f380f] m-4 rounded-lg shadow-inner border-2 border-[#c4b8a8] h-[calc(100%-12rem)] p-3 flex gap-3">
          {/* Left side: Stacked screens */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Live View Screen */}
            <div className="bg-gradient-to-b from-[#9BBD0F] to-[#8BAC0F] rounded-lg p-1 shadow-inner border-2 border-[#306230] flex-1">
              <div className="bg-[#9BBD0F] rounded p-3 h-full flex flex-col">
                {/* Screen header */}
                <div className="text-center mb-2">
                  <div className="text-[#0f380f] font-bold text-xs tracking-widest">● LIVE VIEW ●</div>
                </div>
                
                {/* Video preview area */}
                <div className="bg-[#0f380f] rounded-lg p-2 mb-3 flex-1 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full rounded bg-black object-cover"
                    style={{ 
                      filter: 'contrast(1.1) brightness(0.95)',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
                
                {/* Camera controls */}
                <div className="flex justify-center gap-3 mb-2">
                  <Button
                    onClick={startCamera}
                    disabled={running}
                    className="relative bg-gradient-to-b from-[#1a4a1a] to-[#0f380f] text-[#9BBD0F] hover:from-[#225522] hover:to-[#1a4a1a] px-4 py-2 text-xs font-bold rounded-lg border-2 border-[#0f380f] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-150 active:scale-95"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    <CameraIcon className="mr-1 h-3 w-3" />
                    {running ? "READY" : "START"}
                    {!running && (
                      <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                    )}
                  </Button>
                  <Button
                    onClick={capture}
                    disabled={!running}
                    className="relative bg-gradient-to-b from-[#4a7a3a] to-[#306230] text-[#9BBD0F] hover:from-[#558a45] hover:to-[#3a6e3a] px-4 py-2 text-xs font-bold rounded-lg border-2 border-[#306230] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-150 active:scale-95"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    📸 SNAP!
                    {running && (
                      <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </Button>
                </div>
                
                <div className="text-center">
                  <div className="text-[#0f380f] text-[10px] font-bold tracking-wide">STATUS: {status.toUpperCase()}</div>
                  {!running && (
                    <div className="text-[#306230] text-[8px] mt-1">Camera needs HTTPS or localhost</div>
                  )}
                </div>
              </div>
            </div>

            {/* Captured Image Screen */}
            <div className="bg-gradient-to-b from-[#9BBD0F] to-[#8BAC0F] rounded-lg p-1 shadow-inner border-2 border-[#306230] flex-1">
              <div className="bg-[#9BBD0F] rounded p-3 h-full flex flex-col">
                {/* Output header */}
                <div className="text-center mb-2">
                  <div className="text-[#0f380f] font-bold text-xs tracking-widest">● CAPTURED IMAGE ●</div>
                </div>
                
                {/* Output canvas area */}
                <div className="bg-[#0f380f] rounded-lg p-2 flex-1 flex items-center justify-center">
                  {hasCapture ? (
                    <canvas
                      ref={outRef}
                      className="rounded bg-black shadow-lg max-w-full max-h-full"
                      style={{ imageRendering: 'pixelated' }}
                      aria-label="Processed capture canvas"
                    />
                  ) : (
                    <div className="text-[#9BBD0F] text-center">
                      <div className="text-3xl mb-2">📷</div>
                      <div className="text-sm font-bold tracking-wide">NO IMAGE</div>
                      <div className="text-xs mt-1 opacity-70">Take a photo to see it here</div>
                    </div>
                  )}
                </div>
                
                {hasCapture && (
                  <div className="text-center mt-2">
                    <div className="text-[#0f380f] text-[10px] font-bold tracking-wide">READY TO DOWNLOAD</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Settings Panel */}
          <div className="w-[260px] bg-gradient-to-b from-[#f0e8d8] to-[#e0d8c8] rounded-lg p-3 border-2 border-[#c4b8a8] shadow-lg overflow-auto">
            <div className="text-center mb-3">
              <div className="text-[#2d2d2d] font-bold text-sm tracking-wider">SETTINGS</div>
            </div>

            <div className="space-y-3">
              {/* Shades */}
              <div className="bg-white/20 rounded-lg p-3 border border-[#b4a894]">
                <Label className="text-xs font-bold text-[#2d2d2d] tracking-wide block mb-2">SHADES</Label>
                <Select value={String(levels)} onValueChange={(v) => setLevels(parseInt(v, 10))}>
                  <SelectTrigger className="h-8 w-full bg-white border-2 border-[#b4a894] text-[#2d2d2d] text-xs font-bold">
                    <SelectValue placeholder="Shades" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-[#2d2d2d]">
                    <SelectItem value="2">2 (B&W)</SelectItem>
                    <SelectItem value="4">4 (Classic)</SelectItem>
                    <SelectItem value="8">8 Shades</SelectItem>
                    <SelectItem value="16">16 Shades</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Palette */}
              <div className="bg-white/20 rounded-lg p-3 border border-[#b4a894]">
                <Label className="text-xs font-bold text-[#2d2d2d] tracking-wide block mb-2">COLOR</Label>
                <Select value={palette} onValueChange={(v) => setPalette(v as Palette)}>
                  <SelectTrigger className="h-8 w-full bg-white border-2 border-[#b4a894] text-[#2d2d2d] text-xs font-bold">
                    <SelectValue placeholder="Palette" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-[#2d2d2d]">
                    <SelectItem value="gb">Game Boy Green</SelectItem>
                    <SelectItem value="gray">Grayscale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dither */}
              <div className="bg-white/20 rounded-lg p-3 border border-[#b4a894]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#2d2d2d] tracking-wide">DITHER</Label>
                  <Switch 
                    checked={dither} 
                    onCheckedChange={setDither}
                    className="data-[state=checked]:bg-[#0f380f] data-[state=unchecked]:bg-[#b4a894]"
                  />
                </div>
              </div>

              {/* Resolution */}
              <div className="bg-white/20 rounded-lg p-3 border border-[#b4a894]">
                <Label className="text-xs font-bold text-[#2d2d2d] tracking-wide block mb-2">SIZE</Label>
                <Select value={String(captureW)} onValueChange={(v) => setCaptureW(parseInt(v, 10))}>
                  <SelectTrigger className="h-8 w-full bg-white border-2 border-[#b4a894] text-[#2d2d2d] text-xs font-bold">
                    <SelectValue placeholder="Resolution" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-[#2d2d2d]">
                    <SelectItem value="160">Classic (160px)</SelectItem>
                    <SelectItem value="320">Double (320px)</SelectItem>
                    <SelectItem value="480">Triple (480px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Scale */}
              <div className="bg-white/20 rounded-lg p-3 border border-[#b4a894]">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold text-[#2d2d2d] tracking-wide">EXPORT</Label>
                  <span className="text-xs font-bold text-[#2d2d2d]">{exportScale}×</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[1,2,4,6].map((s) => (
                    <Button
                      key={s}
                      onClick={() => setExportScale(s as 1|2|4|6)}
                      className={`h-7 text-xs font-bold rounded border-2 ${
                        exportScale === s
                          ? "bg-[#0f380f] text-white border-[#0f380f]"
                          : "bg-white text-[#2d2d2d] border-[#b4a894] hover:bg-[#f4f4f4]"
                      }`}
                      variant="ghost"
                    >
                      {s}×
                    </Button>
                  ))}
                </div>
              </div>

              {/* Download */}
              <Button
                onClick={download}
                disabled={!hasCapture}
                className="w-full bg-gradient-to-b from-[#1a4a1a] to-[#0f380f] text-white hover:from-[#225522] hover:to-[#1a4a1a] font-bold text-sm py-3 rounded-lg border-2 border-[#0f380f] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-150 active:scale-95"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                <Download className="mr-2 h-4 w-4" />
                DOWNLOAD
                {hasCapture && (
                  <div className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                    {exportScale}×
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Bottom bezel with Nintendo branding */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#e8e0d0] to-[#d4c8b8] border-t-2 border-[#c4b8a8] p-2 text-center relative">
          {/* Decorative elements */}
          <div className="absolute bottom-1 left-4 w-2 h-2 bg-[#c4b8a8] rounded-full"></div>
          <div className="absolute bottom-1 right-4 w-2 h-2 bg-[#c4b8a8] rounded-full"></div>
          
          <div className="text-[#666] text-[10px] tracking-widest font-medium">Nintendo Game Boy Camera</div>
          <div className="text-[#999] text-[8px] tracking-wider">© 1998 Nintendo</div>
        </div>
      </div>
    </div>
  );
}