//! Silnik obrazów Kadr w Ruście.
//!
//! Cała obróbka zdjęcia — dekodowanie (z uwzględnieniem orientacji EXIF),
//! zmiana rozmiaru, cenzura (pikselowanie / rozmycie), kompresja JPG/PNG/WebP
//! oraz PDF — odbywa się tutaj, lokalnie, bez wychodzenia do sieci.

mod censor;
mod encode;
mod pdf;

use std::collections::HashMap;
use std::io::Cursor;
use std::sync::{Arc, Mutex};

use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::metadata::Orientation;
use image::{ExtendedColorType, ImageDecoder, ImageEncoder, ImageReader, RgbaImage};
use serde::{Deserialize, Serialize};

use censor::Stroke;

/// Ile obrazów trzymamy w pamięci (ostatnio wczytane).
const MAX_ENTRIES: usize = 3;
/// Powyżej tylu pikseli nie cache'ujemy zdekodowanych danych (oszczędność RAM).
const PIXEL_CACHE_LIMIT: u64 = 28_000_000;
const MAX_SIDE: u32 = 12_000;

/// Tłumaczenie komunikatów błędów (te same, które pokazuje interfejs).
pub(crate) fn tr<'a>(lang: &str, pl: &'a str, en: &'a str) -> &'a str {
  if lang == "en" { en } else { pl }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderOptions {
  pub id: u64,
  pub width: u32,
  pub height: u32,
  pub format: String,
  pub quality: u8,
  #[serde(default)]
  pub strokes: Vec<Stroke>,
  #[serde(default)]
  pub lang: String,
}

struct StoredImage {
  encoded: Vec<u8>,
  decoded: Mutex<Option<Arc<RgbaImage>>>,
}

impl StoredImage {
  fn image(&self, lang: &str) -> Result<Arc<RgbaImage>, String> {
    if let Some(cached) = self.decoded.lock().map_err(|_| "cache lock".to_string())?.as_ref() {
      return Ok(cached.clone());
    }

    let decoded = Arc::new(decode_rgba(&self.encoded, lang)?);
    let pixels = u64::from(decoded.width()) * u64::from(decoded.height());

    let mut guard = self.decoded.lock().map_err(|_| "cache lock".to_string())?;
    if guard.is_none() && pixels <= PIXEL_CACHE_LIMIT {
      *guard = Some(decoded.clone());
    }

    Ok(decoded)
  }
}

#[derive(Default)]
struct StoreInner {
  next_id: u64,
  order: Vec<u64>,
  entries: HashMap<u64, Arc<StoredImage>>,
}

/// Współdzielony magazyn ostatnio wczytanych zdjęć.
#[derive(Default, Clone)]
pub struct ImageStore {
  inner: Arc<Mutex<StoreInner>>,
}

impl ImageStore {
  pub fn new() -> Self {
    Self::default()
  }

  pub fn handle(&self) -> Self {
    self.clone()
  }

  /// Zapisuje zakodowane bajty zdjęcia i zwraca identyfikator dla kolejnych operacji.
  pub fn insert(&self, bytes: Vec<u8>) -> Result<u64, String> {
    let mut inner = self.inner.lock().map_err(|_| "store lock".to_string())?;
    inner.next_id += 1;
    let id = inner.next_id;

    inner.entries.insert(
      id,
      Arc::new(StoredImage {
        encoded: bytes,
        decoded: Mutex::new(None),
      }),
    );
    inner.order.push(id);

    while inner.order.len() > MAX_ENTRIES {
      let evicted = inner.order.remove(0);
      inner.entries.remove(&evicted);
    }

    Ok(id)
  }

  fn get(&self, id: u64) -> Option<Arc<StoredImage>> {
    self
      .inner
      .lock()
      .ok()
      .and_then(|inner| inner.entries.get(&id).cloned())
  }

  /// Pełny potok: dekodowanie → resize → cenzura → kompresja.
  pub fn render(&self, options: &RenderOptions) -> Result<Vec<u8>, String> {
    let stored = self.get(options.id).ok_or_else(|| {
      tr(
        &options.lang,
        "To zdjęcie nie jest już w pamięci — wczytaj je ponownie.",
        "This image is no longer in memory — please load it again.",
      )
      .to_string()
    })?;

    let source = stored.image(&options.lang)?;
    let out_w = options.width.clamp(1, MAX_SIDE);
    let out_h = options.height.clamp(1, MAX_SIDE);

    let mut target = if source.width() == out_w && source.height() == out_h {
      RgbaImage::from_raw(source.width(), source.height(), source.as_raw().clone())
        .ok_or_else(|| "buffer error".to_string())?
    } else {
      image::imageops::resize(&*source, out_w, out_h, image::imageops::FilterType::Lanczos3)
    };

    if !options.strokes.is_empty() {
      let scale = out_w as f32 / source.width() as f32;
      censor::apply_strokes(&mut target, &options.strokes, scale);
    }

    encode::encode(&target, &options.format, options.quality, &options.lang)
  }
}

fn decode_rgba(bytes: &[u8], lang: &str) -> Result<RgbaImage, String> {
  let reader = ImageReader::new(Cursor::new(bytes))
    .with_guessed_format()
    .map_err(|error| {
      format!(
        "{} ({error})",
        tr(lang, "Nie udało się odczytać pliku.", "Could not read the file.")
      )
    })?;

  let mut decoder = reader.into_decoder().map_err(|error| {
    format!(
      "{} ({error})",
      tr(
        lang,
        "Nieobsługiwany format zdjęcia.",
        "Unsupported image format."
      )
    )
  })?;

  let orientation = decoder.orientation().unwrap_or(Orientation::NoTransforms);
  let mut image = image::DynamicImage::from_decoder(decoder).map_err(|error| {
    format!(
      "{} ({error})",
      tr(
        lang,
        "Nie udało się zdekodować zdjęcia.",
        "Could not decode the image."
      )
    )
  })?;

  image.apply_orientation(orientation);
  Ok(image.to_rgba8())
}

/// Spłaszcza przezroczystość na białe tło (JPG/PDF nie mają kanału alfa).
pub(crate) fn flatten_on_white(image: &RgbaImage) -> Vec<u8> {
  let mut out = Vec::with_capacity((image.width() * image.height() * 3) as usize);
  for pixel in image.pixels() {
    let alpha = u16::from(pixel[3]);
    for channel in 0..3 {
      let value = u16::from(pixel[channel]);
      out.push(((value * alpha + 255 * (255 - alpha)) / 255) as u8);
    }
  }
  out
}

pub(crate) fn encode_jpeg(
  rgb: &[u8],
  width: u32,
  height: u32,
  quality: u8,
) -> Result<Vec<u8>, String> {
  let mut out = Vec::new();
  JpegEncoder::new_with_quality(&mut out, quality.clamp(10, 100))
    .write_image(rgb, width, height, ExtendedColorType::Rgb8)
    .map_err(|error| format!("JPEG: {error}"))?;
  Ok(out)
}

pub(crate) fn encode_png(image: &RgbaImage) -> Result<Vec<u8>, String> {
  let mut out = Vec::new();
  PngEncoder::new_with_quality(&mut out, CompressionType::Default, FilterType::Adaptive)
    .write_image(
      image.as_raw(),
      image.width(),
      image.height(),
      ExtendedColorType::Rgba8,
    )
    .map_err(|error| format!("PNG: {error}"))?;
  Ok(out)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedFile {
  pub path: String,
  pub size: u64,
}
