<script lang="ts">
  import { player, formatBytes, type Track } from '#lib/player.svelte';

  let { track, index }: { track: Track; index: number } = $props();

  let isCurrent = $derived(player.currentTrack?.id === track.id);
  let isPlayingThis = $derived(isCurrent && player.isPlaying);

  function formatDuration(secs?: number) {
    if (!secs || isNaN(secs)) return null;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
</script>

<div
  role="button"
  tabindex="0"
  onclick={() => player.play(track)}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') player.play(track); }}
  class="group flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer select-none text-sm {isCurrent ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/5' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}"
>
  <!-- Left: Number / Play / Equalizer + Title / Artist / Format -->
  <div class="flex items-center gap-4 min-w-0 flex-1">
    <!-- Number / Play state indicator -->
    <div class="w-7 flex items-center justify-center text-zinc-500 font-mono text-xs">
      {#if isPlayingThis}
        <!-- Animated Equalizer Bars -->
        <div class="flex items-end gap-[2px] h-4">
          <span class="w-[3px] bg-indigo-400 rounded-full animate-eq-1"></span>
          <span class="w-[3px] bg-indigo-400 rounded-full animate-eq-2"></span>
          <span class="w-[3px] bg-indigo-400 rounded-full animate-eq-3"></span>
        </div>
      {:else if isCurrent}
        <span class="text-indigo-400 font-bold text-sm">▶</span>
      {:else}
        <span class="group-hover:hidden">{index + 1}</span>
        <span class="hidden group-hover:inline text-white text-xs">▶</span>
      {/if}
    </div>

    <!-- Artwork icon / cover image -->
    <div class="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5 flex items-center justify-center shadow-sm">
      {#if track.coverUrl}
        <img src={track.coverUrl} alt={track.title} class="w-full h-full object-cover" />
      {:else}
        <span class="text-base select-none">🎵</span>
      {/if}
      {#if isPlayingThis}
        <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></div>
        </div>
      {/if}
    </div>

    <!-- Track title, artist, format -->
    <div class="min-w-0 flex-1 pr-3">
      <div class="flex items-center gap-2">
        <p class="font-semibold truncate {isCurrent ? 'text-indigo-300 font-bold' : 'text-zinc-100'}">
          {track.title}
        </p>
        <span class="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase bg-white/10 text-zinc-300 border border-white/10">
          {track.format}
        </span>
      </div>
      <p class="text-xs text-zinc-400 truncate mt-0.5">
        {track.artist}
      </p>
    </div>
  </div>

  <!-- Middle: Album name -->
  <div class="hidden md:block w-1/4 text-xs text-zinc-400 truncate pr-4">
    {track.album}
  </div>

  <!-- Middle 2: File size from API -->
  <div class="hidden sm:block text-xs font-mono text-zinc-500 w-20 text-right pr-4">
    {formatBytes(track.size_bytes)}
  </div>

  <!-- Right: Actions & Duration / Size -->
  <div class="flex items-center gap-3 shrink-0">
    <!-- View lyrics button -->
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        if (player.currentTrack?.id !== track.id) {
          player.play(track);
        }
        player.rightPanel = 'lyrics';
      }}
      title="Ver letras"
      class="p-1.5 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-pink-400 rounded-full transition"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"/>
      </svg>
    </button>

    <!-- Add to queue button -->
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        player.addToQueue(track);
      }}
      title="Añadir a la cola"
      class="p-1.5 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white rounded-full transition"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
    </button>

    <!-- Duration (or filename if not played yet) -->
    <span class="text-xs font-mono text-zinc-400 w-12 text-right">
      {formatDuration(isCurrent ? player.duration : track.duration) || '--:--'}
    </span>
  </div>
</div>
