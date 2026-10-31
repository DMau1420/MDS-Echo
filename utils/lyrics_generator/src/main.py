import ctypes
import glob
import json
import os
import subprocess
import sys
from pathlib import Path
import numpy as np

# Cargar librerías de NVIDIA (cublas, cudnn) instaladas en el virtualenv para soporte CUDA
try:
    venv_dir = Path(__file__).resolve().parent.parent / ".venv"
    site_packages = glob.glob(str(venv_dir / "lib" / "python*" / "site-packages"))
    if site_packages:
        sp = site_packages[0]
        for sub in ["nvidia/cublas/lib", "nvidia/cudnn/lib"]:
            lib_dir = os.path.join(sp, sub)
            if os.path.exists(lib_dir):
                for fname in sorted(os.listdir(lib_dir)):
                    if fname.endswith(".so") or ".so." in fname:
                        try:
                            ctypes.CDLL(os.path.join(lib_dir, fname))
                        except Exception:
                            pass
except Exception:
    pass

from faster_whisper import WhisperModel


def load_audio_ffmpeg(file_path: str, sample_rate: int = 16000) -> np.ndarray:
    """Extrae el audio y lo convierte a 16kHz mono float32 con el FFmpeg del sistema."""
    cmd = [
        "ffmpeg",
        "-nostdin",
        "-threads", "0",
        "-i", file_path,
        "-f", "s16le",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-"
    ]
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    out, _ = process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"Error al decodificar audio de {file_path} con ffmpeg")

    return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0


def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def generate_lyrics(audio_path: str, output_path: str | None = None) -> dict:
    audio_file = Path(audio_path).resolve()
    if not audio_file.exists():
        raise FileNotFoundError(f"No se encontró el archivo de audio: {audio_file}")

    nombre_cancion = audio_file.stem

    if output_path is None:
        # Por defecto guardar en MDS-Echo/lyrics/<nombre_cancion>.json
        project_root = Path(__file__).resolve().parents[3]
        lyrics_dir = project_root / "lyrics"
        lyrics_dir.mkdir(parents=True, exist_ok=True)
        output_file = lyrics_dir / f"{nombre_cancion}.json"
    else:
        target = Path(output_path).resolve()
        if target.is_dir() or str(output_path).endswith("/") or str(output_path).endswith("\\"):
            target.mkdir(parents=True, exist_ok=True)
            output_file = target / f"{nombre_cancion}.json"
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            output_file = target

    print(f"Decodificando audio de: {audio_file}...")
    audio_array = load_audio_ffmpeg(str(audio_file))

    # Cargar modelo Whisper (GPU con fallback a CPU)
    use_gpu = True
    try:
        print("Cargando WhisperModel en GPU (CUDA float16)...")
        model = WhisperModel("small", device="cuda", compute_type="float16")
    except Exception as e:
        print(f"CUDA no disponible al iniciar ({e}), usando CPU (int8)...")
        model = WhisperModel("small", device="cpu", compute_type="int8")
        use_gpu = False

    print(f"Transcribiendo '{nombre_cancion}'...")
    try:
        segments_gen, info = model.transcribe(
            audio_array,
            word_timestamps=True,
            vad_filter=False,
            beam_size=5,
        )
        segments = list(segments_gen)
    except Exception as e:
        if use_gpu:
            print(f"CUDA falló durante transcripción ({e}). Reintentando con CPU (int8)...")
            model = WhisperModel("small", device="cpu", compute_type="int8")
            segments_gen, info = model.transcribe(
                audio_array,
                word_timestamps=True,
                vad_filter=False,
                beam_size=5,
            )
            segments = list(segments_gen)
        else:
            raise e

    print(f"Idioma detectado: {info.language} ({info.language_probability:.2f})")

    letras_dict = {}

    for segment in segments:
        texto_segmento = segment.text.strip()
        if not texto_segmento:
            continue

        if segment.words:
            current_sentence = []
            sentence_start = None

            for word in segment.words:
                if sentence_start is None:
                    sentence_start = word.start

                current_sentence.append(word.word.strip())

                if any(word.word.endswith(punct) for punct in [".", ",", "!", "?", "…", "、", "。"]):
                    timestamp = format_time(sentence_start)
                    letras_dict[timestamp] = " ".join(current_sentence)
                    current_sentence = []
                    sentence_start = None

            if current_sentence and sentence_start is not None:
                timestamp = format_time(sentence_start)
                letras_dict[timestamp] = " ".join(current_sentence)
        else:
            timestamp = format_time(segment.start)
            letras_dict[timestamp] = texto_segmento

    resultado = {
        "cancion": nombre_cancion,
        "duración": format_time(info.duration),
        "letra": letras_dict
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=4)

    print(f"✅ Letras guardadas exitosamente en: {output_file}")
    return resultado


def main():
    if len(sys.argv) > 1:
        audio_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        # Respaldo si se llama sin argumentos
        audio_path = "The_Moored_Boat.m4a"
        output_path = None

    generate_lyrics(audio_path, output_path)


if __name__ == "__main__":
    main()
