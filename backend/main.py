import os
from pathlib import Path
from typing import Generator, Optional
from urllib.parse import quote, unquote
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import websockets

app = FastAPI(title="MDS-Echo Music API", version="1.0.0")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

AUDIO_DIR = Path(__file__).resolve().parent.parent / "audios_prueba"
LYRICS_DIR = Path(__file__).resolve().parent.parent / "lyrics"
RUST_WS_URL = os.environ.get("RUST_WS_URL", "ws://127.0.0.1:9001")


class DownloadRequest(BaseModel):
    url: str


def read_in_chunks(file_path: Path, chunk_size: int = 1024 * 1024) -> Generator[bytes, None, None]:
    with open(file_path, mode='rb') as file:
        while chunk := file.read(chunk_size):
            yield chunk


def detect_image_media_type(img_path: Path) -> str:
    try:
        with open(img_path, "rb") as f:
            header = f.read(16)
        if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
            return "image/webp"
        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
    except OSError:
        pass
    ext = img_path.suffix.lower()
    if ext == ".png":
        return "image/png"
    if ext == ".webp":
        return "image/webp"
    return "image/jpeg"


def find_lyrics_file(stem: str) -> Optional[Path]:
    if not LYRICS_DIR.exists():
        return None
    direct = LYRICS_DIR / f"{stem}.json"
    if direct.exists() and direct.is_file():
        return direct
    cand1 = LYRICS_DIR / f"{stem.replace(' ', '_')}.json"
    cand2 = LYRICS_DIR / f"{stem.replace('_', ' ')}.json"
    if cand1.exists() and cand1.is_file():
        return cand1
    if cand2.exists() and cand2.is_file():
        return cand2
    norm_stem = "".join(c for c in stem.lower() if c.isalnum())
    for f in LYRICS_DIR.iterdir():
        if f.is_file() and f.suffix.lower() == ".json":
            norm_cand = "".join(c for c in f.stem.lower() if c.isalnum())
            if norm_cand == norm_stem:
                return f
    for f in LYRICS_DIR.iterdir():
        if f.is_file() and f.suffix.lower() == ".json":
            norm_cand = "".join(c for c in f.stem.lower() if c.isalnum())
            if norm_cand and norm_cand in norm_stem:
                return f
    return None


@app.get("/")
def read_root():
    return {
        "service": "Activo",
    }


@app.get("/api/tracks")
def get_backend_tracks():
    """List available audio files in audios_prueba folder"""
    if not AUDIO_DIR.exists():
        return []

    files = []
    supported_exts = {".m4a", ".mp3", ".wav", ".ogg", ".flac"}
    image_exts = (".jpg", ".jpeg", ".png", ".webp")

    for f in sorted(AUDIO_DIR.iterdir()):
        if f.is_file() and f.suffix.lower() in supported_exts:
            title = f.stem.replace("_", " ")
            cover_url = None
            for img_ext in image_exts:
                img_candidate = f.with_suffix(img_ext)
                if img_candidate.exists() and img_candidate.is_file():
                    cover_url = f"/imagen/{quote(img_candidate.name)}"
                    break

            lyrics_url = None
            lyrics_file = find_lyrics_file(f.stem)
            if lyrics_file:
                lyrics_url = f"/api/lyrics/{quote(lyrics_file.name)}"

            files.append({
                "id": f"backend-{f.name}",
                "filename": f.name,
                "title": title,
                "artist": "Echo Local Audio",
                "album": "Colección Echo",
                "format": f.suffix.lstrip(".").upper(),
                "size_bytes": f.stat().st_size,
                "stream_url": f"/reproducir/{quote(f.name)}",
                "cover_url": cover_url,
                "lyrics_url": lyrics_url,
            })
    return files


async def _send_url_to_rust_ws(url: str) -> dict:
    clean_url = url.strip()
    if not clean_url:
        raise HTTPException(status_code=400, detail="La URL no puede estar vacía")

    try:
        async with websockets.connect(RUST_WS_URL, ping_interval=None) as ws:
            await ws.send(clean_url)
            respuesta = await ws.recv()
    except OSError as e:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo conectar al servidor WebSocket de Rust en {RUST_WS_URL}: {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error comunicándose con el servidor de descargas: {e}",
        )

    respuesta_str = str(respuesta)
    if respuesta_str.startswith("❌"):
        raise HTTPException(status_code=400, detail=respuesta_str)

    return {
        "status": "ok",
        "message": respuesta_str,
        "url": clean_url,
    }


@app.post("/descargar")
async def descargar_post(
    payload: Optional[DownloadRequest] = None,
    url: Optional[str] = Query(default=None),
):
    """Connects via WebSocket to the Rust downloader utility and downloads the requested track"""
    target_url = (payload.url if payload and payload.url else url) or ""
    return await _send_url_to_rust_ws(target_url)


@app.get("/descargar")
async def descargar_get(url: str = Query(..., description="URL de YouTube a descargar")):
    """GET variant of /descargar to easily test or trigger downloads with ?url="""
    return await _send_url_to_rust_ws(url)


@app.get("/imagen/{filename:path}")
def get_track_image(filename: str):
    """Serve the thumbnail image downloaded by the Rust program"""
    clean_name = os.path.basename(unquote(filename))
    img_path = AUDIO_DIR / clean_name
    if not img_path.exists() or not img_path.is_file():
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(
        str(img_path),
        media_type=detect_image_media_type(img_path),
        filename=clean_name,
    )


@app.get("/api/lyrics/{filename:path}")
def get_track_lyrics(filename: str):
    """Serve the lyrics JSON file generated by lyrics_generator"""
    clean_name = os.path.basename(unquote(filename))
    stem = Path(clean_name).stem
    lyrics_path = find_lyrics_file(stem) or (LYRICS_DIR / clean_name)
    if not lyrics_path or not lyrics_path.exists() or not lyrics_path.is_file():
        raise HTTPException(status_code=404, detail="Lyrics file not found")

    return FileResponse(
        str(lyrics_path),
        media_type="application/json",
        filename=lyrics_path.name,
    )


@app.get("/reproducir")
def stream_default():
    """Default demo endpoint streaming Voyaging_Stars_Farewell.m4a"""
    audio_path = AUDIO_DIR / "Voyaging_Stars_Farewell.m4a"
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(
        str(audio_path),
        media_type='audio/mp4',
        filename="Voyaging_Stars_Farewell.m4a"
    )


@app.get("/reproducir/{filename:path}")
def stream_audio(filename: str):
    """Stream specific audio file by filename with full range / seeking support"""
    clean_name = os.path.basename(unquote(filename))
    audio_path = AUDIO_DIR / clean_name
    if not audio_path.exists() or not audio_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # FileResponse automatically supports HTTP Range requests for scrubbing/seeking!
    media_type = 'audio/mp4' if audio_path.suffix.lower() == '.m4a' else 'audio/mpeg'
    return FileResponse(
        str(audio_path),
        media_type=media_type,
        filename=clean_name
    )
