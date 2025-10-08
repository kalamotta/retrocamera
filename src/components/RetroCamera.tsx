import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Download, Info } from "lucide-react";
import svgPaths from "../imports/svg-nin355ns9z";

type Palette = "gb" | "gray" | "sepia" | "color";

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function luminance(r: number, g: number, b: number) { return 0.2126*r + 0.7152*g + 0.0722*b; }

export default function RetroCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const livePreviewRef = useRef<HTMLCanvasElement | null>(null);
  const outRef = useRef<HTMLCanvasElement | null>(null);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [capturedPhotos, setCapturedPhotos] = useState<{id: number, canvas: HTMLCanvasElement, timestamp: Date}[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [frontCamera, setFrontCamera] = useState<MediaDeviceInfo | null>(null);
  const [backCamera, setBackCamera] = useState<MediaDeviceInfo | null>(null);
  const [selectedCameraType, setSelectedCameraType] = useState<'front' | 'back'>('back');

  const [levels, setLevels] = useState(4);
  const [palette, setPalette] = useState<Palette>("gray");
  const [captureW, setCaptureW] = useState(320);
  const [exportScale, setExportScale] = useState(3);

  // Button options matching Figma design
  const shadesOptions = [2, 4, 8, 16];
  const colorModes = [
    { value: "gb" as Palette, label: "PEA SOUP" },
    { value: "gray" as Palette, label: "GREYSCALE" }
  ];
  const pixelModes = [
    { value: 160, label: "CHUNKY" },
    { value: 320, label: "MEDIUM" },
    { value: 480, label: "FINE" }
  ];

  const PREVIEW_SCALE = 6;

  // Mobile detection and camera enumeration
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Enumerate available cameras
    enumerateCameras();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function enumerateCameras() {
    try {
      // First try to get basic device list
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // If device labels are empty, request permission first
      if (videoDevices.length > 0 && !videoDevices[0].label) {
        try {
          // Request camera permission to get device labels
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          
          // Re-enumerate with permission granted
          devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter(device => device.kind === 'videoinput');
        } catch (permError) {
          console.log('Camera permission not granted, using basic device info');
        }
      }
      
      setAvailableCameras(videoDevices);
      
      // Categorize cameras into front and back
      let frontCam: MediaDeviceInfo | null = null;
      let backCam: MediaDeviceInfo | null = null;
      
      videoDevices.forEach(camera => {
        const label = camera.label.toLowerCase();
        const deviceId = camera.deviceId.toLowerCase();
        
        // Try to identify front camera
        if (label.includes('front') || label.includes('user') || label.includes('facing user') ||
            deviceId.includes('front') || deviceId.includes('user')) {
          if (!frontCam) frontCam = camera;
        }
        // Try to identify back camera  
        else if (label.includes('back') || label.includes('rear') || label.includes('environment') ||
                 deviceId.includes('back') || deviceId.includes('environment')) {
          if (!backCam) backCam = camera;
        }
        // If we can't determine, use as back camera (main camera)
        else if (!backCam) {
          backCam = camera;
        }
      });
      
      // If we still don't have cameras identified, use the first two available
      if (!backCam && videoDevices.length > 0) {
        backCam = videoDevices[0];
      }
      if (!frontCam && videoDevices.length > 1) {
        frontCam = videoDevices[1];
      }
      
      setFrontCamera(frontCam);
      setBackCamera(backCam);
      
    } catch (error) {
      console.error('Error enumerating cameras:', error);
    }
  }

  function stopCamera() {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    setRunning(false);
    stopLivePreviewLoop();
  }

  async function selectCamera(cameraType: 'front' | 'back') {
    setSelectedCameraType(cameraType);
    
    if (running) {
      // Restart camera with new device
      await startCamera();
    }
  }

  function startLivePreviewLoop() {
    const processFrame = () => {
      if (!running) return;
      
      const video = videoRef.current;
      const liveCanvas = livePreviewRef.current;
      if (!video || !liveCanvas || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = liveCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Fixed output resolution for consistent display
      const outputW = 480;
      const outputH = Math.round((video.videoHeight / video.videoWidth) * outputW);
      
      if (liveCanvas.width !== outputW || liveCanvas.height !== outputH) {
        liveCanvas.width = outputW;
        liveCanvas.height = outputH;
      }

      // Processing resolution based on size setting (creates pixel blockiness)
      const processW = captureW;
      const processH = Math.round((video.videoHeight / video.videoWidth) * processW);

      // Create temporary canvas for processing at lower resolution
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (!tempCtx) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      
      tempCanvas.width = processW;
      tempCanvas.height = processH;

      // Draw video to temp canvas at processing resolution
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.drawImage(video, 0, 0, processW, processH);

      // Apply retro effects at processing resolution
      let frame = tempCtx.getImageData(0, 0, processW, processH);
      frame = quantizeWithOptions(frame, levels, true, palette);
      tempCtx.putImageData(frame, 0, 0);

      // Draw processed image to final canvas with nearest neighbor scaling
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, outputW, outputH);
      ctx.drawImage(tempCanvas, 0, 0, processW, processH, 0, 0, outputW, outputH);

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }

  function stopLivePreviewLoop() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  async function startCamera() {
    try {
      // Stop any existing stream
      stopCamera();
      
      let constraints: MediaStreamConstraints = {
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      // Use specific camera based on selection
      const selectedCamera = selectedCameraType === 'front' ? frontCamera : backCamera;
      
      if (selectedCamera) {
        constraints.video = {
          ...constraints.video,
          deviceId: { exact: selectedCamera.deviceId }
        };
      } else {
        // Fallback to facingMode
        constraints.video = {
          ...constraints.video,
          facingMode: selectedCameraType === 'front' ? "user" : "environment"
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) return resolve();
        const onLoaded = () => resolve();
        video.addEventListener("loadedmetadata", onLoaded, { once: true });
      });
      await video.play();
      setRunning(true);
      setViewingPhoto(false); // Switch back to live view
      setStatus("camera running");
      startLivePreviewLoop();
    } catch (e) {
      console.error("[RetroCamera] startCamera error:", e);
      setStatus("failed to start camera (check HTTPS & permissions)");
    }
  }

  function quantizeWithOptions(img: ImageData, N: number, useDither: boolean, pal: Palette) {
    const data = img.data;
    const step = 255 / (N - 1);
    const gbStart = [18, 56, 18];
    const gbEnd   = [172, 196, 46];

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];

        if (pal === "color") {
          // Full color mode - preserve original colors but apply quantization
          if (useDither) {
            const t = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
            const ditheredR = clamp(r + t * step, 0, 255);
            const ditheredG = clamp(g + t * step, 0, 255);
            const ditheredB = clamp(b + t * step, 0, 255);
            data[i] = Math.round(ditheredR / step) * step;
            data[i+1] = Math.round(ditheredG / step) * step;
            data[i+2] = Math.round(ditheredB / step) * step;
          } else {
            data[i] = Math.round(r / step) * step;
            data[i+1] = Math.round(g / step) * step;
            data[i+2] = Math.round(b / step) * step;
          }
        } else if (pal === "sepia") {
          // High contrast sepia tone transformation
          const sepiaR = Math.min(255, (r * 0.45) + (g * 0.85) + (b * 0.22));
          const sepiaG = Math.min(255, (r * 0.40) + (g * 0.78) + (b * 0.20));
          const sepiaB = Math.min(255, (r * 0.25) + (g * 0.58) + (b * 0.12));
          
          if (useDither) {
            const t = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
            const ditheredR = clamp(sepiaR + t * step, 0, 255);
            const ditheredG = clamp(sepiaG + t * step, 0, 255);
            const ditheredB = clamp(sepiaB + t * step, 0, 255);
            data[i] = Math.round(ditheredR / step) * step;
            data[i+1] = Math.round(ditheredG / step) * step;
            data[i+2] = Math.round(ditheredB / step) * step;
          } else {
            data[i] = Math.round(sepiaR / step) * step;
            data[i+1] = Math.round(sepiaG / step) * step;
            data[i+2] = Math.round(sepiaB / step) * step;
          }
        } else {
          // Grayscale-based modes (gray and gb)
          let gray = luminance(r, g, b);
          if (useDither) {
            const t = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
            gray = clamp(gray + t * step, 0, 255);
          }
          const q = Math.round(gray / step) * step;

          if (pal === "gray") {
            data[i] = data[i+1] = data[i+2] = q;
          } else { // gb mode
            const tt = q / 255;
            data[i]   = Math.round(gbStart[0] + (gbEnd[0] - gbStart[0]) * tt);
            data[i+1] = Math.round(gbStart[1] + (gbEnd[1] - gbStart[1]) * tt);
            data[i+2] = Math.round(gbStart[2] + (gbEnd[2] - gbStart[2]) * tt);
          }
        }
        data[i+3] = a;
      }
    }
    return img;
  }

  function drawPreview(sx: number, sy: number, sourceCanvas?: HTMLCanvasElement) {
    const out = outRef.current;
    const src = sourceCanvas || srcRef.current;
    if (!out || !src) return;
    const octx = out.getContext("2d");
    if (!octx) return;

    const outW = sx * PREVIEW_SCALE;
    const outH = sy * PREVIEW_SCALE;
    out.width = outW;
    out.height = outH;
    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, outW, outH);
    octx.drawImage(src, 0, 0, sx, sy, 0, 0, outW, outH);
  }

  async function ensureVideoReady(video: HTMLVideoElement) {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return;
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function capture() {
    try {
      const video = videoRef.current;
      if (!video) return;

      setStatus("preparing…");
      await ensureVideoReady(video);
      if (!video.videoWidth || !video.videoHeight) {
        setStatus("waiting for video… try again");
        return;
      }

      setStatus("capturing…");

      // Fixed output resolution
      const outputW = 480;
      const outputH = Math.round((video.videoHeight / video.videoWidth) * outputW);

      // Processing resolution based on size setting (creates pixel blockiness)
      const processW = captureW;
      const processH = Math.round((video.videoHeight / video.videoWidth) * processW);

      // Create temporary canvas for processing at lower resolution
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (!tempCtx) {
        setStatus("2D context unavailable");
        return;
      }
      
      tempCanvas.width = processW;
      tempCanvas.height = processH;

      // Draw video to temp canvas at processing resolution
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.drawImage(video, 0, 0, processW, processH);

      // Apply retro effects at processing resolution
      let frame = tempCtx.getImageData(0, 0, processW, processH);
      frame = quantizeWithOptions(frame, levels, true, palette);
      tempCtx.putImageData(frame, 0, 0);

      // Create final canvas at output resolution
      const captureCanvas = document.createElement("canvas");
      const captureCtx = captureCanvas.getContext("2d");
      if (!captureCtx) {
        setStatus("2D context unavailable");
        return;
      }

      captureCanvas.width = outputW;
      captureCanvas.height = outputH;

      // Draw processed image to final canvas with nearest neighbor scaling
      captureCtx.imageSmoothingEnabled = false;
      captureCtx.drawImage(tempCanvas, 0, 0, processW, processH, 0, 0, outputW, outputH);

      // Add to photos array
      const newPhoto = {
        id: Date.now(),
        canvas: captureCanvas,
        timestamp: new Date()
      };

      setCapturedPhotos(prev => [...prev, newPhoto]);
      setSelectedPhotoIndex(prev => prev + 1); // Select the new photo
      
      // Also update the preview canvas to show the latest capture
      drawPreview(outputW, outputH, captureCanvas);
      setStatus("captured");
    } catch (err) {
      console.error("[RetroCamera] capture error:", err);
      setStatus("capture failed");
    }
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopLivePreviewLoop();
      stopCamera();
    };
  }, []);

  // Restart preview loop when settings change
  React.useEffect(() => {
    if (running) {
      stopLivePreviewLoop();
      startLivePreviewLoop();
    }
  }, [levels, palette, captureW, running]);

  // Draw selected photo when viewing photo mode changes
  React.useEffect(() => {
    if (viewingPhoto && capturedPhotos.length > 0 && selectedPhotoIndex < capturedPhotos.length) {
      // Small delay to ensure canvas is rendered
      const timer = setTimeout(() => {
        const photo = capturedPhotos[selectedPhotoIndex];
        if (photo) {
          drawPreview(photo.canvas.width, photo.canvas.height, photo.canvas);
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [viewingPhoto, selectedPhotoIndex, capturedPhotos]);

  function download() {
    const selectedPhoto = capturedPhotos[selectedPhotoIndex];
    if (!selectedPhoto) return;

    const src = selectedPhoto.canvas;
    const tw = src.width * exportScale;
    const th = src.height * exportScale;

    const tmp = document.createElement("canvas");
    const tctx = tmp.getContext("2d");
    if (!tctx) {
      setStatus("download failed: no 2D context");
      return;
    }
    tmp.width = tw;
    tmp.height = th;
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, tw, th);

    const url = tmp.toDataURL("image/png");
    const a = document.createElement("a");
    const timestamp = selectedPhoto.timestamp.toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `retro-photo-${timestamp}-${exportScale}x.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function selectPhoto(index: number) {
    if (index >= 0 && index < capturedPhotos.length) {
      setSelectedPhotoIndex(index);
      setViewingPhoto(true);
      stopLivePreviewLoop(); // Stop live preview when viewing a photo
    }
  }

  function clearAllPhotos() {
    setCapturedPhotos([]);
    setSelectedPhotoIndex(0);
    setViewingPhoto(false);
    // Clear the preview canvas
    const out = outRef.current;
    if (out) {
      const octx = out.getContext("2d");
      if (octx) {
        octx.clearRect(0, 0, out.width, out.height);
      }
    }
    // Restart live preview if camera is running
    if (running) {
      startLivePreviewLoop();
    }
  }

  // Render mobile layout
  if (isMobile) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4" data-name="Retro Camera Mobile Layout">
        {/* Mobile Header */}
        <div className="bg-[rgba(229,229,229,0.93)] rounded-lg p-4 relative">
          <div aria-hidden="true" className="absolute border-2 border-[grey] border-solid inset-0 pointer-events-none rounded-lg" />
          
          {/* Info Button */}
          <Dialog open={showInfo} onOpenChange={setShowInfo}>
            <DialogTrigger className="absolute top-2 right-2 p-2 rounded-full hover:bg-[#404040] hover:text-[#e5e5e5] transition-colors duration-200 text-[#808080]">
              <Info size={16} />
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-['IBM_Plex_Mono'] text-center">About</DialogTitle>
              </DialogHeader>
              <div className="text-center py-4">
                <p className="font-['IBM_Plex_Mono'] text-[#808080] text-sm">
                  Created by{" "}
                  <a 
                    href="https://kalebmotter.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#404040] hover:text-[#808080] underline transition-colors duration-200"
                  >
                    Kaleb Motter
                  </a>
                  , 2025
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <h1 className="font-['IBM_Plex_Mono'] text-center text-xl text-black">
            <span className="font-bold">RETRO</span><span className="font-medium">CAMERA</span>
          </h1>
        </div>

        {/* Mobile Camera Section */}
        <div className="bg-[#bfbfbf] rounded-lg p-4 space-y-4 relative">
          <div aria-hidden="true" className="absolute border-2 border-[grey] border-solid inset-0 pointer-events-none rounded-lg" />
          
          <div className="bg-[grey] rounded-lg p-4 space-y-4 relative z-10">
            {/* Mobile Live View */}
            <div className="bg-neutral-200 rounded-lg p-4 relative">
              <div className="bg-black rounded-lg aspect-[4/3] relative overflow-hidden">
                {/* Hidden video element for capturing frames */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                />
                
                {/* Live preview canvas */}
                {!viewingPhoto && (
                  <canvas
                    ref={livePreviewRef}
                    className="w-full h-full rounded-lg bg-black object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                
                {/* Photo viewer canvas */}
                {viewingPhoto && (
                  <canvas
                    ref={outRef}
                    className="w-full h-full rounded-lg bg-black object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                
                {/* Status Overlays */}
                {!running && !viewingPhoto && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-200 bg-transparent rounded-lg">
                    <div className="text-4xl mb-3">📹</div>
                    <div className="text-base font-bold tracking-wide">CAMERA OFF</div>
                    <div className="text-sm mt-2 opacity-70 text-center">Start camera to see preview</div>
                  </div>
                )}
                
                {viewingPhoto && capturedPhotos.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(240,241,242,0.92)] rounded-lg">
                    <div className="text-4xl mb-3">📷</div>
                    <div className="text-base font-bold tracking-wide text-black">NO PHOTOS</div>
                    <div className="text-sm mt-2 opacity-70 text-black text-center">Take photos to start your gallery</div>
                  </div>
                )}
              </div>
              
              {/* Mobile Camera Controls */}
              <div className="flex flex-col gap-3 mt-4">
                {/* Camera Selector Dropdown - Show on mobile if both front and back cameras available */}
                {isMobile && frontCamera && backCamera && (
                  <div className="w-full">
                    <p className="font-['IBM_Plex_Mono'] font-medium text-sm text-black mb-2">SELECT CAMERA</p>
                    <Select 
                      value={selectedCameraType} 
                      onValueChange={(value: 'front' | 'back') => selectCamera(value)}
                    >
                      <SelectTrigger className="bg-neutral-200 border border-[grey] rounded-lg px-4 py-3 w-full font-['IBM_Plex_Mono'] font-bold text-sm text-[#404040]">
                        <SelectValue placeholder="Choose camera..." />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-200 border border-[grey] rounded-lg">
                        <SelectItem 
                          value="back"
                          className="font-['IBM_Plex_Mono'] font-medium text-sm text-[#404040] hover:bg-[grey] hover:text-neutral-200"
                        >
                          Back Camera
                        </SelectItem>
                        <SelectItem 
                          value="front"
                          className="font-['IBM_Plex_Mono'] font-medium text-sm text-[#404040] hover:bg-[grey] hover:text-neutral-200"
                        >
                          Front Camera
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <button
                  onClick={viewingPhoto ? startCamera : (running ? capture : startCamera)}
                  className="bg-neutral-200 flex items-center justify-center gap-2 px-4 py-3 rounded-lg w-full transition-all duration-200 border border-[grey]"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#404040';
                    const text = e.currentTarget.querySelector('span');
                    const paths = e.currentTarget.querySelectorAll('path');
                    if (text) text.style.color = '#e5e5e5';
                    paths.forEach(path => {
                      if (path.hasAttribute('stroke')) {
                        path.setAttribute('stroke', '#e5e5e5');
                      }
                    });
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e5e5';
                    const text = e.currentTarget.querySelector('span');
                    const paths = e.currentTarget.querySelectorAll('path');
                    if (text) text.style.color = '#404040';
                    paths.forEach(path => {
                      if (path.hasAttribute('stroke')) {
                        path.setAttribute('stroke', '#808080');
                      }
                    });
                  }}
                >
                  <div className="relative shrink-0 size-[14px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                      <g>
                        <path 
                          d={svgPaths.pd1fd280} 
                          stroke="#808080" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="1.16667" 
                          style={{ transition: 'stroke 0.2s' }}
                        />
                        <path 
                          d={svgPaths.p23779700} 
                          stroke="#808080" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="1.16667" 
                          style={{ transition: 'stroke 0.2s' }}
                        />
                      </g>
                    </svg>
                  </div>
                  <span className="font-['IBM_Plex_Mono'] font-bold text-sm text-[#404040]" style={{ transition: 'color 0.2s' }}>
                    {viewingPhoto ? "BACK TO LIVE" : running ? "CAPTURE" : "START CAMERA"}
                  </span>
                </button>

                {/* Download Button - Show when viewing a photo */}
                {viewingPhoto && capturedPhotos.length > 0 && (
                  <button
                    onClick={download}
                    className="bg-neutral-200 flex items-center justify-center gap-2 px-4 py-3 rounded-lg w-full transition-all duration-200 border border-[grey]"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#404040';
                      const text = e.currentTarget.querySelector('span');
                      const paths = e.currentTarget.querySelectorAll('path');
                      if (text) text.style.color = '#e5e5e5';
                      paths.forEach(path => {
                        if (path.hasAttribute('fill')) {
                          path.setAttribute('fill', '#e5e5e5');
                        }
                      });
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e5e5';
                      const text = e.currentTarget.querySelector('span');
                      const paths = e.currentTarget.querySelectorAll('path');
                      if (text) text.style.color = '#404040';
                      paths.forEach(path => {
                        if (path.hasAttribute('fill')) {
                          path.setAttribute('fill', '#808080');
                        }
                      });
                    }}
                  >
                    <div className="relative shrink-0 size-[14px]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                        <g>
                          <path 
                            d={svgPaths.p2a307200} 
                            fill="#808080" 
                            style={{ transition: 'fill 0.2s' }}
                          />
                        </g>
                      </svg>
                    </div>
                    <span className="font-['IBM_Plex_Mono'] font-bold text-sm text-[#404040]" style={{ transition: 'color 0.2s' }}>
                      DOWNLOAD
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Settings */}
            <div className="bg-neutral-200 rounded-lg p-4 space-y-4 relative">
              {/* Color Mode */}
              <div>
                <p className="font-['IBM_Plex_Mono'] font-medium text-sm text-black mb-2">COLOR MODE</p>
                <div className="flex gap-2">
                  {colorModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setPalette(mode.value)}
                      className={`flex-1 rounded border px-3 py-2 ${
                        palette === mode.value ? "bg-[grey] text-neutral-200 border-[grey]" : "bg-neutral-200 text-neutral-700 border-neutral-700"
                      }`}
                    >
                      <p className="font-['IBM_Plex_Mono'] font-medium text-xs text-center">
                        {mode.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shades */}
              <div>
                <p className="font-['IBM_Plex_Mono'] font-medium text-sm text-black mb-2">SHADES</p>
                <div className="flex gap-2">
                  {shadesOptions.map((shadeCount) => (
                    <button
                      key={shadeCount}
                      onClick={() => setLevels(shadeCount)}
                      className={`flex-1 rounded border px-3 py-2 ${
                        levels === shadeCount ? "bg-[grey] text-neutral-200 border-[grey]" : "bg-neutral-200 text-neutral-700 border-neutral-700"
                      }`}
                    >
                      <p className="font-['IBM_Plex_Mono'] font-medium text-xs text-center">
                        {shadeCount}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pixels */}
              <div>
                <p className="font-['IBM_Plex_Mono'] font-medium text-sm text-black mb-2">PIXELS</p>
                <div className="flex gap-2">
                  {pixelModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setCaptureW(mode.value)}
                      className={`flex-1 rounded border px-3 py-2 ${
                        captureW === mode.value ? "bg-[grey] text-neutral-200 border-[grey]" : "bg-neutral-200 text-neutral-700 border-neutral-700"
                      }`}
                    >
                      <p className="font-['IBM_Plex_Mono'] font-medium text-xs text-center">
                        {mode.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Gallery */}
            <div className="bg-neutral-200 rounded-lg p-4 relative">
              <p className="font-['IBM_Plex_Mono'] font-bold text-sm text-black mb-3">GALLERY</p>
              
              {capturedPhotos.length === 0 ? (
                <div className="text-neutral-700 text-sm opacity-70 text-center py-8">No photos yet</div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide min-h-[80px]">
                  {capturedPhotos.map((photo, index) => {
                    const thumbnailCanvas = document.createElement("canvas");
                    const thumbnailCtx = thumbnailCanvas.getContext("2d");
                    if (thumbnailCtx) {
                      const thumbW = 80;
                      const thumbH = 60;
                      thumbnailCanvas.width = thumbW;
                      thumbnailCanvas.height = thumbH;
                      thumbnailCtx.imageSmoothingEnabled = false;
                      
                      // Fill with black background first
                      thumbnailCtx.fillStyle = 'black';
                      thumbnailCtx.fillRect(0, 0, thumbW, thumbH);
                      
                      // Draw image centered
                      const aspectRatio = photo.canvas.width / photo.canvas.height;
                      const targetAspectRatio = thumbW / thumbH;
                      
                      let drawWidth = thumbW;
                      let drawHeight = thumbH;
                      let offsetX = 0;
                      let offsetY = 0;
                      
                      if (aspectRatio > targetAspectRatio) {
                        drawHeight = thumbW / aspectRatio;
                        offsetY = (thumbH - drawHeight) / 2;
                      } else {
                        drawWidth = thumbH * aspectRatio;
                        offsetX = (thumbW - drawWidth) / 2;
                      }
                      
                      thumbnailCtx.drawImage(photo.canvas, offsetX, offsetY, drawWidth, drawHeight);
                    }

                    return (
                      <button
                        key={photo.id}
                        onClick={() => selectPhoto(index)}
                        className={`bg-black rounded-lg shrink-0 w-20 h-15 border-2 ${
                          viewingPhoto && index === selectedPhotoIndex 
                            ? "border-neutral-700" 
                            : "border-[grey]"
                        }`}
                      >
                        <canvas
                          ref={(el) => {
                            if (el && thumbnailCanvas) {
                              el.width = thumbnailCanvas.width;
                              el.height = thumbnailCanvas.height;
                              const ctx = el.getContext("2d");
                              if (ctx) {
                                ctx.drawImage(thumbnailCanvas, 0, 0);
                              }
                            }
                          }}
                          className="w-full h-full object-cover rounded-lg"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Clear All Button */}
              <button
                onClick={clearAllPhotos}
                className="w-full mt-3 bg-neutral-200 border border-[grey] rounded-lg py-2 transition-all duration-200 text-center"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#404040';
                  const text = e.currentTarget.querySelector('span');
                  if (text) text.style.color = '#e5e5e5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e5e5';
                  const text = e.currentTarget.querySelector('span');
                  if (text) text.style.color = '#404040';
                }}
              >
                <span className="font-['IBM_Plex_Mono'] font-bold text-sm text-[#404040]" style={{ transition: 'color 0.2s' }}>
                  CLEAR ALL
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="relative w-[907px] h-[616px] mx-auto my-8" data-name="Retro Camera Layout">
      {/* Top Header */}
      <div className="absolute bg-[rgba(229,229,229,0.93)] box-border flex flex-col gap-[15px] items-center justify-center left-0 p-[15px] rounded-tl-[10px] rounded-tr-[10px] top-0 w-[907px]">
        <div aria-hidden="true" className="absolute border-[4px_4px_2px] border-[grey] border-solid inset-[-2px_-2px_-1px_-2px] pointer-events-none rounded-tl-[12px] rounded-tr-[12px]" />
        
        {/* Info Button */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogTrigger className="absolute top-3 right-3 p-2 rounded-full hover:bg-[#404040] hover:text-[#e5e5e5] transition-colors duration-200 text-[#808080]">
            <Info size={16} />
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['IBM_Plex_Mono'] text-center">About</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="font-['IBM_Plex_Mono'] text-[#808080] text-sm">
                Created by{" "}
                <a 
                  href="https://kalebmotter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#404040] hover:text-[#808080] underline transition-colors duration-200"
                >
                  Kaleb Motter
                </a>
                , 2025
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <p className="font-['IBM_Plex_Mono'] leading-[17.5px] not-italic relative shrink-0 text-[20px] text-black text-nowrap whitespace-pre">
          <span className="font-bold">RETRO</span><span className="font-medium">CAMERA</span>
        </p>
      </div>

      {/* Main Container */}
      <div className="absolute bg-[#bfbfbf] box-border flex flex-col gap-[5px] items-center justify-center left-0 p-[15px] rounded-bl-[10px] rounded-br-[10px] top-[48px] w-[907px]">
        <div aria-hidden="true" className="absolute border-[2px_4px_4px] border-[grey] border-solid inset-[-1px_-2px_-2px_-2px] pointer-events-none rounded-bl-[12px] rounded-br-[12px]" />
        
        <div className="h-[616px] relative shrink-0 w-[877px]">
          <div className="absolute bg-[grey] box-border flex gap-[15px] items-center justify-center left-0 p-[15px] rounded-[10px] top-0 w-[877px]">
            
            {/* Left Content Area */}
            <div className="flex flex-col gap-[15px] items-center justify-center relative shrink-0 w-[640px]">
              
              {/* Preview Panel */}
              <div className="bg-neutral-200 relative rounded-[10px] shrink-0 w-full" data-name="Preview Panel">
                <div className="flex flex-col items-center size-full">
                  <div className="box-border flex flex-col gap-[15px] items-center p-[15px] relative w-full">
                    
                    {/* Live View Display */}
                    <div className="aspect-[1600/900] bg-black rounded-[10px] shrink-0 w-full relative" data-name="Live View">
                      {/* Hidden video element for capturing frames */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                      />
                      
                      {/* Live preview canvas */}
                      {!viewingPhoto && (
                        <canvas
                          ref={livePreviewRef}
                          className="w-full h-full rounded-[10px] bg-black object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      )}
                      
                      {/* Photo viewer canvas */}
                      {viewingPhoto && (
                        <canvas
                          ref={outRef}
                          className="w-full h-full rounded-[10px] bg-black object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      )}
                      
                      {/* Status Overlays */}
                      {!running && !viewingPhoto && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-200 bg-transparent rounded-[10px]">
                          <div className="text-4xl mb-3">📹</div>
                          <div className="text-base font-bold tracking-wide">CAMERA OFF</div>
                          <div className="text-sm mt-2 opacity-70 text-center">Start camera to see preview</div>
                        </div>
                      )}
                      
                      {viewingPhoto && capturedPhotos.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(240,241,242,0.92)] rounded-[10px]">
                          <div className="text-4xl mb-3">📷</div>
                          <div className="text-base font-bold tracking-wide text-black">NO PHOTOS</div>
                          <div className="text-sm mt-2 opacity-70 text-black text-center">Take photos to start your gallery</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Camera Controls */}
                    <div className="flex gap-[15px] items-center justify-center">
                      {/* Main Camera Button */}
                      <div className="relative rounded-[8.75px] shrink-0 w-[150px]" data-name="Button">
                        <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[8.75px]" />
                        <button
                          onClick={viewingPhoto ? startCamera : (running ? capture : startCamera)}
                          className="bg-neutral-200 box-border content-stretch flex gap-[5px] items-center justify-center px-[14px] py-[7px] rounded-[8.75px] w-[150px] transition-all duration-200 group"
                          style={{
                            '--button-bg': '#e5e5e5',
                            '--button-hover-bg': '#404040',
                            '--button-text': '#404040',
                            '--button-hover-text': '#e5e5e5'
                          } as React.CSSProperties}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#404040';
                            const text = e.currentTarget.querySelector('p');
                            const paths = e.currentTarget.querySelectorAll('path');
                            if (text) text.style.color = '#e5e5e5';
                            paths.forEach(path => {
                              if (path.hasAttribute('stroke')) {
                                path.setAttribute('stroke', '#e5e5e5');
                              }
                            });
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#e5e5e5';
                            const text = e.currentTarget.querySelector('p');
                            const paths = e.currentTarget.querySelectorAll('path');
                            if (text) text.style.color = '#404040';
                            paths.forEach(path => {
                              if (path.hasAttribute('stroke')) {
                                path.setAttribute('stroke', '#808080');
                              }
                            });
                          }}
                        >
                          <div className="relative shrink-0 size-[14px]" data-name="Icon">
                            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                              <g id="Icon">
                                <path 
                                  d={svgPaths.pd1fd280} 
                                  id="Vector" 
                                  stroke="#808080" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth="1.16667" 
                                  style={{ transition: 'stroke 0.2s' }}
                                />
                                <path 
                                  d={svgPaths.p23779700} 
                                  id="Vector_2" 
                                  stroke="#808080" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth="1.16667" 
                                  style={{ transition: 'stroke 0.2s' }}
                                />
                              </g>
                            </svg>
                          </div>
                          <p 
                            className="font-['IBM_Plex_Mono'] font-bold leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap whitespace-pre" 
                            style={{ color: '#404040', transition: 'color 0.2s' }}
                          >
                            {viewingPhoto ? "BACK TO LIVE" : running ? "CAPTURE" : "START CAMERA"}
                          </p>
                        </button>
                      </div>

                      {/* Download Button - Show when viewing a photo */}
                      {viewingPhoto && capturedPhotos.length > 0 && (
                        <div className="relative rounded-[8.75px] shrink-0 w-[150px]" data-name="Button">
                          <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[8.75px]" />
                          <button
                            onClick={download}
                            className="bg-neutral-200 box-border content-stretch flex gap-[5px] items-center justify-center px-[14px] py-[7px] rounded-[8.75px] w-[150px] transition-all duration-200 group"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#404040';
                              const text = e.currentTarget.querySelector('p');
                              const paths = e.currentTarget.querySelectorAll('path');
                              if (text) text.style.color = '#e5e5e5';
                              paths.forEach(path => {
                                if (path.hasAttribute('fill')) {
                                  path.setAttribute('fill', '#e5e5e5');
                                }
                              });
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#e5e5e5';
                              const text = e.currentTarget.querySelector('p');
                              const paths = e.currentTarget.querySelectorAll('path');
                              if (text) text.style.color = '#404040';
                              paths.forEach(path => {
                                if (path.hasAttribute('fill')) {
                                  path.setAttribute('fill', '#808080');
                                }
                              });
                            }}
                          >
                            <div className="relative shrink-0 size-[14px]" data-name="Icon">
                              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                                <g id="Icon">
                                  <path 
                                    d={svgPaths.p2a307200} 
                                    id="Line 1 (Stroke)" 
                                    fill="#808080" 
                                    style={{ transition: 'fill 0.2s' }}
                                  />
                                </g>
                              </svg>
                            </div>
                            <p 
                              className="font-['IBM_Plex_Mono'] font-bold leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap whitespace-pre"
                              style={{ color: '#404040', transition: 'color 0.2s' }}
                            >
                              DOWNLOAD
                            </p>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>



              {/* Settings Panel */}
              <div className="bg-neutral-200 relative rounded-[10px] shrink-0 w-full" data-name="Settings Panel">
                <div className="flex flex-col items-center justify-center overflow-clip size-full">
                  <div className="box-border flex flex-col gap-[10px] items-center justify-center px-[15px] py-[25px] relative w-full">
                    
                    {/* Setting Options Container */}
                    <div className="flex gap-[5px] items-center justify-center relative shrink-0" data-name="Setting Options">
                      
                      {/* Color Mode */}
                      <div className="bg-neutral-200 relative rounded-[10px] shrink-0" data-name="Color">
                        <div className="box-border flex flex-col items-start overflow-clip p-[5px] relative">
                          <div className="relative shrink-0 w-full">
                            <div className="flex flex-row items-center size-full">
                              <div className="box-border flex gap-[5px] items-center pb-0 pt-[15px] px-[15px] relative w-full">
                                <p className="font-['IBM_Plex_Mono'] font-medium leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">COLOR MODE</p>
                              </div>
                            </div>
                          </div>
                          <div className="box-border flex gap-[5px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0">
                            {colorModes.map((mode) => (
                              <button
                                key={mode.value}
                                onClick={() => setPalette(mode.value)}
                                className={`relative rounded-[5px] shrink-0 w-[80px] ${
                                  palette === mode.value ? "bg-[grey]" : "bg-neutral-200"
                                }`}
                              >
                                <div className="box-border flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[80px]">
                                  <p className={`font-['IBM_Plex_Mono'] font-medium leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap whitespace-pre ${
                                    palette === mode.value ? "text-neutral-200" : "text-neutral-700"
                                  }`}>
                                    {mode.label}
                                  </p>
                                </div>
                                <div aria-hidden="true" className={`absolute border border-solid inset-0 pointer-events-none rounded-[5px] ${
                                  palette === mode.value ? "border-[grey]" : "border-neutral-700"
                                }`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div aria-hidden="true" className="absolute border border-[#bfbfbf] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      </div>

                      {/* Shades */}
                      <div className="bg-neutral-200 relative rounded-[10px] shrink-0" data-name="Shades">
                        <div className="box-border flex flex-col items-start overflow-clip p-[5px] relative">
                          <div className="relative shrink-0 w-full">
                            <div className="flex flex-row items-center size-full">
                              <div className="box-border flex gap-[5px] items-center pb-0 pt-[15px] px-[15px] relative w-full">
                                <p className="font-['IBM_Plex_Mono'] font-medium leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">SHADES</p>
                              </div>
                            </div>
                          </div>
                          <div className="box-border flex gap-[5px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0">
                            {shadesOptions.map((shadeCount) => (
                              <button
                                key={shadeCount}
                                onClick={() => setLevels(shadeCount)}
                                className={`relative rounded-[5px] shrink-0 w-[30px] ${
                                  levels === shadeCount ? "bg-[grey]" : "bg-neutral-200"
                                }`}
                              >
                                <div className="box-border flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[30px]">
                                  <p className={`font-['IBM_Plex_Mono'] font-medium leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap whitespace-pre ${
                                    levels === shadeCount ? "text-neutral-200" : "text-neutral-700"
                                  }`}>
                                    {shadeCount}
                                  </p>
                                </div>
                                <div aria-hidden="true" className={`absolute border border-solid inset-0 pointer-events-none rounded-[5px] ${
                                  levels === shadeCount ? "border-[grey]" : "border-neutral-700"
                                }`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div aria-hidden="true" className="absolute border border-[#bfbfbf] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      </div>

                      {/* Pixels */}
                      <div className="bg-neutral-200 relative rounded-[10px] shrink-0" data-name="Pixels">
                        <div className="box-border flex flex-col items-start overflow-clip p-[5px] relative">
                          <div className="relative shrink-0 w-full">
                            <div className="flex flex-row items-center size-full">
                              <div className="box-border flex gap-[5px] items-center pb-0 pt-[15px] px-[15px] relative w-full">
                                <p className="font-['IBM_Plex_Mono'] font-medium leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">PIXELS</p>
                              </div>
                            </div>
                          </div>
                          <div className="box-border flex gap-[5px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0">
                            {pixelModes.map((mode) => (
                              <button
                                key={mode.value}
                                onClick={() => setCaptureW(mode.value)}
                                className={`relative rounded-[5px] shrink-0 w-[55px] ${
                                  captureW === mode.value ? "bg-[grey]" : "bg-neutral-200"
                                }`}
                              >
                                <div className="box-border flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[55px]">
                                  <p className={`font-['IBM_Plex_Mono'] font-medium leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap whitespace-pre ${
                                    captureW === mode.value ? "text-neutral-200" : "text-neutral-700"
                                  }`}>
                                    {mode.label}
                                  </p>
                                </div>
                                <div aria-hidden="true" className={`absolute border border-solid inset-0 pointer-events-none rounded-[5px] ${
                                  captureW === mode.value ? "border-[grey]" : "border-neutral-700"
                                }`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div aria-hidden="true" className="absolute border border-[#bfbfbf] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div className="bg-neutral-200 box-border flex flex-col gap-[15px] h-[586px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0 w-[192px]" data-name="Gallery">
              <p className="font-['IBM_Plex_Mono'] font-bold leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">GALLERY</p>
              
              {/* Captured Images */}
              <div className="flex flex-col gap-[15px] h-[480px] items-start overflow-y-auto scrollbar-hide relative shrink-0 w-full" data-name="CAPTURED IMAGES">
                {capturedPhotos.length === 0 ? (
                  <div className="text-neutral-700 text-sm opacity-70 text-center py-8 w-full">No photos yet</div>
                ) : (
                  capturedPhotos.map((photo, index) => {
                    const thumbnailCanvas = document.createElement("canvas");
                    const thumbnailCtx = thumbnailCanvas.getContext("2d");
                    if (thumbnailCtx) {
                      const thumbW = 162; // Match container width minus padding
                      const thumbH = 90;  // Fixed height from design
                      thumbnailCanvas.width = thumbW;
                      thumbnailCanvas.height = thumbH;
                      thumbnailCtx.imageSmoothingEnabled = false;
                      
                      // Fill with black background first
                      thumbnailCtx.fillStyle = 'black';
                      thumbnailCtx.fillRect(0, 0, thumbW, thumbH);
                      
                      // Draw image centered
                      const aspectRatio = photo.canvas.width / photo.canvas.height;
                      const targetAspectRatio = thumbW / thumbH;
                      
                      let drawWidth = thumbW;
                      let drawHeight = thumbH;
                      let offsetX = 0;
                      let offsetY = 0;
                      
                      if (aspectRatio > targetAspectRatio) {
                        drawHeight = thumbW / aspectRatio;
                        offsetY = (thumbH - drawHeight) / 2;
                      } else {
                        drawWidth = thumbH * aspectRatio;
                        offsetX = (thumbW - drawWidth) / 2;
                      }
                      
                      thumbnailCtx.drawImage(photo.canvas, offsetX, offsetY, drawWidth, drawHeight);
                    }

                    return (
                      <button
                        key={photo.id}
                        onClick={() => selectPhoto(index)}
                        className="bg-black h-[90px] relative rounded-[10px] shrink-0 w-full"
                        data-name="Captured Image"
                      >
                        <div aria-hidden="true" className={`absolute border-solid inset-0 pointer-events-none rounded-[10px] ${
                          viewingPhoto && index === selectedPhotoIndex 
                            ? "border-2 border-neutral-700" 
                            : "border border-[grey]"
                        }`} />
                        <canvas
                          ref={(el) => {
                            if (el && thumbnailCanvas) {
                              el.width = thumbnailCanvas.width;
                              el.height = thumbnailCanvas.height;
                              const ctx = el.getContext("2d");
                              if (ctx) {
                                ctx.drawImage(thumbnailCanvas, 0, 0);
                              }
                            }
                          }}
                          className="w-full h-full object-cover rounded-[10px]"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </button>
                    );
                  })
                )}
              </div>
              
              {/* Clear All Button */}
              <div className="bg-neutral-200 relative rounded-[8.75px] shrink-0 w-full" data-name="Button">
                <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[8.75px]" />
                <button
                  onClick={clearAllPhotos}
                  className="flex flex-row items-center justify-center size-full bg-neutral-200 transition-all duration-200 group rounded-[8.75px]"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#404040';
                    const text = e.currentTarget.querySelector('p');
                    if (text) text.style.color = '#e5e5e5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e5e5';
                    const text = e.currentTarget.querySelector('p');
                    if (text) text.style.color = '#404040';
                  }}
                >
                  <div className="box-border flex gap-[5px] items-center justify-center p-[5px] relative w-full">
                    <p 
                      className="font-['IBM_Plex_Mono'] font-bold leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap whitespace-pre"
                      style={{ color: '#404040', transition: 'color 0.2s' }}
                    >
                      CLEAR ALL
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}