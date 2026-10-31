export interface Track {
  id: string;
  filename: string;
  title: string;
  artist: string;
  album: string;
  format: string;
  size_bytes: number;
  stream_url: string;
  audioUrl: string;
  duration?: number;
  coverUrl?: string;
  lyricsUrl?: string;
  isBackend: boolean;
  accentColor?: string;
}

export interface BackendRoot {
  status: string;
  service: string;
  version: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export type RightPanelMode = 'none' | 'lyrics' | 'queue' | 'info';
export type RepeatMode = 'off' | 'all' | 'one';
export type ActiveTab = 'home' | 'search' | 'lyrics';

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export class PlayerStore {
  // Playback state
  currentTrack = $state<Track | null>(null);
  isPlaying = $state<boolean>(false);
  currentTime = $state<number>(0);
  duration = $state<number>(0);
  volume = $state<number>(0.85);
  isMuted = $state<boolean>(false);
  previousVolume = $state<number>(0.85);
  playbackRate = $state<number>(1.0);

  // Modes
  shuffle = $state<boolean>(false);
  repeatMode = $state<RepeatMode>('all');

  // Queue & Collections (ONLY populated from API)
  tracks = $state<Track[]>([]);
  queue = $state<Track[]>([]);
  queueIndex = $state<number>(0);
  likedTrackIds = $state<Set<string>>(new Set());
  recentlyPlayed = $state<Track[]>([]);

  // Lyrics state
  lyrics = $state<LyricLine[]>([]);
  lyricsStatus = $state<'waiting' | 'loaded' | 'error'>('waiting');
  hasCustomLyrics = $state<boolean>(false);
  rawLyricsJson = $state<string>('');

  // UI state
  activeTab = $state<ActiveTab>('home');
  activeFilter = $state<string>('Todo');
  searchQuery = $state<string>('');
  rightPanel = $state<RightPanelMode>('none');
  isFullscreen = $state<boolean>(false);
  isVisualizerEnabled = $state<boolean>(true);
  isAddSongModalOpen = $state<boolean>(false);
  isMobileSidebarOpen = $state<boolean>(false);
  isDownloadingSong = $state<boolean>(false);
  downloadError = $state<string | null>(null);
  downloadSuccess = $state<string | null>(null);

  // Backend state from FastAPI
  backendOnline = $state<boolean>(false);
  backendInfo = $state<BackendRoot | null>(null);
  backendError = $state<string | null>(null);
  isLoading = $state<boolean>(false);

  // Audio element reference holder
  audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.checkBackend();
  }

  setAudioElement(el: HTMLAudioElement | null) {
    this.audioElement = el;
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
      this.audioElement.playbackRate = this.playbackRate;
    }
  }

  async checkBackend() {
    this.isLoading = true;
    this.backendError = null;
    try {
      const res = await fetch('/api/tracks', { method: 'GET', signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        this.backendInfo = { status: 'Activo', service: 'FastAPI', version: '1.0.0' };
        this.backendOnline = true;
        await this.fetchBackendTracks();
      } else {
        this.backendOnline = false;
        this.backendInfo = null;
        this.tracks = [];
        this.queue = [];
      }
    } catch (err: unknown) {
      this.backendOnline = false;
      this.backendInfo = null;
      this.tracks = [];
      this.queue = [];
      this.backendError = err instanceof Error ? err.message : 'Error conectando con el backend';
    } finally {
      this.isLoading = false;
    }
  }

  async fetchBackendTracks() {
    try {
      const res = await fetch('/api/tracks');
      if (res.ok) {
        const data = await res.json();
        const backendList: Track[] = data.map((item: {
          id: string;
          filename: string;
          title: string;
          artist: string;
          album: string;
          format: string;
          size_bytes: number;
          stream_url: string;
          cover_url?: string | null;
          lyrics_url?: string | null;
        }) => ({
          id: item.id || `backend-${item.filename}`,
          filename: item.filename,
          title: item.title,
          artist: item.artist,
          album: item.album,
          format: item.format,
          size_bytes: item.size_bytes,
          stream_url: item.stream_url,
          audioUrl: item.stream_url,
          coverUrl: item.cover_url || undefined,
          lyricsUrl: item.lyrics_url || undefined,
          isBackend: true
        }));

        this.tracks = backendList;
        this.queue = [...backendList];

        if (this.currentTrack) {
          const updatedCurrent = backendList.find((t) => t.id === this.currentTrack?.id);
          if (updatedCurrent) {
            this.currentTrack = updatedCurrent;
          }
        } else if (backendList.length > 0) {
          this.currentTrack = backendList[0];
          this.queueIndex = 0;
          this.loadLyricsForTrack(backendList[0]);
        }
      }
    } catch (e: unknown) {
      console.warn('Backend tracks fetch error:', e);
      this.tracks = [];
      this.queue = [];
    }
  }

  goHome() {
    this.activeTab = 'home';
    this.activeFilter = 'Todo';
    this.searchQuery = '';
  }

  async downloadSong(url: string): Promise<boolean> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      this.downloadError = 'Por favor ingresa un enlace válido.';
      return false;
    }

    this.isDownloadingSong = true;
    this.downloadError = null;
    this.downloadSuccess = null;

    try {
      const res = await fetch('/descargar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.downloadError = data.detail || 'Error al descargar la canción.';
        return false;
      }

      this.downloadSuccess = data.message || 'Canción descargada con éxito.';
      await this.fetchBackendTracks();
      return true;
    } catch (err: unknown) {
      this.downloadError =
        err instanceof Error ? err.message : 'No se pudo conectar con el servidor para descargar.';
      return false;
    } finally {
      this.isDownloadingSong = false;
    }
  }

  play(track?: Track) {
    if (!track) {
      if (this.currentTrack) {
        this.isPlaying = true;
        this.audioElement?.play().catch((e) => console.warn('Play error:', e));
      } else if (this.queue.length > 0) {
        this.play(this.queue[0]);
      }
      return;
    }

    if (this.currentTrack?.id === track.id) {
      this.togglePlay();
      return;
    }

    this.currentTrack = track;
    this.currentTime = 0;
    this.isPlaying = true;

    this.loadLyricsForTrack(track);

    // Track recently played
    if (!this.recentlyPlayed.find((t) => t.id === track.id)) {
      this.recentlyPlayed = [track, ...this.recentlyPlayed.slice(0, 19)];
    }

    // Keep queue index in sync
    const idx = this.queue.findIndex((t) => t.id === track.id);
    if (idx !== -1) {
      this.queueIndex = idx;
    } else {
      this.queue = [...this.queue, track];
      this.queueIndex = this.queue.length - 1;
    }

    setTimeout(() => {
      this.audioElement?.play().catch((err) => {
        console.warn('Audio auto-play prevented or delay:', err);
      });
    }, 50);
  }

  pause() {
    this.isPlaying = false;
    this.audioElement?.pause();
  }

  togglePlay() {
    if (!this.currentTrack && this.queue.length > 0) {
      this.play(this.queue[0]);
      return;
    }
    if (this.isPlaying) {
      this.pause();
    } else {
      this.isPlaying = true;
      this.audioElement?.play().catch((e) => console.warn('Play error:', e));
    }
  }

  seek(seconds: number) {
    this.currentTime = Math.max(0, Math.min(seconds, this.duration || 1000));
    if (this.audioElement) {
      this.audioElement.currentTime = this.currentTime;
    }
  }

  nextTrack() {
    if (this.queue.length === 0) return;

    if (this.repeatMode === 'one' && this.currentTrack) {
      this.seek(0);
      this.audioElement?.play();
      return;
    }

    if (this.shuffle) {
      let randIdx = Math.floor(Math.random() * this.queue.length);
      if (this.queue.length > 1 && randIdx === this.queueIndex) {
        randIdx = (randIdx + 1) % this.queue.length;
      }
      this.queueIndex = randIdx;
    } else {
      if (this.queueIndex < this.queue.length - 1) {
        this.queueIndex++;
      } else {
        if (this.repeatMode === 'all') {
          this.queueIndex = 0;
        } else {
          this.isPlaying = false;
          return;
        }
      }
    }

    const nextT = this.queue[this.queueIndex];
    if (nextT) {
      this.play(nextT);
    }
  }

  prevTrack() {
    if (this.currentTime > 3) {
      this.seek(0);
      return;
    }

    if (this.queue.length === 0) return;

    if (this.queueIndex > 0) {
      this.queueIndex--;
    } else {
      this.queueIndex = this.queue.length - 1;
    }

    const prevT = this.queue[this.queueIndex];
    if (prevT) {
      this.play(prevT);
    }
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    if (this.volume > 0) {
      this.isMuted = false;
    }
  }

  toggleMute() {
    if (this.isMuted) {
      this.isMuted = false;
      this.setVolume(this.previousVolume || 0.8);
    } else {
      this.previousVolume = this.volume;
      this.isMuted = true;
      this.setVolume(0);
    }
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
  }

  cycleRepeat() {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
    } else {
      this.repeatMode = 'off';
    }
  }

  toggleLike(id: string) {
    const updated = new Set(this.likedTrackIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    this.likedTrackIds = updated;
  }

  isLiked(id: string): boolean {
    return this.likedTrackIds.has(id);
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
  }

  toggleRightPanel(panel: RightPanelMode) {
    this.rightPanel = this.rightPanel === panel ? 'none' : panel;
  }

  addToQueue(track: Track) {
    this.queue = [...this.queue, track];
  }

  playNext(track: Track) {
    const newQueue = [...this.queue];
    newQueue.splice(this.queueIndex + 1, 0, track);
    this.queue = newQueue;
  }

  removeFromQueue(index: number) {
    if (index === this.queueIndex) return;
    const newQueue = this.queue.filter((_, i) => i !== index);
    if (index < this.queueIndex) {
      this.queueIndex--;
    }
    this.queue = newQueue;
  }

  clearQueue() {
    if (this.currentTrack) {
      this.queue = [this.currentTrack];
      this.queueIndex = 0;
    } else {
      this.queue = [];
      this.queueIndex = 0;
    }
  }

  // Lyrics helpers
  async loadLyricsForTrack(track: Track) {
    this.lyrics = [];
    this.lyricsStatus = 'waiting';
    this.hasCustomLyrics = false;
    this.rawLyricsJson = '';

    const stem = track.filename.replace(/\.[^/.]+$/, '');
    const urlCandidates: string[] = [];
    if (track.lyricsUrl) {
      urlCandidates.push(track.lyricsUrl);
    }
    urlCandidates.push(`/api/lyrics/${encodeURIComponent(stem)}.json`);
    urlCandidates.push(`/api/lyrics/${encodeURIComponent(stem.replace(/\s+/g, '_'))}.json`);
    urlCandidates.push(`/api/lyrics/${encodeURIComponent(stem.replace(/_/g, ' '))}.json`);

    const tried = new Set<string>();
    for (const url of urlCandidates) {
      if (tried.has(url)) continue;
      tried.add(url);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (this.loadLyricsFromJson(data)) {
            return;
          }
        }
      } catch (e) {
        console.warn(`Error loading lyrics from ${url}:`, e);
      }
    }

    this.lyrics = [];
    this.lyricsStatus = 'waiting';
  }

  parseTimeValue(val: unknown): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        if (parts.length === 2) {
          const min = parseFloat(parts[0]) || 0;
          const sec = parseFloat(parts[1]) || 0;
          return min * 60 + sec;
        } else if (parts.length === 3) {
          const hr = parseFloat(parts[0]) || 0;
          const min = parseFloat(parts[1]) || 0;
          const sec = parseFloat(parts[2]) || 0;
          return hr * 3600 + min * 60 + sec;
        }
      }
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    }
    return 0;
  }

  loadLyricsFromJson(data: unknown): boolean {
    try {
      let parsed = data;
      if (typeof data === 'string') {
        this.rawLyricsJson = data;
        parsed = JSON.parse(data);
      }
      
      let linesArray: unknown[] = [];
      if (Array.isArray(parsed)) {
        linesArray = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        // Support format: { "cancion": "...", "duración": "...", "letra": { "00:23": "...", ... } }
        if (obj.letra && typeof obj.letra === 'object' && !Array.isArray(obj.letra)) {
          const dict = obj.letra as Record<string, string>;
          linesArray = Object.entries(dict).map(([timeStr, text]) => ({
            time: timeStr,
            text: String(text)
          }));
        } else if (Array.isArray(obj.lyrics)) {
          linesArray = obj.lyrics;
        } else if (Array.isArray(obj.lines)) {
          linesArray = obj.lines;
        } else if (Array.isArray(obj.subtitles)) {
          linesArray = obj.subtitles;
        } else if (typeof obj.text === 'string' || typeof obj.lyrics === 'string') {
          const str = (obj.text || obj.lyrics) as string;
          linesArray = str.split('\n').filter(Boolean).map((t, idx) => ({ time: idx * 4, text: t.trim() }));
        }
      }

      if (linesArray.length > 0) {
        const result: LyricLine[] = [];
        for (let i = 0; i < linesArray.length; i++) {
          const item = linesArray[i];
          if (typeof item === 'string') {
            result.push({ time: i * 4, text: item });
          } else if (item && typeof item === 'object') {
            const it = item as Record<string, unknown>;
            const time = this.parseTimeValue(it.time ?? it.timestamp ?? it.start ?? (i * 4));
            const text = String(it.text ?? it.lyric ?? it.line ?? it.content ?? '');
            if (text.trim()) {
              result.push({ time, text: text.trim() });
            }
          }
        }
        result.sort((a, b) => a.time - b.time);
        this.lyrics = result;
        this.hasCustomLyrics = true;
        this.lyricsStatus = 'loaded';
        return true;
      }
      this.lyricsStatus = 'error';
      return false;
    } catch (err) {
      console.warn('Error parsing lyrics JSON:', err);
      this.lyricsStatus = 'error';
      return false;
    }
  }

  getActiveLyricIndex(): number {
    if (!this.lyrics.length) return -1;
    let active = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
      if (this.currentTime >= this.lyrics[i].time) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }
}

export const player = new PlayerStore();