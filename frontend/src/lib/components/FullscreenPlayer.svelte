<script lang="ts">
  import { player, formatBytes } from '#lib/player.svelte';

  let track = $derived(player.currentTrack);
  let activeLyricIdx = $derived(player.getActiveLyricIndex());
  let lyricsContainerEl = $state<HTMLDivElement | null>(null);

  // Auto-scroll to keep active line centered in cinema mode
  $effect(() => {
    if (player.isFullscreen && activeLyricIdx >= 0 && lyricsContainerEl) {
      const activeEl = lyricsContainerEl.querySelector(`[data-cinema-idx="${activeLyricIdx}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  });

  function formatTime(secs: number) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      player.isFullscreen = false;
    } else if (e.key === ' ') {
      e.preventDefault();
      player.togglePlay();
    }
  }

  function handleSeekTo(seconds: number) {
    player.seek(seconds);
    if (!player.isPlaying) {
      player.play();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if player.isFullscreen && track}
  <div class="fixed inset-0 z-50 bg-[#07070b]/98 text-white flex flex-col justify-between p-6 md:p-10 overflow-hidden select-none animate-in fade-in duration-300">
    <!-- Dynamic Ambient Glow Mesh in Cinema Mode -->
    <div
      class="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[180px] opacity-20 pointer-events-none transition-all duration-1000 ease-out z-0"
      style="background: {track.accentColor || '#6366f1'};"
    ></div>
    <div
      class="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[180px] opacity-15 pointer-events-none transition-all duration-1000 ease-out z-0"
      style="background: #ec4899;"
    ></div>

    <!-- Top Bar: Cinema Brand & Exit -->
    <div class="relative z-10 flex items-center justify-between pb-2 border-b border-white/5">
      <div class="flex items-center gap-3">
        <span class="text-xs font-mono tracking-widest uppercase text-pink-400 font-bold flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></span>
          MODO CINEMA • LETRAS
        </span>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10 font-mono">
          {track.format}
        </span>
      </div>

      <button
        type="button"
        onclick={() => (player.isFullscreen = false)}
        class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition text-xs font-semibold"
        title="Salir del Modo Cinema (Esc)"
      >
        <span>Salir</span>
        <span>✕</span>
      </button>
    </div>

    <!-- Center: Split View (Left: Album Art & Details | Right: Full Synced Lyrics Spotify Style) -->
    <div class="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-14 my-4 overflow-hidden">
      <!-- Left Column: Album Artwork & Track Info -->
      <div class="w-full lg:w-5/12 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 shrink-0 max-w-md">
        <div class="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-black/60 flex flex-col items-center justify-center p-6 text-center group">
          {#if track.coverUrl}
            <img src={track.coverUrl} alt={track.title} class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          {:else}
            <span class="text-8xl group-hover:scale-105 transition duration-500">🎵</span>
            <span class="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold mt-4">
              {track.format} AUDIO
            </span>
          {/if}
        </div>

        <div class="w-full">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {track.title}
          </h1>
          <p class="text-lg sm:text-xl md:text-2xl text-white/70 font-semibold mt-1">
            {track.artist}
          </p>
          <p class="text-xs sm:text-sm text-white/40 mt-1 font-mono">
            {track.album} • {formatBytes(track.size_bytes)}
          </p>
        </div>
      </div>

      <!-- Right Column: Full Synced Lyrics (Estilo Spotify con auto-scroll y resaltado) -->
      <div class="w-full lg:w-7/12 h-full flex flex-col overflow-hidden relative">
        <!-- Subtle Top & Bottom Gradient Masks for seamless fade out -->
        <div class="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#07070b]/98 to-transparent pointer-events-none z-10"></div>
        <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#07070b]/98 to-transparent pointer-events-none z-10"></div>

        <div
          bind:this={lyricsContainerEl}
          class="flex-1 overflow-y-auto scrollbar-none flex flex-col gap-6 py-28 px-4 md:px-8 scroll-smooth"
        >
          {#if player.lyrics.length > 0}
            {#each player.lyrics as line, idx}
              {@const isActive = idx === activeLyricIdx}
              {@const isPast = idx < activeLyricIdx}
              <button
                type="button"
                data-cinema-idx={idx}
                onclick={() => handleSeekTo(line.time)}
                class="text-left group transition-all duration-300 w-full rounded-2xl py-2 px-3 flex items-start gap-4 cursor-pointer outline-none {isActive ? 'scale-[1.03] origin-left' : ''}"
              >
                <p
                  class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold leading-relaxed transition-all duration-300 {isActive ? 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.45)] font-black' : isPast ? 'text-white/25 hover:text-white/60' : 'text-white/20 hover:text-white/60'}"
                >
                  {line.text}
                </p>
              </button>
            {/each}
          {:else}
            <!-- Empty state in cinema mode -->
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500 gap-3">
              <span class="text-4xl">🎤</span>
              <p class="text-lg font-bold text-white">No hay letras sincronizadas</p>
              <p class="text-xs text-zinc-400">Las letras se cargarán automáticamente cuando estén disponibles.</p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Bottom Controls & Timeline -->
    <div class="relative z-10 max-w-3xl w-full mx-auto flex flex-col gap-3 pt-2">
      <!-- Progress Bar -->
      <div class="flex items-center gap-4 text-xs font-mono text-white/60">
        <span class="w-10 text-right">{formatTime(player.currentTime)}</span>
        <input
          type="range"
          min="0"
          max={player.duration || 100}
          step="0.1"
          value={player.currentTime}
          oninput={(e) => player.seek(Number((e.target as HTMLInputElement).value))}
          class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
        />
        <span class="w-10">{formatTime(player.duration)}</span>
      </div>

      <!-- Playback buttons -->
      <div class="flex items-center justify-center gap-8">
        <button
          type="button"
          onclick={() => player.toggleShuffle()}
          class="text-xl transition {player.shuffle ? 'text-indigo-400' : 'text-white/40 hover:text-white'}"
          title="Aleatorio"
        >
          🔀
        </button>

        <button
          type="button"
          onclick={() => player.prevTrack()}
          class="text-3xl text-white/80 hover:text-white hover:scale-110 transition"
          title="Anterior"
        >
          ⏮
        </button>

        <button
          type="button"
          onclick={() => player.togglePlay()}
          class="w-14 h-14 rounded-full bg-white text-black text-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition"
        >
          {player.isPlaying ? '⏸' : '▶'}
        </button>

        <button
          type="button"
          onclick={() => player.nextTrack()}
          class="text-3xl text-white/80 hover:text-white hover:scale-110 transition"
          title="Siguiente"
        >
          ⏭
        </button>

        <button
          type="button"
          onclick={() => player.cycleRepeat()}
          class="text-xl transition {player.repeatMode !== 'off' ? 'text-indigo-400' : 'text-white/40 hover:text-white'}"
          title="Repetir"
        >
          {player.repeatMode === 'one' ? '🔂' : '🔁'}
        </button>
      </div>
    </div>
  </div>
{/if}
