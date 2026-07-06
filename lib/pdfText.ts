import pdfParse from "pdf-parse";

/** Extracts raw text from a PDF buffer (text-layer extraction, not OCR/vision). */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}
