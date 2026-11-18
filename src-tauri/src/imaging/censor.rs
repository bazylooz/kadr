//! Cenzura zdjęcia: pikselowanie i rozmycie malowane pędzlem.
//!
//! Każde pociągnięcie pędzla to zbiór punktów (współrzędne naturalne zdjęcia)
//! oraz promień. Efekt jest nakładany tylko na obszar objęty pędzlem — reszta
//! zdjęcia pozostaje nietknięta, a wynik jest deterministyczny.

use image::RgbaImage;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Point {
  pub x: f32,
  pub y: f32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stroke {
  pub mode: String,
  pub r: f32,
  #[serde(default)]
  pub points: Vec<Point>,
}

pub fn apply_strokes(target: &mut RgbaImage, strokes: &[Stroke], scale: f32) {
  for stroke in strokes {
    apply_stroke(target, stroke, scale);
  }
}

fn apply_stroke(target: &mut RgbaImage, stroke: &Stroke, scale: f32) {
  if stroke.points.is_empty() || !(stroke.r > 0.0) {
    return;
  }

  let radius = (stroke.r * scale).max(1.5);
  let raw: Vec<(f32, f32)> = stroke.points.iter().map(|p| (p.x * scale, p.y * scale)).collect();
  let points = expand(&raw, (radius * 0.3).max(1.0));

  let is_blur = stroke.mode == "blur";
  let sigma = radius * 0.7;
  let pad = if is_blur {
    (sigma * 3.0).ceil() as i32
  } else {
    radius.ceil() as i32
  };

  let (mut min_x, mut min_y) = (f32::INFINITY, f32::INFINITY);
  let (mut max_x, mut max_y) = (f32::NEG_INFINITY, f32::NEG_INFINITY);
  for (x, y) in &points {
    min_x = min_x.min(*x);
    max_x = max_x.max(*x);
    min_y = min_y.min(*y);
    max_y = max_y.max(*y);
  }

  let width = target.width() as i32;
  let height = target.height() as i32;

  let x0 = ((min_x - radius).floor() as i32 - pad).clamp(0, width);
  let y0 = ((min_y - radius).floor() as i32 - pad).clamp(0, height);
  let x1 = ((max_x + radius).ceil() as i32 + pad).clamp(0, width);
  let y1 = ((max_y + radius).ceil() as i32 + pad).clamp(0, height);
  if x1 <= x0 || y1 <= y0 {
    return;
  }

  let rw = (x1 - x0) as usize;
  let rh = (y1 - y0) as usize;

  // Kopia obszaru sprzed pociągnięcia — źródło dla pikseli i rozmycia.
  let mut patch = vec![0u8; rw * rh * 4];
  {
    let raw_target = target.as_raw();
    let stride = width as usize * 4;
    for row in 0..rh {
      let start = (y0 as usize + row) * stride + x0 as usize * 4;
      patch[row * rw * 4..(row + 1) * rw * 4].copy_from_slice(&raw_target[start..start + rw * 4]);
    }
  }

  // Maska: suma kół pędzla.
  let mut mask = vec![0u8; rw * rh];
  for (cx, cy) in &points {
    fill_circle(
      &mut mask,
      rw,
      rh,
      x0 as f32,
      y0 as f32,
      *cx,
      *cy,
      radius,
    );
  }

  if is_blur {
    gaussian_blur(&mut patch, rw, rh, sigma);
  } else {
    pixelate(&mut patch, rw, rh, x0, y0, radius);
  }

  let stride = width as usize * 4;
  let raw_target = target.as_mut();
  for row in 0..rh {
    let mask_row = &mask[row * rw..(row + 1) * rw];
    let mut col = 0;
    while col < rw {
      if mask_row[col] == 0 {
        col += 1;
        continue;
      }
      let run_start = col;
      while col < rw && mask_row[col] != 0 {
        col += 1;
      }
      let dst_start = (y0 as usize + row) * stride + (x0 as usize + run_start) * 4;
      let src_start = row * rw * 4 + run_start * 4;
      let len = (col - run_start) * 4;
      raw_target[dst_start..dst_start + len].copy_from_slice(&patch[src_start..src_start + len]);
    }
  }
}

fn expand(points: &[(f32, f32)], spacing: f32) -> Vec<(f32, f32)> {
  if points.is_empty() {
    return Vec::new();
  }

  let mut out = Vec::with_capacity(points.len() * 2);
  out.push(points[0]);

  for pair in points.windows(2) {
    let (ax, ay) = pair[0];
    let (bx, by) = pair[1];
    let (dx, dy) = (bx - ax, by - ay);
    let distance = (dx * dx + dy * dy).sqrt();
    let steps = ((distance / spacing.max(0.5)).ceil() as usize).max(1);
    for step in 1..=steps {
      let t = step as f32 / steps as f32;
      out.push((ax + dx * t, ay + dy * t));
    }
  }

  out
}

fn fill_circle(
  mask: &mut [u8],
  rw: usize,
  rh: usize,
  origin_x: f32,
  origin_y: f32,
  center_x: f32,
  center_y: f32,
  radius: f32,
) {
  let cx = center_x - origin_x;
  let cy = center_y - origin_y;
  let r2 = radius * radius;

  let row_start = ((cy - radius).floor() as i32).max(0);
  let row_end = ((cy + radius).ceil() as i32).min(rh as i32);

  for row in row_start..row_end {
    let dy = row as f32 + 0.5 - cy;
    let inside = r2 - dy * dy;
    if inside <= 0.0 {
      continue;
    }
    let half = inside.sqrt();
    let start = ((cx - half).floor() as i32).max(0) as usize;
    let end = ((cx + half).ceil() as i32).min(rw as i32).max(0) as usize;
    if end <= start {
      continue;
    }
    let base = row as usize * rw;
    mask[base + start..base + end].fill(1);
  }
}

/// Pikselowanie blokowe (średnia z bloku), siatka wyrównana do całego zdjęcia.
fn pixelate(patch: &mut [u8], rw: usize, rh: usize, origin_x: i32, origin_y: i32, radius: f32) {
  let block = ((radius * 0.42).round() as i32).max(4);
  let source = patch.to_vec();

  let mut block_y = (origin_y / block) * block;
  while block_y < origin_y + rh as i32 {
    let mut block_x = (origin_x / block) * block;
    while block_x < origin_x + rw as i32 {
      let gx0 = block_x.max(origin_x);
      let gx1 = (block_x + block).min(origin_x + rw as i32);
      let gy0 = block_y.max(origin_y);
      let gy1 = (block_y + block).min(origin_y + rh as i32);

      let mut sum = [0u32; 4];
      let mut count = 0u32;
      for y in gy0..gy1 {
        for x in gx0..gx1 {
          let index = (((y - origin_y) as usize) * rw + (x - origin_x) as usize) * 4;
          for channel in 0..4 {
            sum[channel] += u32::from(source[index + channel]);
          }
          count += 1;
        }
      }

      if count > 0 {
        let avg = [
          (sum[0] / count) as u8,
          (sum[1] / count) as u8,
          (sum[2] / count) as u8,
          (sum[3] / count) as u8,
        ];
        for y in gy0..gy1 {
          for x in gx0..gx1 {
            let index = (((y - origin_y) as usize) * rw + (x - origin_x) as usize) * 4;
            patch[index..index + 4].copy_from_slice(&avg);
          }
        }
      }

      block_x += block;
    }
    block_y += block;
  }
}

/// Rozmycie Gaussa przybliżone trzema przebiegami box blura (O(1) na piksel).
fn gaussian_blur(patch: &mut [u8], w: usize, h: usize, sigma: f32) {
  if sigma < 0.4 || w == 0 || h == 0 {
    return;
  }

  let radii = box_radii(sigma, 3);
  if radii.iter().all(|radius| *radius == 0) {
    return;
  }

  let mut scratch = vec![0u8; patch.len()];
  for radius in radii {
    if radius == 0 {
      continue;
    }
    box_pass_horizontal(patch, &mut scratch, w, h, radius);
    box_pass_vertical(&scratch, patch, w, h, radius);
  }
}

fn box_radii(sigma: f32, passes: usize) -> Vec<usize> {
  let n = passes as f32;
  let ideal = (12.0 * sigma * sigma / n + 1.0).sqrt();
  let mut lower = ideal.floor() as i32;
  if lower % 2 == 0 {
    lower -= 1;
  }
  let lower = lower.max(1);
  let upper = lower + 2;

  let numerator = 12.0 * sigma * sigma
    - (n * (lower * lower) as f32)
    - (4.0 * n * lower as f32)
    - (3.0 * n);
  let denominator = -4.0 * lower as f32 - 4.0;
  let count = (numerator / denominator).round().clamp(0.0, n) as usize;

  (0..passes)
    .map(|index| {
      let box_size = if index < count { lower } else { upper };
      ((box_size - 1) / 2) as usize
    })
    .collect()
}

fn box_pass_horizontal(src: &[u8], dst: &mut [u8], w: usize, h: usize, radius: usize) {
  let window = (radius * 2 + 1) as u32;

  for y in 0..h {
    let row = &src[y * w * 4..(y + 1) * w * 4];
    let out = &mut dst[y * w * 4..(y + 1) * w * 4];
    let mut sum = [0u32; 4];

    for step in 0..window as isize {
      let x = (step - radius as isize).clamp(0, w as isize - 1) as usize;
      for channel in 0..4 {
        sum[channel] += u32::from(row[x * 4 + channel]);
      }
    }

    for x in 0..w {
      for channel in 0..4 {
        out[x * 4 + channel] = (sum[channel] / window) as u8;
      }
      let add = ((x + radius + 1) as isize).clamp(0, w as isize - 1) as usize;
      let sub = (x as isize - radius as isize).max(0) as usize;
      for channel in 0..4 {
        sum[channel] += u32::from(row[add * 4 + channel]);
        sum[channel] -= u32::from(row[sub * 4 + channel]);
      }
    }
  }
}

fn box_pass_vertical(src: &[u8], dst: &mut [u8], w: usize, h: usize, radius: usize) {
  let window = (radius * 2 + 1) as u32;
  let stride = w * 4;

  for x in 0..w {
    let column = x * 4;
    let mut sum = [0u32; 4];

    for step in 0..window as isize {
      let y = (step - radius as isize).clamp(0, h as isize - 1) as usize;
      for channel in 0..4 {
        sum[channel] += u32::from(src[y * stride + column + channel]);
      }
    }

    for y in 0..h {
      let base = y * stride + column;
      for channel in 0..4 {
        dst[base + channel] = (sum[channel] / window) as u8;
      }
      let add = ((y + radius + 1) as isize).clamp(0, h as isize - 1) as usize;
      let sub = (y as isize - radius as isize).max(0) as usize;
      for channel in 0..4 {
        sum[channel] += u32::from(src[add * stride + column + channel]);
        sum[channel] -= u32::from(src[sub * stride + column + channel]);
      }
    }
  }
}
