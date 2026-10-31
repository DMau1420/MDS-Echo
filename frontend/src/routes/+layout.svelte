<script lang="ts">
  import './layout.css';
  import favicon from '#lib/assets/favicon.svg';
  import type { LayoutProps } from './$types';
  import { player } from '#lib/player.svelte';
  import Sidebar from '#lib/components/Sidebar.svelte';
  import Header from '#lib/components/Header.svelte';
  import RightPanel from '#lib/components/RightPanel.svelte';
  import PlayerBar from '#lib/components/PlayerBar.svelte';
  import FullscreenPlayer from '#lib/components/FullscreenPlayer.svelte';

  let { children }: LayoutProps = $props();
</script>

<svelte:head>
  <title>
    {player.isPlaying && player.currentTrack
      ? `${player.currentTrack.title} • ${player.currentTrack.artist} | ECHO`
      : 'ECHO - Music Player'}
  </title>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="relative h-screen h-[100dvh] w-screen bg-[#070709] text-zinc-100 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30">
  <!-- Dynamic Apple Music Ambient Mesh Glow (adapts smoothly to playing song) -->
  <div
    class="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full blur-[160px] opacity-25 pointer-events-none transition-all duration-1000 ease-out z-0"
    style="background: {player.currentTrack?.accentColor || '#6366f1'};"
  ></div>
  <div
    class="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[180px] opacity-15 pointer-events-none transition-all duration-1000 ease-out z-0"
    style="background: {player.currentTrack?.accentColor || '#ec4899'};"
  ></div>

  <!-- Main App Shell -->
  <div class="flex-1 flex overflow-hidden relative z-10">
    <!-- Left Navigation Sidebar -->
    <Sidebar />

    <!-- Center Content View -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Header Bar with Search & Filters -->
      <Header />

      <!-- Scrollable Main View -->
      <main class="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6 pb-28 md:pb-6 scrollbar-thin bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]">
        {@render children()}
      </main>
    </div>

    <!-- Right Drawer: Live Lyrics & Queue -->
    <RightPanel />
  </div>

  <!-- Persistent Player Bar -->
  <PlayerBar />

  <!-- Fullscreen Immersive Mode -->
  <FullscreenPlayer />
</div>
