<script lang="ts">
  import { player, formatBytes } from '#lib/player.svelte';
  import LyricsView from './LyricsView.svelte';

  let currentTrack = $derived(player.currentTrack);

  function closePanel() {
    player.rightPanel = 'none';
  }
</script>

{#if player.rightPanel !== 'none'}
  <aside class="w-80 md:w-96 bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 flex flex-col justify-between shrink-0 h-full z-20 transition-all select-none">
    <!-- Panel Clean Header (Sin navbar de detalles, cola, letras) -->
    <div class="p-4 border-b border-white/5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full {player.isPlaying ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-600'}"></span>
        <h2 class="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
          {player.rightPanel === 'queue' ? `Cola de Reproducción (${player.queue.length})` : 'Acerca de la Canción'}
        </h2>
      </div>

      <button
        type="button"
        onclick={closePanel}
        title="Cerrar panel lateral"
        class="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition"
      >
        ✕
      </button>
    </div>

    <!-- Panel Body -->
    <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scrollbar-thin">
      <!-- VISTA DE COLA (cuando se abre desde el botón de cola en el reproductor) -->
      {#if player.rightPanel === 'queue'}
        <div class="flex flex-col gap-6">
          <!-- Currently Playing -->
          <div class="flex flex-col gap-2">
            <span class="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Sonando Ahora
            </span>
            {#if currentTrack}
              <div class="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                <div class="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                  {#if currentTrack.coverUrl}
                    <img src={currentTrack.coverUrl} alt={currentTrack.title} class="w-full h-full object-cover" />
                  {:else}
                    🎵
                  {/if}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                  <p class="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                </div>
                <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
              </div>
            {:else}
              <p class="text-xs text-zinc-500">Ninguna pista seleccionada</p>
            {/if}
          </div>

          <!-- Next in Queue -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                A Continuación ({player.queue.length})
              </span>
              {#if player.queue.length > 1}
                <button
                  type="button"
                  onclick={() => player.clearQueue()}
                  class="text-[11px] text-zinc-500 hover:text-rose-400 transition"
                >
                  Vaciar cola
                </button>
              {/if}
            </div>

            <div class="flex flex-col gap-1">
              {#each player.queue as track, idx}
                {#if idx !== player.queueIndex}
                  <div class="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition">
                    <button
                      type="button"
                      onclick={() => player.play(track)}
                      class="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div class="w-9 h-9 rounded overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0">
                        {#if track.coverUrl}
                          <img src={track.coverUrl} alt={track.title} class="w-full h-full object-cover" />
                        {:else}
                          🎵
                        {/if}
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                          {track.title}
                        </p>
                        <p class="text-[11px] text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onclick={() => player.removeFromQueue(idx)}
                      title="Quitar de la cola"
                      class="text-zinc-600 hover:text-zinc-300 text-xs p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>

      <!-- VISTA ACERCA DE LA CANCIÓN: 1. Foto Álbum -> 2. Lyrics -> 3. Demás Info Abajo -->
      {:else}
        {#if currentTrack}
          <div class="flex flex-col gap-5">
            <!-- 1. PRIMERO: Espacio de la foto del álbum o canción -->
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-white/10 via-white/5 to-black/60 flex flex-col items-center justify-center p-6 text-center group">
              {#if currentTrack.coverUrl}
                <img src={currentTrack.coverUrl} alt={currentTrack.title} class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              {:else}
                <span class="text-7xl group-hover:scale-105 transition duration-300">🎵</span>
              {/if}
              <div class="relative z-10 flex flex-col items-center mt-auto">
                <span class="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-bold mt-4">
                  {currentTrack.format}
                </span>
                <p class="text-base font-bold text-white mt-1 truncate max-w-full">
                  {currentTrack.title}
                </p>
                <p class="text-xs text-zinc-400 truncate max-w-full mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <!-- 2. ABAJO: Las Lyrics (Con fondo degradado como pista destacada, centradas, sin marcas de tiempo, sin separadores) -->
            <div class="w-full">
              <LyricsView />
            </div>

            <!-- 3. Y LA DEMÁS INFO ABAJO: Metadatos y detalles técnicos del archivo -->
            <div class="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3">
              <span class="text-xs font-mono uppercase tracking-wider text-indigo-300 font-semibold">
                Información de la Pista
              </span>

              <div class="flex flex-col gap-2.5 text-xs">
                <div class="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span class="text-zinc-400">Título</span>
                  <span class="text-white font-medium truncate max-w-[180px]">{currentTrack.title}</span>
                </div>
                <div class="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span class="text-zinc-400">Artista</span>
                  <span class="text-white truncate max-w-[180px]">{currentTrack.artist}</span>
                </div>
                <div class="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span class="text-zinc-400">Álbum</span>
                  <span class="text-white truncate max-w-[180px]">{currentTrack.album}</span>
                </div>
                <div class="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span class="text-zinc-400">Formato</span>
                  <span class="text-white font-bold">{currentTrack.format}</span>
                </div>
                <div class="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span class="text-zinc-400">Tamaño en Disco</span>
                  <span class="text-white font-mono">{formatBytes(currentTrack.size_bytes)}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-400">Archivo</span>
                  <span class="text-white font-mono truncate max-w-[180px] text-[11px]">{currentTrack.filename}</span>
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center text-center py-20 text-zinc-500 gap-3">
            <span class="text-3xl">♪</span>
            <p class="text-sm font-medium text-zinc-400">No hay ninguna pista en reproducción</p>
          </div>
        {/if}
      {/if}
    </div>
  </aside>
{/if}
