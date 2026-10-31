<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { player } from '#lib/player.svelte';

  let canvasEl: HTMLCanvasElement | null = null;
  let animationId: number | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let isConnected = false;

  const barCount = 28;
  const smoothedHeights = new Float32Array(barCount);

  function initAudioContext() {
    if (isConnected || !player.audioElement) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128; // 64 frequency bins
      analyser.smoothingTimeConstant = 0.75;

      sourceNode = audioContext.createMediaElementSource(player.audioElement);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
      isConnected = true;
    } catch {
      // Cross-origin audio or browser policy restriction; fallback smoothly to centered CAVA waves
      isConnected = false;
    }
  }

  function renderFrame() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const width = canvasEl.width;
    const height = canvasEl.height;

    ctx.clearRect(0, 0, width, height);

    const gap = 2.5;
    const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
    const center = (barCount - 1) / 2;

    if (isConnected && analyser && player.isPlaying) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      for (let i = 0; i < barCount; i++) {
        // CAVA center mode: bass in the middle, treble towards edges
        const distFromCenter = Math.abs(i - center) / center; // 0 at center, 1 at edges
        
        // Logarithmic/exponential frequency mapping from middle outward
        const binIdx = Math.min(
          bufferLength - 1,
          Math.floor(Math.pow(distFromCenter, 1.3) * (bufferLength * 0.7))
        );
        
        const rawVal = dataArray[binIdx] || 0;
        const targetPercent = Math.min(1, Math.max(0.08, rawVal / 255));
        
        // CAVA smoothing filter (quick rise, smooth decay)
        if (targetPercent > smoothedHeights[i]) {
          smoothedHeights[i] = targetPercent;
        } else {
          smoothedHeights[i] = Math.max(0.08, smoothedHeights[i] * 0.88 + targetPercent * 0.12);
        }

        const barHeight = Math.max(3, smoothedHeights[i] * height * 0.95);
        const x = i * (barWidth + gap);
        // Expands symmetrically from vertical center line (middle like CAVA)
        const y = (height - barHeight) / 2;

        // Dynamic CAVA center gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#ec4899'); // Pink top
        gradient.addColorStop(0.5, '#a855f7'); // Violet center
        gradient.addColorStop(1, '#06b6d4'); // Cyan bottom

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2]);
        ctx.fill();
      }
    } else {
      // Symmetrical CAVA idle/fallback wave centered from the middle
      const time = Date.now() * 0.005;
      for (let i = 0; i < barCount; i++) {
        const distFromCenter = Math.abs(i - center) / center; // 0 at center, 1 at edges
        let percent = 0.08;

        if (player.isPlaying) {
          // Beat pulse originating from center outwards
          const wave1 = Math.sin(time * 3 - distFromCenter * 4);
          const wave2 = Math.cos(time * 1.8 - distFromCenter * 2);
          const centerEmphasis = (1 - distFromCenter * 0.45);
          percent = Math.max(0.1, centerEmphasis * (0.25 + 0.65 * Math.abs((wave1 + wave2) / 2)));
        } else {
          // Subtle resting line at center
          percent = 0.07 + 0.03 * Math.sin(time * 0.5 + i * 0.2);
        }

        smoothedHeights[i] = smoothedHeights[i] * 0.85 + percent * 0.15;
        const barHeight = Math.max(2, smoothedHeights[i] * height * 0.92);
        const x = i * (barWidth + gap);
        // Center expansion vertically
        const y = (height - barHeight) / 2;

        if (player.isPlaying) {
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#ec4899');
          gradient.addColorStop(0.5, '#8b5cf6');
          gradient.addColorStop(1, '#3b82f6');
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2]);
        ctx.fill();
      }
    }

    animationId = requestAnimationFrame(renderFrame);
  }

  $effect(() => {
    if (player.isPlaying) {
      if (!isConnected && player.audioElement) {
        initAudioContext();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    }
  });

  onMount(() => {
    if (canvasEl) {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvasEl.offsetWidth || 150;
      const displayHeight = canvasEl.offsetHeight || 28;
      canvasEl.width = displayWidth * dpr;
      canvasEl.height = displayHeight * dpr;
      const ctx = canvasEl.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }
    renderFrame();
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
  });
</script>

<div class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
  <div class="flex items-center gap-1.5">
    <span class="w-2 h-2 rounded-full {player.isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}"></span>
    <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold"></span>
  </div>
  <canvas
    bind:this={canvasEl}
    class="w-36 md:w-44 h-7"
    title="Espectro CAVA de frecuencia desde el centro"
  ></canvas>
</div>
