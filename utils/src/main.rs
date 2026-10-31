use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use futures_util::{SinkExt, StreamExt};
use yt_dlp::Downloader;
use std::path::PathBuf;
use std::time::Duration;
use yt_dlp::client::deps::Libraries;
use yt_dlp::executor::Executor;
use yt_dlp::model::selector::ThumbnailQuality;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "127.0.0.1:9001";
    let listener = TcpListener::bind(addr).await?;
    println!("servidor escuchando en ws://{}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(handle_client(stream));
    }
    Ok(())
}

async fn handle_client(stream: tokio::net::TcpStream) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("Error al aceptar conexion: {}", e);
            return;
        }
    };

    let (mut write, mut read) = ws_stream.split();
    println!("Cliente conectado");

    while let Some(msg) = read.next().await {
        match msg {
            Ok(msg) => {
                if msg.is_text() {
                    let url = msg.to_text().unwrap_or_default().trim().to_string();
                    println!("Url recibida: {}", url);

                    if url.starts_with("http://") || url.starts_with("https://") {
                        match download_yt(url.clone()).await {
                            Ok(title) => {
                                let respuesta = format!("✅ Descarga completada: {}", title);
                                let _ = write.send(respuesta.into()).await;
                            }
                            Err(e) => {
                                eprintln!("Error descargando: {}", e);
                                let respuesta = format!("❌ Error descargando: {}", e);
                                let _ = write.send(respuesta.into()).await;
                            }
                        }
                    } else {
                        let _ = write.send("❌ Eso no parece una URL válida".into()).await;
                    }
                }
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                break;
            }
        }
    }

    println!("Cliente desconectado");
}

async fn download_yt(url: String) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let libraries_dir = PathBuf::from("/bin");
    let output_dir = PathBuf::from("/home/maulinux/Scrips/proyectos/MDS-Echo/audios_prueba");

    let youtube = libraries_dir.join("yt-dlp");
    let ffmpeg = libraries_dir.join("ffmpeg");

    let libraries = Libraries::new(youtube.clone(), ffmpeg.clone());
    let downloader = Downloader::builder(libraries, &output_dir)
        .build()
        .await?;

    let video = downloader.fetch_video_infos(url.clone()).await?;
    let clean_title = video.title.replace(['/', '\\', '\0'], "_");
    let audio_path = output_dir.join(format!("{}.m4a", clean_title));
    let output_template = output_dir.join(format!("{}.%(ext)s", clean_title));
    let img_name = output_dir.join(format!("{}.jpg", clean_title));

    let executor = Executor::new(
        youtube,
        vec![
            "-x".to_string(),
            "--audio-format".to_string(),
            "m4a".to_string(),
            "--ffmpeg-location".to_string(),
            ffmpeg.to_string_lossy().to_string(),
            "-o".to_string(),
            output_template.to_string_lossy().to_string(),
            url,
        ],
        Duration::from_secs(180),
    );
    executor.execute().await?;

    let miniatura = downloader
        .download_thumbnail(&video, ThumbnailQuality::Best, img_name)
        .await?;

    println!("Descargados:");
    println!("{}", audio_path.display());
    println!("{}", miniatura.display());

    Ok(clean_title)
}
