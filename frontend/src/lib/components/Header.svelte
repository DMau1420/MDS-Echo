<script lang="ts">
  import { player } from '#lib/player.svelte';
  import Visualizer from './Visualizer.svelte';

  function handleFilter(filter: string) {
    player.activeFilter = filter;
    player.activeTab = 'home';
  }
</script>

<header class="sticky top-0 z-30 px-3 sm:px-8 py-3 bg-black/50 backdrop-blur-xl border-b border-white/5 flex flex-col gap-2.5">
  <!-- Top row: Mobile menu + Nav arrows + Search bar + Actions -->
  <div class="flex items-center justify-between gap-2 sm:gap-4">
    <!-- Left: Navigation Arrows, Home & Search bar -->
    <div class="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
      <!-- Mobile Hamburger Menu Button -->
      <button
        type="button"
        onclick={() => (player.isMobileSidebarOpen = true)}
        class="md:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0"
        title="Abrir menú"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Desktop Navigation Arrows -->
      <button
        type="button"
        onclick={() => history.back()}
        class="hidden sm:flex w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center text-zinc-400 hover:text-white transition disabled:opacity-30 shrink-0"
        title="Atrás"
      >
        ‹
      </button>
      <button
        type="button"
        onclick={() => history.forward()}
        class="hidden sm:flex w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center text-zinc-400 hover:text-white transition disabled:opacity-30 shrink-0"
        title="Adelante"
      >
        ›
      </button>

      <!-- Home button -->
      <button
        type="button"
        onclick={() => player.goHome()}
        class="w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 {player.activeTab === 'home' && player.activeFilter === 'Todo' && !player.searchQuery ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}"
        title="Ir a Inicio (Home)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>

      <!-- Search bar -->
      <div class="relative flex-1 max-w-md min-w-0">
        <svg class="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          bind:value={player.searchQuery}
          placeholder="Buscar canción..."
          class="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-zinc-400 text-xs rounded-full pl-8 pr-7 py-2 outline-none transition border border-transparent focus:border-indigo-500/50"
        />
        {#if player.searchQuery}
          <button
            type="button"
            onclick={() => (player.searchQuery = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs p-0.5"
          >
            ✕
          </button>
        {/if}
      </div>
    </div>

    <!-- Right: Quick Add Song button (mobile), Visualizer, User avatar -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      <!-- Quick Add Song Icon on Mobile -->
      <button
        type="button"
        onclick={() => (player.isAddSongModalOpen = true)}
        class="md:hidden w-8 h-8 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 flex items-center justify-center transition"
        title="Agregar canción"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <!-- Live CAVA Audio Spectrum Visualizer (Centered mode, hidden on small screens) -->
      <div class="hidden lg:block">
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

  <!-- Bottom row: Navigation chips (Inicio / Todas las canciones) -->
  <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
    <button
      type="button"
      onclick={() => handleFilter('Todo')}
      class="px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all {player.activeFilter === 'Todo' ? 'bg-white text-black font-semibold shadow-md' : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'}"
    >
      Inicio
    </button>
    <button
      type="button"
      onclick={() => handleFilter('todas')}
      class="px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all {player.activeFilter === 'todas' ? 'bg-white text-black font-semibold shadow-md' : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'}"
    >
      Todas las canciones
    </button>
  </div>
</header>
