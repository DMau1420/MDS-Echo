<script lang="ts">
  import { player, type ActiveTab } from '#lib/player.svelte';

  let songUrl = $state('');

  function goHome() {
    player.activeFilter = 'Todo';
    player.activeTab = 'home';
    player.isMobileSidebarOpen = false;
  }

  function goAllTracks() {
    player.activeFilter = 'todas';
    player.activeTab = 'home';
    player.isMobileSidebarOpen = false;
  }

  function openAddSongModal() {
    songUrl = '';
    player.downloadError = null;
    player.downloadSuccess = null;
    player.isAddSongModalOpen = true;
    player.isMobileSidebarOpen = false;
  }

  function closeAddSongModal() {
    if (player.isDownloadingSong) return;
    player.isAddSongModalOpen = false;
  }

  async function handleAddSongSubmit(e: SubmitEvent) {
    e.preventDefault();
    const ok = await player.downloadSong(songUrl);
    if (ok) {
      songUrl = '';
      setTimeout(() => {
        player.isAddSongModalOpen = false;
      }, 900);
    }
  }
</script>

<!-- Mobile Drawer Backdrop & Drawer -->
{#if player.isMobileSidebarOpen}
  <div
    class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
    onclick={() => (player.isMobileSidebarOpen = false)}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Escape') player.isMobileSidebarOpen = false; }}
    aria-label="Cerrar menú móvil"
  ></div>

  <aside class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-zinc-950 border-r border-white/10 flex flex-col justify-between p-6 shadow-2xl md:hidden select-none animate-in slide-in-from-left duration-200">
    <div class="flex flex-col gap-6">
      <!-- Mobile Drawer Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <span class="text-xl font-black tracking-wider text-white">ECHO</span>
            <span class="text-[10px] block font-mono text-indigo-400 font-semibold tracking-widest uppercase">Music Player</span>
          </div>
        </div>

        <button
          type="button"
          onclick={() => (player.isMobileSidebarOpen = false)}
          class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition"
          title="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <!-- Mobile Navigation Links -->
      <nav class="flex flex-col gap-1.5 text-sm font-medium">
        <!-- Inicio -->
        <button
          type="button"
          onclick={goHome}
          class="flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition text-left {player.activeTab === 'home' && player.activeFilter === 'Todo' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
        >
          <svg class="w-5 h-5 shrink-0 {player.activeTab === 'home' && player.activeFilter === 'Todo' ? 'text-indigo-400' : 'text-zinc-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Inicio</span>
        </button>

        <!-- Todas las Canciones -->
        <button
          type="button"
          onclick={goAllTracks}
          class="flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition text-left {player.activeTab === 'home' && player.activeFilter === 'todas' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
        >
          <svg class="w-5 h-5 shrink-0 {player.activeTab === 'home' && player.activeFilter === 'todas' ? 'text-indigo-400' : 'text-zinc-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
          </svg>
          <span>Todas las Canciones</span>
        </button>

        <!-- Agregar canción -->
        <button
          type="button"
          onclick={openAddSongModal}
          class="flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition text-left {player.isAddSongModalOpen ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
        >
          <svg class="w-5 h-5 shrink-0 {player.isAddSongModalOpen ? 'text-indigo-400' : 'text-zinc-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Agregar canción</span>
        </button>
      </nav>
    </div>

    <!-- Bottom info on mobile -->
    <div class="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
      <span>Echo v1.0</span>
      <span>{player.tracks.length} canciones</span>
    </div>
  </aside>
{/if}

<!-- Desktop Sidebar -->
<aside class="hidden md:flex w-64 bg-zinc-950/80 backdrop-blur-2xl border-r border-white/5 flex-col justify-between select-none shrink-0 z-20">
  <div class="p-6 flex flex-col gap-6">
    <!-- Brand Logo -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <div>
          <span class="text-xl font-black tracking-wider text-white">ECHO</span>
          <span class="text-[10px] block font-mono text-indigo-400 font-semibold tracking-widest uppercase">Music Player</span>
        </div>
      </div>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 font-mono">
        v1.0
      </span>
    </div>

    <!-- Main Navigation -->
    <nav class="flex flex-col gap-1.5 text-sm font-medium">
      <!-- Inicio (Home con límite de 15) -->
      <button
        type="button"
        onclick={goHome}
        class="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition text-left {player.activeTab === 'home' && player.activeFilter === 'Todo' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
      >
        <svg class="w-5 h-5 shrink-0 {player.activeTab === 'home' && player.activeFilter === 'Todo' ? 'text-indigo-400' : 'text-zinc-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Inicio</span>
      </button>

      <!-- Todas las Canciones -->
      <button
        type="button"
        onclick={goAllTracks}
        class="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition text-left {player.activeTab === 'home' && player.activeFilter === 'todas' ? 'bg-white/10 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
      >
        <svg class="w-5 h-5 shrink-0 {player.activeTab === 'home' && player.activeFilter === 'todas' ? 'text-indigo-400' : 'text-zinc-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
        </svg>
        <span>Todas las Canciones</span>
      </button>

      <!-- Agregar canción -->
      <button
        type="button"
        onclick={openAddSongModal}
        class="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition text-left {player.isAddSongModalOpen ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}"
      >
        <svg class="w-5 h-5 shrink-0 {player.isAddSongModalOpen ? 'text-indigo-400' : 'text-zinc-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Agregar canción</span>
      </button>
    </nav>
  </div>

  <!-- Bottom: Clean Music Player Status Info -->
  <div class="p-4 border-t border-white/5 flex flex-col gap-3">
    <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0 {player.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}"></span>
        <div class="truncate text-[11px]">
          <p class="font-semibold text-zinc-200 truncate">
            {player.isPlaying ? 'Reproduciendo' : 'En Pausa'}
          </p>
          <p class="text-zinc-500 text-[10px]">
            {player.tracks.length} {player.tracks.length === 1 ? 'canción disponible' : 'canciones disponibles'}
          </p>
        </div>
      </div>
    </div>
  </div>
</aside>

<!-- Modal para Agregar Canción -->
{#if player.isAddSongModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="add-song-modal-title"
  >
    <div class="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl p-6 flex flex-col gap-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 id="add-song-modal-title" class="text-base font-bold text-white">Agregar canción</h2>
            <p class="text-xs text-zinc-400">Introduce el link de YouTube para descargar la canción y su portada</p>
          </div>
        </div>
        <button
          type="button"
          onclick={closeAddSongModal}
          disabled={player.isDownloadingSong}
          class="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition disabled:opacity-40"
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      <form onsubmit={handleAddSongSubmit} class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="youtube-link-input" class="text-xs font-medium text-zinc-300">
            Link de la canción
          </label>
          <input
            id="youtube-link-input"
            type="url"
            required
            bind:value={songUrl}
            disabled={player.isDownloadingSong}
            placeholder="https://youtu.be/..."
            class="w-full rounded-xl bg-black/50 border border-white/10 focus:border-indigo-500 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition disabled:opacity-50"
          />
        </div>

        {#if player.downloadError}
          <div class="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300">
            {player.downloadError}
          </div>
        {/if}

        {#if player.downloadSuccess}
          <div class="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-300">
            {player.downloadSuccess}
          </div>
        {/if}

        <div class="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onclick={closeAddSongModal}
            disabled={player.isDownloadingSong}
            class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={player.isDownloadingSong || !songUrl.trim()}
            class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            {#if player.isDownloadingSong}
              <span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Descargando...</span>
            {:else}
              <span>Descargar</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
