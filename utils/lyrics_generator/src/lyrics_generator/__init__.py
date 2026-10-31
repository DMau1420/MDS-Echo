import sys
from pathlib import Path

# Permitir importar desde src/main.py
src_dir = str(Path(__file__).resolve().parent.parent)
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from main import main, generate_lyrics, load_audio_ffmpeg, format_time

__all__ = ["main", "generate_lyrics", "load_audio_ffmpeg", "format_time"]
