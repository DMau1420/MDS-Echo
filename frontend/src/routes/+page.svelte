<script lang="ts">
  import { player, formatBytes, type Track } from '#lib/player.svelte';
  import TrackRow from '#lib/components/TrackRow.svelte';

  let filteredTracks = $derived.by(() => {
    let list: Track[] = player.tracks;

    if (player.searchQuery.trim()) {
      const q = player.searchQuery.toLowerCase();
      list = list.filter(
        (t: Track) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          t.format.toLowerCase().includes(q) ||
          t.filename.toLowerCase().includes(q)
      );
    } else if (player.activeFilter !== 'Todo' && player.activeFilter !== 'todas') {
      list = list.filter(
        (t: Track) =>
          t.format.toLowerCase() === player.activeFilter.toLowerCase() ||
          t.album.toLowerCase() === player.activeFilter.toLowerCase()
      );
    }

    return list;
  });

  // En la página principal (activeFilter === 'Todo' y sin búsqueda activa), se limita a solo 15 canciones:
  let isHomeView = $derived(player.activeFilter === 'Todo' && !player.searchQuery.trim());
  let displayTracks = $derived(isHomeView ? filteredTracks.slice(0, 15) : filteredTracks);

  let featuredTrack = $derived(player.tracks[0] || null);

  let realAlbums = $derived.by(() => {
    const map = new Map<string, { album: string; artist: string; count: number; format: string; tracks: Track[] }>();
    for (const t of player.tracks) {
      if (!map.has(t.album)) {
        map.set(t.album, { album: t.album, artist: t.artist, count: 0, format: t.format, tracks: [] });
      }
      const item = map.get(t.album)!;
      item.count++;
      item.tracks.push(t);
    }
    return Array.from(map.values());
  });

  function playAll(tracksToPlay: Track[]) {
    if (tracksToPlay.length > 0) {
      player.queue = [...tracksToPlay];
      player.play(tracksToPlay[0]);
    }
  }

  function goToAllTracks() {
    player.activeFilter = 'todas';
    player.activeTab = 'home';
  }
</script>

<div class="flex flex-col gap-10 pb-8">
  <!-- 1. HERO SPOTLIGHT BANNER (Solo en página principal) -->
  {#if isHomeView && featuredTrack}
    <section class="relative rounded-2xl sm:rounded-3xl overflow-hidden p-5 sm:p-8 md:p-10 border border-white/10 shadow-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-black/80 backdrop-blur-xl group">
      <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        <div class="flex flex-col gap-3.5 sm:gap-4 max-w-xl text-center md:text-left order-2 md:order-1">
          <div class="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
            <span class="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PISTA DESTACADA
            </span>
            <span class="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 text-white border border-white/10">
              {featuredTrack.format}
            </span>
            <span class="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {formatBytes(featuredTrack.size_bytes)}
            </span>
          </div>

          <div>
            <h1 class="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {featuredTrack.title}
            </h1>
            <p class="text-sm sm:text-lg md:text-xl text-zinc-300 font-medium mt-1">
              {featuredTrack.artist} • <span class="text-indigo-400">{featuredTrack.album}</span>
            </p>
          </div>

          <p class="text-[11px] sm:text-xs font-mono text-zinc-400 leading-relaxed bg-black/30 p-2.5 sm:p-3 rounded-xl border border-white/5">
            Álbum: <span class="text-white">{featuredTrack.album}</span> • Formato: <span class="text-indigo-300">{featuredTrack.format}</span>
          </p>

          <div class="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-4 pt-1 sm:pt-2">
            <button
              type="button"
              onclick={() => player.play(featuredTrack)}
              class="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs sm:text-sm shadow-xl active:scale-95 transition"
            >
              <span class="text-sm sm:text-base">{player.currentTrack?.id === featuredTrack.id && player.isPlaying ? '⏸' : '▶'}</span>
              <span>{player.currentTrack?.id === featuredTrack.id && player.isPlaying ? 'Pausar' : 'Reproducir Ahora'}</span>
            </button>

            <button
              type="button"
              onclick={() => player.addToQueue(featuredTrack)}
              class="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/10 transition"
            >
              <span>+ Añadir a Cola</span>
            </button>

            <button
              type="button"
              onclick={() => {
                player.play(featuredTrack);
                player.rightPanel = 'lyrics';
              }}
              class="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-semibold text-xs sm:text-sm border border-pink-500/30 transition"
            >
              <span>🎤 Letras</span>
            </button>
          </div>
        </div>

        <!-- Featured artwork icon -->
        <div class="relative w-36 h-36 sm:w-52 sm:h-52 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-white/5 flex flex-col items-center justify-center shrink-0 order-1 md:order-2">
          {#if featuredTrack.coverUrl}
            <img src={featuredTrack.coverUrl} alt={featuredTrack.title} class="w-full h-full object-cover" />
          {:else}
            <span class="text-5xl sm:text-6xl">🎵</span>
            <span class="text-[10px] sm:text-xs font-mono text-zinc-400 mt-2 sm:mt-3 uppercase tracking-wider">{featuredTrack.format}</span>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  <!-- 2. QUICK ACCESS GRID (Solo en página principal) -->
  {#if isHomeView && player.tracks.length > 0}
    <section class="flex flex-col gap-3">
      <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">Acceso Rápido</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {#each player.tracks.slice(0, 6) as track}
          <div
            role="button"
            tabindex="0"
            onclick={() => player.play(track)}
            onkeydown={(e) => { if (e.key === 'Enter') player.play(track); }}
            class="group flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden p-2 pr-4 shadow-sm"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-14 h-14 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                {#if track.coverUrl}
                  <img src={track.coverUrl} alt={track.title} class="w-full h-full object-cover" />
                {:else}
                  🎵
                {/if}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition">
                  {track.title}
                </p>
                <p class="text-xs text-zinc-400 truncate">{track.artist}</p>
                <span class="text-[10px] font-mono text-zinc-500 uppercase">{track.format} • {formatBytes(track.size_bytes)}</span>
              </div>
            </div>

            <button
              type="button"
              onclick={(e) => {
                e.stopPropagation();
                player.play(track);
              }}
              class="w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0 shrink-0"
            >
              {player.currentTrack?.id === track.id && player.isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- 3. TRACKLIST SECTION -->
  <section class="flex flex-col gap-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">
          {#if player.searchQuery}
            Resultados para "{player.searchQuery}" ({filteredTracks.length})
          {:else if player.activeFilter === 'todas'}
            Todas las Canciones ({player.tracks.length})
          {:else}
            Canciones ({displayTracks.length}{#if player.tracks.length > 15} de {player.tracks.length}{/if})
          {/if}
        </h2>
        <p class="text-xs text-zinc-400 mt-0.5">
          {#if isHomeView && player.tracks.length > 15}
            Mostrando las primeras 15 canciones de tu colección.
          {:else}
            Colección completa de pistas disponibles para reproducción.
          {/if}
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Botón que lleva a Todas las Canciones (cuando estamos en la página principal con límite de 15) -->
        {#if isHomeView && player.tracks.length > 15}
          <button
            type="button"
            onclick={goToAllTracks}
            class="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition shadow-sm"
          >
            <span>Ver todas las canciones ({player.tracks.length})</span>
            <span>→</span>
          </button>
        {/if}

        {#if displayTracks.length > 0}
          <button
            type="button"
            onclick={() => playAll(displayTracks)}
            class="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white transition"
          >
            <span>▶ Reproducir Todo</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Songs Table Header -->
    <div class="border-b border-white/5 pb-2 px-2.5 sm:px-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold select-none">
      <div class="flex items-center gap-2.5 sm:gap-4 flex-1">
        <span class="w-5 sm:w-7 text-center">#</span>
        <span>Título / Formato</span>
      </div>
      <span class="hidden md:block w-1/4">Álbum</span>
      <span class="hidden sm:block w-20 text-right pr-4">Tamaño</span>
      <span class="w-10 sm:w-12 text-right">Duración</span>
    </div>

    <!-- Songs Table Body -->
    {#if displayTracks.length > 0}
      <div class="flex flex-col gap-1">
        {#each displayTracks as track, index (track.id)}
          <TrackRow {track} {index} />
        {/each}
      </div>

      <!-- Botón al pie de la lista de 15 canciones para ir a Todas las Canciones -->
      {#if isHomeView && player.tracks.length > 15}
        <div class="flex justify-center pt-3 pb-1">
          <button
            type="button"
            onclick={goToAllTracks}
            class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-xs font-semibold transition"
          >
            <span>Ver todas las canciones ({player.tracks.length})</span>
            <span>→</span>
          </button>
        </div>
      {/if}
    {:else}
      <div class="flex flex-col items-center justify-center py-16 text-center text-zinc-500 gap-3">
        <svg class="w-12 h-12 stroke-current" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm font-semibold text-zinc-300">No hay canciones para mostrar</p>
        <p class="text-xs text-zinc-500">
          {player.tracks.length === 0 ? 'Cargando canciones de la biblioteca...' : 'No se encontraron coincidencias con tu búsqueda.'}
        </p>
      </div>
    {/if}
  </section>

  <!-- 4. ALBUM CARDS (Solo en página principal) -->
  {#if isHomeView && realAlbums.length > 0}
    <section class="flex flex-col gap-4">
      <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">Álbumes</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {#each realAlbums as item}
          <div
            role="button"
            tabindex="0"
            onclick={() => playAll(item.tracks)}
            onkeydown={(e) => { if (e.key === 'Enter') playAll(item.tracks); }}
            class="group p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col gap-3"
          >
            <div class="relative aspect-square w-full rounded-xl overflow-hidden shadow-lg border border-white/5 bg-white/5 flex flex-col items-center justify-center text-center p-3">
              <span class="text-5xl">💿</span>
              <span class="text-[10px] font-mono text-zinc-400 mt-2 uppercase">{item.format}</span>
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  playAll(item.tracks);
                }}
                class="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition transform translate-y-2 group-hover:translate-y-0"
              >
                ▶
              </button>
            </div>

            <div>
              <h3 class="font-bold text-sm text-white truncate group-hover:text-indigo-300 transition">
                {item.album}
              </h3>
              <p class="text-xs text-zinc-400 truncate mt-0.5">{item.artist}</p>
              <span class="inline-block mt-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                {item.count} {item.count === 1 ? 'canción' : 'canciones'}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>
