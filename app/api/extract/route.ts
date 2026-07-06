import { NextRequest, NextResponse } from "next/server";
import { extractFields, ExtractionError } from "@/lib/extractFields";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF file was provided." }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const extracted = await extractFields(buffer);
    return NextResponse.json(extracted, { status: 200 });
  } catch (err) {
    const message =
      err instanceof ExtractionError ? err.message : "Failed to extract data from the PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
