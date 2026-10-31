<script lang="ts">
  import { player, type LyricLine } from '#lib/player.svelte';

  let activeLyricIdx = $derived(player.getActiveLyricIndex());

  const introLine: LyricLine = { time: 0, text: '♪ Introducción musical ♪' };

  // 5 lines computed for the focused centered view (no separators, no timestamps)
  let focusedLines = $derived.by(() => {
    const list = player.lyrics;
    const duration = player.duration || 225;
    const outroLine: LyricLine = { time: duration, text: '♪ Final de la canción ♪' };

    if (list.length === 0) {
      return {
        above2: null,
        above1: null,
        current: null,
        below1: null,
        below2: null
      };
    }

    if (activeLyricIdx === -1) {
      return {
        above2: null,
        above1: null,
        current: introLine,
        below1: list[0] || null,
        below2: list[1] || null
      };
    }

    const current = list[activeLyricIdx];
    const above1 = activeLyricIdx - 1 >= 0 ? list[activeLyricIdx - 1] : introLine;
    const above2 = activeLyricIdx - 2 >= 0 ? list[activeLyricIdx - 2] : (activeLyricIdx === 1 ? introLine : null);
    const below1 = activeLyricIdx + 1 < list.length ? list[activeLyricIdx + 1] : outroLine;
    const below2 = activeLyricIdx + 2 < list.length ? list[activeLyricIdx + 2] : (activeLyricIdx + 1 === list.length - 1 ? outroLine : null);

    return { above2, above1, current, below1, below2 };
  });

  function handleSeekTo(seconds: number) {
    player.seek(seconds);
    if (!player.isPlaying) {
      player.play();
    }
  }
</script>

<!-- Lyrics Card with spotlight gradient background, no timestamps, no separators -->
<div class="relative w-full rounded-2xl overflow-hidden p-5 md:p-6 border border-white/10 shadow-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-black/80 backdrop-blur-xl group select-none flex flex-col justify-between">
  <!-- Subtle Header with title and Modo Cinema button -->
  <div class="flex items-center justify-between mb-4 pb-1">
    <div class="flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full {player.isPlaying ? 'bg-pink-400 animate-pulse' : 'bg-zinc-600'}"></span>
      <span class="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold">
        Letras
      </span>
    </div>

    <!-- Modo Cinema button (remplaza el botón de JSON) -->
    <button
      type="button"
      onclick={() => (player.isFullscreen = true)}
      title="Abrir Modo Cinema"
      class="text-[11px] font-medium text-pink-300 hover:text-white px-2.5 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/20 transition flex items-center gap-1.5 shadow-sm"
    >
      <svg class="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    </button>
  </div>

  <!-- 5 Centered Lines: Active line in center, 2 faded lines above and 2 below, NO separators, NO timestamps -->
  {#if player.lyrics.length > 0}
    <div class="flex flex-col items-center justify-center gap-3.5 md:gap-4 my-2 text-center">
      <!-- 2 Líneas Arriba (Desvanecido 2) -->
      <div class="min-h-[20px] flex items-center justify-center w-full">
        {#if focusedLines.above2}
          <button
            type="button"
            onclick={() => handleSeekTo(focusedLines.above2!.time)}
            class="text-[10px] md:text-xs font-normal text-zinc-400 opacity-20 hover:opacity-75 transition-all duration-300 max-w-full truncate px-2 py-0.5 cursor-pointer leading-tight"
            title="Saltar a esta parte"
          >
            {focusedLines.above2.text}
          </button>
        {/if}
      </div>

      <!-- 1 Línea Arriba (Desvanecido 1) -->
      <div class="min-h-[22px] flex items-center justify-center w-full">
        {#if focusedLines.above1}
          <button
            type="button"
            onclick={() => handleSeekTo(focusedLines.above1!.time)}
            class="text-xs md:text-sm font-medium text-zinc-300 opacity-45 hover:opacity-85 transition-all duration-300 max-w-full px-2 py-0.5 cursor-pointer leading-tight"
            title="Saltar a esta parte"
          >
            {focusedLines.above1.text}
          </button>
        {/if}
      </div>

      <!-- PÁRRAFO ACTUAL EN EL CENTRO (ACTIVO Y DESTACADO, -25% tamaño, sin separadores, sin marca de tiempo) -->
      <div class="min-h-[44px] flex items-center justify-center w-full py-1">
        {#if focusedLines.current}
          <p class="text-base md:text-lg font-bold text-white tracking-tight leading-snug drop-shadow-md text-center max-w-full animate-in zoom-in-95 duration-200">
            {focusedLines.current.text}
          </p>
        {:else}
          <p class="text-xs text-zinc-400 italic">Esperando inicio de letra...</p>
        {/if}
      </div>

      <!-- 1 Línea Abajo (Desvanecido 1) -->
      <div class="min-h-[22px] flex items-center justify-center w-full">
        {#if focusedLines.below1}
          <button
            type="button"
            onclick={() => handleSeekTo(focusedLines.below1!.time)}
            class="text-xs md:text-sm font-medium text-zinc-300 opacity-45 hover:opacity-85 transition-all duration-300 max-w-full px-2 py-0.5 cursor-pointer leading-tight"
            title="Saltar a esta parte"
          >
            {focusedLines.below1.text}
          </button>
        {/if}
      </div>

      <!-- 2 Líneas Abajo (Desvanecido 2) -->
      <div class="min-h-[20px] flex items-center justify-center w-full">
        {#if focusedLines.below2}
          <button
            type="button"
            onclick={() => handleSeekTo(focusedLines.below2!.time)}
            class="text-[10px] md:text-xs font-normal text-zinc-400 opacity-20 hover:opacity-75 transition-all duration-300 max-w-full truncate px-2 py-0.5 cursor-pointer leading-tight"
            title="Saltar a esta parte"
          >
            {focusedLines.below2.text}
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center text-center py-6 text-zinc-500 gap-2">
      <span class="text-2xl">🎤</span>
      <p class="text-xs font-semibold text-white">Sin letras disponibles</p>
      <button
        type="button"
        onclick={() => (player.isFullscreen = true)}
        class="mt-1 px-3 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[11px] font-semibold border border-pink-500/30 transition"
      >
        Abrir Modo Cinema
      </button>
    </div>
  {/if}
</div>
