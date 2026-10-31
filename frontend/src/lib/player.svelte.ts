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
      const res = await fetch('http://localhost:8000/', { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        this.backendInfo = await res.json();
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
      const res = await fetch('http://localhost:8000/api/tracks');
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
        }) => ({
          id: item.id || `backend-${item.filename}`,
          filename: item.filename,
          title: item.title,
          artist: item.artist,
          album: item.album,
          format: item.format,
          size_bytes: item.size_bytes,
          stream_url: item.stream_url,
          audioUrl: `http://localhost:8000${item.stream_url}`,
          coverUrl: item.cover_url ? `http://localhost:8000${item.cover_url}` : undefined,
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
          this.setDefaultLyricsForCurrentTrack();
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
      const res = await fetch('http://localhost:8000/descargar', {
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

    if (!this.hasCustomLyrics) {
      this.setDefaultLyricsForCurrentTrack();
    }

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

  setDefaultLyricsForCurrentTrack() {
    if (this.hasCustomLyrics) return;
    const title = this.currentTrack?.title.toLowerCase() || '';
    if (title.includes('voyaging')) {
      const voyagingJson = {
        "cancion": "Voyaging_Stars_Farewell",
        "duración": "03:45",
        "letra": {
          "00:23": "There's no flake,",
          "00:25": "was fell on my nose",
          "00:27": "No flying backwards till last winter",
          "00:33": "I realize the hellos are goodbyes",
          "00:39": "The moment I softly let go of your hand",
          "00:45": "Wings of fruit,",
          "00:48": "trembling branches",
          "00:50": "A song for soul bound to soar",
          "00:54": "To the very edge of the staring ocean",
          "00:58": "Even if I'm meant to fall apart",
          "01:02": "I will get set where you are for all time",
          "01:07": "Both voyage,",
          "01:10": "may your path be clear",
          "01:12": "May you get aware",
          "01:15": "Dreams are all crystallized with",
          "01:20": "Please,",
          "01:22": "crack a little smile",
          "01:24": "You'll be alone",
          "01:27": "In this world you've chosen as your own",
          "01:31": "Don't worry,",
          "01:34": "I'm well aware",
          "01:35": "That was no fake smell",
          "01:39": "Deeply in",
          "01:43": "Vicious sign,",
          "01:45": "more than all parts free",
          "01:47": "So add in",
          "01:50": "Flamboyant lean to the goodnight",
          "02:04": "Both voyage,",
          "02:07": "may your path be clear",
          "02:09": "May you get aware",
          "02:12": "Dreams are all crystallized with",
          "02:16": "Please,",
          "02:19": "crack a little smile",
          "02:21": "You'll be alone",
          "02:23": "In this world you've chosen as your own",
          "02:28": "Time is such a desperate hour",
          "02:34": "Guess I'll spend my whole life forever with you",
          "02:40": "Though it might cost me everything I have",
          "02:45": "I'll never regret",
          "02:47": "Oh,",
          "02:49": "there hasn't any other way",
          "02:51": "Guess those two trees start laying on their lonely roads",
          "02:57": "Will find their destination",
          "03:00": "See the cosmos",
          "03:02": "Missing you in this whirlwind snowboard",
          "03:08": "The most beautiful thing ever happened to be",
          "03:43": "Missing you in this whirlwind snowboard"
        }
      };
      this.loadLyricsFromJson(voyagingJson);
      this.hasCustomLyrics = false;
      this.rawLyricsJson = JSON.stringify(voyagingJson, null, 4);
    } else if (title.includes('spoken')) {
      this.lyrics = [
        { time: 0, text: "♪ Intro musical ♪" },
        { time: 8, text: "Words left unspoken in the quiet room" },
        { time: 16, text: "Shadows dancing in the twilight gloom" },
        { time: 25, text: "Every whispered promise we used to hold" },
        { time: 35, text: "Now turns to memories spun of gold" },
        { time: 45, text: "Spoken for, forever in my mind" },
        { time: 55, text: "Leaving all the sorrow far behind" },
        { time: 66, text: "♪ Instrumental ♪" }
      ];
      this.lyricsStatus = 'loaded';
    } else {
      this.lyrics = [];
      this.lyricsStatus = 'waiting';
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