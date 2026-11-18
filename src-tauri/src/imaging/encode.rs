//! Kompresja wyniku do JPG / PNG / WebP / PDF (w całości w Ruście).

use image::RgbaImage;

use super::{encode_jpeg, encode_png, flatten_on_white, pdf, tr};

pub fn encode(image: &RgbaImage, format: &str, quality: u8, lang: &str) -> Result<Vec<u8>, String> {
  let quality = quality.clamp(10, 100);
  let width = image.width();
  let height = image.height();

  match format {
    "png" => encode_png(image),
    "webp" => encode_webp(image, quality, lang),
    "pdf" => {
      let rgb = flatten_on_white(image);
      let jpeg = encode_jpeg(&rgb, width, height, quality)?;
      Ok(pdf::single_page_pdf(&jpeg, width, height))
    }
    "jpeg" | "jpg" | "webp-lossy" => {
      let rgb = flatten_on_white(image);
      encode_jpeg(&rgb, width, height, quality)
    }
    other => Err(format!(
      "{} ({other})",
      tr(
        lang,
        "Nieobsługiwany format eksportu.",
        "Unsupported export format.",
      )
    )),
  }
}

fn encode_webp(image: &RgbaImage, quality: u8, lang: &str) -> Result<Vec<u8>, String> {
  let encoder = webp::Encoder::from_rgba(image.as_raw(), image.width(), image.height());
  let encoded = encoder.encode(f32::from(quality));
  let bytes: &[u8] = &encoded;
  if bytes.is_empty() {
    return Err(
      tr(
        lang,
        "Nie udało się zapisać pliku WebP.",
        "Could not encode the WebP file.",
      )
      .to_string(),
    );
  }
  Ok(bytes.to_vec())
}
