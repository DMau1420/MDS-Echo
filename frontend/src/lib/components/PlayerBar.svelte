<script lang="ts">
  import { onMount } from 'svelte';
  import { player } from '#lib/player.svelte';

  let audioElement = $state<HTMLAudioElement | null>(null);
  let isDraggingProgress = $state(false);
  let tempProgress = $state(0);
  let progressHoverTime = $state<number | null>(null);

  function formatTime(secs: number) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function handleAudioTimeUpdate() {
    if (!audioElement || isDraggingProgress) return;
    player.currentTime = audioElement.currentTime;
    player.duration = audioElement.duration || 0;
  }

  function handleAudioPlay() {
    player.isPlaying = true;
  }

  function handleAudioPause() {
    player.isPlaying = false;
  }

  function handleAudioEnded() {
    player.nextTrack();
  }

  function handleAudioError() {
    console.warn('Audio playback error on URL:', player.currentTrack?.audioUrl);
    if (player.currentTrack?.isBackend) {
      player.backendOnline = false;
    }
  }

  function handleProgressInput(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    tempProgress = val;
    isDraggingProgress = true;
  }

  function handleProgressChange(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    player.seek(val);
    isDraggingProgress = false;
  }

  function handleProgressMouseMove(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    progressHoverTime = Math.max(0, Math.min(pos * (player.duration || 100), player.duration || 100));
  }

  function handleProgressMouseLeave() {
    progressHoverTime = null;
  }

  onMount(() => {
    if (audioElement) {
      player.setAudioElement(audioElement);
    }
  });

  let currentPct = $derived.by(() => {
    const dur = player.duration || 1;
    const cur = isDraggingProgress ? tempProgress : player.currentTime;
    return Math.min(100, Math.max(0, (cur / dur) * 100));
  });

  let volumePct = $derived(player.isMuted ? 0 : player.volume * 100);
</script>

<!-- Persistent HTML5 Audio Element streaming from FastAPI -->
{#if player.currentTrack}
  <audio
    bind:this={audioElement}
    src={player.currentTrack.audioUrl}
    crossorigin="anonymous"
    ontimeupdate={handleAudioTimeUpdate}
    onloadedmetadata={handleAudioTimeUpdate}
    onplay={handleAudioPlay}
    onpause={handleAudioPause}
    onended={handleAudioEnded}
    onerror={handleAudioError}
    preload="auto"
  ></audio>
{/if}

<footer class="h-24 bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 px-6 flex items-center justify-between select-none relative z-40 shadow-2xl">
  <!-- Dynamic ambient color reflection on bottom bar -->
  <div
    class="absolute -top-1 left-0 right-0 h-[1px] opacity-60 transition-all duration-700 pointer-events-none"
    style="background: linear-gradient(90deg, transparent, {player.currentTrack?.accentColor || '#6366f1'}, transparent);"
  ></div>

  <!-- 1. LEFT: Real Track Info from API -->
  <div class="flex items-center gap-3.5 w-1/4 min-w-[200px]">
    {#if player.currentTrack}
      <button
        type="button"
        onclick={() => (player.isFullscreen = true)}
        title="Ver en pantalla completa (Esc)"
        class="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-white/5 flex items-center justify-center shadow-lg group cursor-pointer"
      >
        {#if player.currentTrack.coverUrl}
          <img src={player.currentTrack.coverUrl} alt={player.currentTrack.title} class="w-full h-full object-cover" />
        {:else}
          <span class="text-2xl">🎵</span>
        {/if}
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs">
          ⤢
        </div>
      </button>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <p class="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
            {player.currentTrack.title}
          </p>
          <span class="text-[9px] font-bold tracking-wider px-1.5 py-0.2 rounded uppercase bg-white/10 text-zinc-300 border border-white/10 shrink-0 font-mono">
            {player.currentTrack.format}
          </span>
        </div>
        <p class="text-xs text-zinc-400 truncate mt-0.5 hover:underline cursor-pointer">
          {player.currentTrack.artist}
        </p>
      </div>
    {:else}
      <div class="flex items-center gap-3 text-zinc-500 text-xs italic">
        <div class="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
          ♪
        </div>
        <span>{player.tracks.length > 0 ? 'Selecciona una pista para reproducir' : 'Esperando canciones...'}</span>
      </div>
    {/if}
  </div>

  <!-- 2. CENTER: Playback Controls & Progress Scrubber -->
  <div class="flex flex-col items-center gap-2 w-2/4 max-w-2xl">
    <!-- Playback buttons -->
    <div class="flex items-center gap-5">
      <!-- Shuffle button -->
      <button
        type="button"
        onclick={() => player.toggleShuffle()}
        title={player.shuffle ? 'Aleatorio: Activado' : 'Aleatorio: Desactivado'}
        class="p-2 text-xs rounded-full transition {player.shuffle ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-white'}"
      >
        <span class="text-base">🔀</span>
      </button>

      <!-- Previous track button -->
      <button
        type="button"
        onclick={() => player.prevTrack()}
        disabled={!player.currentTrack}
        title="Canción anterior"
        class="text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition disabled:opacity-30 disabled:hover:scale-100"
      >
        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>

      <!-- Main Play/Pause Button -->
      <button
        type="button"
        onclick={() => player.togglePlay()}
        disabled={!player.currentTrack && player.queue.length === 0}
        title={player.isPlaying ? 'Pausar' : 'Reproducir'}
        class="w-11 h-11 rounded-full bg-white hover:bg-zinc-100 text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100"
      >
        {#if player.isPlaying}
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        {:else}
          <svg class="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        {/if}
      </button>

      <!-- Next track button -->
      <button
        type="button"
        onclick={() => player.nextTrack()}
        disabled={!player.currentTrack}
        title="Siguiente canción"
        class="text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition disabled:opacity-30 disabled:hover:scale-100"
      >
        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>

      <!-- Repeat button -->
      <button
        type="button"
        onclick={() => player.cycleRepeat()}
        title={player.repeatMode === 'one' ? 'Repetir una canción' : player.repeatMode === 'all' ? 'Repetir todo' : 'No repetir'}
        class="relative p-2 text-xs rounded-full transition {player.repeatMode !== 'off' ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-white'}"
      >
        <span class="text-base">{player.repeatMode === 'one' ? '🔂' : '🔁'}</span>
      </button>
    </div>

    <!-- Timeline Progress Bar -->
    <div
      class="flex items-center gap-3 w-full text-xs font-mono text-zinc-400"
      onmousemove={handleProgressMouseMove}
      onmouseleave={handleProgressMouseLeave}
      role="region"
      aria-label="Controles de línea de tiempo"
    >
      <span class="w-10 text-right">{formatTime(isDraggingProgress ? tempProgress : player.currentTime)}</span>

      <!-- Scrubber Track -->
      <div class="relative w-full flex items-center group cursor-pointer">
        {#if progressHoverTime !== null}
          <div
            class="absolute -top-7 transform -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-mono py-0.5 px-1.5 rounded shadow border border-white/10 pointer-events-none"
            style="left: {(progressHoverTime / (player.duration || 1)) * 100}%;"
          >
            {formatTime(progressHoverTime)}
          </div>
        {/if}

        <input
          type="range"
          min="0"
          max={player.duration || 100}
          step="0.1"
          value={isDraggingProgress ? tempProgress : player.currentTime}
          oninput={handleProgressInput}
          onchange={handleProgressChange}
          disabled={!player.currentTrack}
          class="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-800 focus:outline-none accent-white group-hover:accent-indigo-400"
          style="background: linear-gradient(to right, #6366f1 {currentPct}%, #27272a {currentPct}%);"
        />
      </div>

      <span class="w-10">{formatTime(player.duration)}</span>
    </div>
  </div>

  <!-- 3. RIGHT: Panel Toggles & Volume -->
  <div class="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
    <!-- Lyrics toggle (Modo Cinema) -->
    <button
      type="button"
      onclick={() => (player.isFullscreen = !player.isFullscreen)}
      title="Modo Cinema (Letras en pantalla completa)"
      class="p-2 rounded-xl transition {player.isFullscreen ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"/>
      </svg>
    </button>

    <!-- Technical Info toggle -->
    <button
      type="button"
      onclick={() => player.toggleRightPanel('info')}
      title="Detalles de la pista"
      class="p-2 rounded-xl transition {player.rightPanel === 'info' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </button>

    <!-- Queue toggle with counter badge -->
    <button
      type="button"
      onclick={() => player.toggleRightPanel('queue')}
      title="Cola de reproducción"
      class="relative p-2 rounded-xl transition {player.rightPanel === 'queue' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
      </svg>
      {#if player.queue.length > 0}
        <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
          {player.queue.length}
        </span>
      {/if}
    </button>

    <!-- Volume Control -->
    <div class="flex items-center gap-2 group ml-1">
      <button
        type="button"
        onclick={() => player.toggleMute()}
        title={player.isMuted ? 'Desactivar silencio' : 'Silenciar'}
        class="text-zinc-400 hover:text-white transition"
      >
        {#if player.isMuted || player.volume === 0}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
          </svg>
        {:else}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
          </svg>
        {/if}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={player.isMuted ? 0 : player.volume}
        oninput={(e) => player.setVolume(Number((e.target as HTMLInputElement).value))}
        class="w-20 h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-white group-hover:accent-indigo-400 transition"
        style="background: linear-gradient(to right, #ffffff {volumePct}%, #27272a {volumePct}%);"
      />
    </div>

    <!-- Fullscreen toggle -->
    <button
      type="button"
      onclick={() => (player.isFullscreen = !player.isFullscreen)}
      title="Pantalla Completa Inmersiva"
      class="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
      </svg>
    </button>
  </div>
</footer>
