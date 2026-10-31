<script lang="ts">
  import { player } from '#lib/player.svelte';
  import Visualizer from './Visualizer.svelte';

  let availableFormats = $derived([...new Set(player.tracks.map((t) => t.format))]);
  let filterChips = $derived(['Todo', ...availableFormats]);

  function handleFilter(chip: string) {
    player.activeFilter = chip;
    player.activeTab = 'home';
  }
</script>

<header class="sticky top-0 z-30 px-8 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5 flex flex-col gap-3">
  <!-- Top row: Nav arrows + Search bar + CAVA Visualizer + Lyrics toggle -->
  <div class="flex items-center justify-between gap-4">
    <!-- Left: Navigation Arrows, Home Button & Search bar -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => history.back()}
        class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition disabled:opacity-30"
        title="Atrás"
      >
        ‹
      </button>
      <button
        type="button"
        onclick={() => history.forward()}
        class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition disabled:opacity-30"
        title="Adelante"
      >
        ›
      </button>
      <button
        type="button"
        onclick={() => player.goHome()}
        class="w-8 h-8 rounded-full flex items-center justify-center transition {player.activeTab === 'home' && player.activeFilter === 'Todo' && !player.searchQuery ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}"
        title="Ir a Inicio (Home)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>

      <!-- Search bar -->
      <div class="relative w-72 md:w-96 ml-2">
        <svg class="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          bind:value={player.searchQuery}
          placeholder="Buscar canción, artista o álbum..."
          class="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-zinc-400 text-xs rounded-full pl-9 pr-8 py-2.5 outline-none transition border border-transparent focus:border-indigo-500/50"
        />
        {#if player.searchQuery}
          <button
            type="button"
            onclick={() => (player.searchQuery = '')}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
          >
            ✕
          </button>
        {/if}
      </div>
    </div>

    <!-- Right: CAVA Visualizer + Lyrics toggle button + Profile -->
    <div class="flex items-center gap-3">
      <!-- Live CAVA Audio Spectrum Visualizer (Centered mode) -->
      <div class="hidden sm:block">
        <Visualizer />
      </div>

      <!-- User Avatar Icon -->
      <div
        class="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 shadow-sm"
        title="Usuario"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- Bottom row: Quick Filter chips -->
  {#if filterChips.length > 1}
    <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {#each filterChips as chip}
        <button
          type="button"
          onclick={() => handleFilter(chip)}
          class="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all {player.activeFilter === chip ? 'bg-white text-black font-semibold shadow-md' : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'}"
        >
          {chip}
        </button>
      {/each}
    </div>
  {/if}
</header>
