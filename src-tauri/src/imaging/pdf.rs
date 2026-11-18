//! Minimalny generator PDF: jedna strona, jedno zdjęcie JPEG (DCTDecode).
//!
//! Świadomie bez zewnętrznych bibliotek — wynik to poprawny plik PDF 1.4
//! z jednym obiektem obrazu i tabelą xref.

pub fn single_page_pdf(jpeg: &[u8], width: u32, height: u32) -> Vec<u8> {
  let mut out: Vec<u8> = Vec::with_capacity(jpeg.len() + 1024);
  let mut offsets: Vec<usize> = Vec::with_capacity(5);

  out.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  offsets.push(out.len());
  out.extend_from_slice(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets.push(out.len());
  out.extend_from_slice(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  offsets.push(out.len());
  let page = format!(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n"
  );
  out.extend_from_slice(page.as_bytes());

  let content = format!("q\n{width} 0 0 {height} 0 0 cm\n/Im0 Do\nQ\n");
  offsets.push(out.len());
  out.extend_from_slice(format!("4 0 obj\n<< /Length {} >>\nstream\n", content.len()).as_bytes());
  out.extend_from_slice(content.as_bytes());
  out.extend_from_slice(b"endstream\nendobj\n");

  offsets.push(out.len());
  let image_header = format!(
    "5 0 obj\n<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {} >>\nstream\n",
    jpeg.len()
  );
  out.extend_from_slice(image_header.as_bytes());
  out.extend_from_slice(jpeg);
  out.extend_from_slice(b"\nendstream\nendobj\n");

  let xref_offset = out.len();
  let total_objects = offsets.len() + 1;

  out.extend_from_slice(format!("xref\n0 {total_objects}\n").as_bytes());
  out.extend_from_slice(b"0000000000 65535 f \n");
  for offset in &offsets {
    out.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
  }
  out.extend_from_slice(
    format!(
      "trailer\n<< /Size {total_objects} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"
    )
    .as_bytes(),
  );

  out
}
