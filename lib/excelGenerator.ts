import ExcelJS from "exceljs";
import { formatIsoAsDDMMYYYY } from "./dateUtils";
import { classifyServicesAndTerm } from "./classifyServicesAndTerm";
import type { ExtractedFields } from "./types";

const SECTION_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" },
};
const WARNING_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF2CC" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF2C3E50" } };
const TITLE_FONT: Partial<ExcelJS.Font> = { bold: true, size: 14, color: { argb: "FF2C3E50" } };
const WARNING_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFC0392B" } };
const LABEL_COL_WIDTH = 40;
const VALUE_COL_WIDTH = 32;

function currencyFormat(currency: string | null | undefined): string {
  return currency === "MMK" ? '#,##0.00" MMK"' : '"$"#,##0.00';
}

function sanitizeForFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function buildFilename(extracted: ExtractedFields): string {
  const clientName = sanitizeForFilename(extracted.clientLegalEntityName || "Client");
  const signingDateStr = extracted.signingDate.valid && extracted.signingDate.iso
    ? formatIsoAsDDMMYYYY(extracted.signingDate.iso).replace(/\//g, "")
    : "UnverifiedDate";
  return `FC_Client_Master_Checklist_${clientName}_${signingDateStr}.xlsx`;
}

function addSectionHeader(sheet: ExcelJS.Worksheet, title: string): void {
  const row = sheet.addRow([title, ""]);
  sheet.mergeCells(row.number, 1, row.number, 2);
  row.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = SECTION_FILL;
  });
}

function addLabelValueRow(
  sheet: ExcelJS.Worksheet,
  label: string,
  value: string | number | null,
  opts?: { warn?: boolean }
): ExcelJS.Row {
  const row = sheet.addRow([label, value ?? ""]);
  row.getCell(1).font = { bold: true };
  if (opts?.warn) {
    row.getCell(2).fill = WARNING_FILL;
    row.getCell(2).font = WARNING_FONT;
  }
  return row;
}

function displayDate(iso: string | null): string | null {
  return iso ? formatIsoAsDDMMYYYY(iso) : null;
}

export async function generateExcelChecklist(extracted: ExtractedFields): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Myanmar Incorporation Extractor";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Checklist");
  sheet.columns = [{ width: LABEL_COL_WIDTH }, { width: VALUE_COL_WIDTH }];

  const classification = classifyServicesAndTerm(extracted.services, {
    initialTermEndDateDisplay: displayDate(extracted.initialTermEndDate) ?? "⚠ Pending signing date",
    autoRenewal: extracted.autoRenewal,
    terminationNoticePeriod: extracted.terminationNoticePeriod,
  });

  // Title
  const titleRow = sheet.addRow(["Myanmar Incorporation Services — Contract Checklist", ""]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 2);
  titleRow.eachCell((cell) => {
    cell.font = TITLE_FONT;
  });
  sheet.addRow([]);

  // Section 1 — Client & Signer Info
  addSectionHeader(sheet, "Client & Signer Info");
  addLabelValueRow(sheet, "Client Legal Entity Name", extracted.clientLegalEntityName);
  addLabelValueRow(sheet, "Legal Entity Address", extracted.legalEntityAddress);
  addLabelValueRow(sheet, "FocusCore Preparer", extracted.focusCorePreparer);
  addLabelValueRow(sheet, "Client Signer", extracted.clientSignerName);
  sheet.addRow([]);

  // Section 2 — Contract Period & Terms
  addSectionHeader(sheet, "Contract Period & Terms");
  const signingDateDisplay = extracted.signingDate.valid
    ? displayDate(extracted.signingDate.iso)
    : `${extracted.signingDate.raw || "(blank)"} — ⚠ NEEDS MANUAL REVIEW`;
  addLabelValueRow(sheet, "Signing Date", signingDateDisplay, { warn: !extracted.signingDate.valid });
  addLabelValueRow(sheet, "Contract Start Date", displayDate(extracted.contractStartDate) ?? "⚠ Pending signing date");
  addLabelValueRow(sheet, "Initial Term End Date", classification.initialTermEndDateDisplay);
  addLabelValueRow(sheet, "Auto-Renewal", classification.autoRenewal);
  addLabelValueRow(sheet, "Termination Notice Period", classification.terminationNoticePeriod);
  addLabelValueRow(sheet, "Invoice Due Date", displayDate(extracted.invoiceDueDate) ?? "⚠ Pending signing date");
  sheet.addRow([]);

  // Section 3 — Financial Terms
  addSectionHeader(sheet, "Financial Terms");
  addLabelValueRow(sheet, "Contract Currency", extracted.contractCurrency);
  addLabelValueRow(sheet, "Commercial Tax (5%)", extracted.commercialTax);
  addLabelValueRow(sheet, "Stamp Duty Clause Applicable", extracted.stampDutyClauseApplicable);
  sheet.addRow([]);

  // Section 4 — Services Selected
  addSectionHeader(sheet, "Services Selected");
  const serviceHeaderRow = sheet.addRow(["Service Name", "Amount"]);
  serviceHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = { bottom: { style: "thin" } };
  });

  const numFmt = currencyFormat(extracted.contractCurrency);
  let total = 0;
  for (const service of extracted.services) {
    const row = sheet.addRow([service.name, service.amount]);
    row.getCell(2).numFmt = numFmt;
    total += service.amount;
  }

  const totalRow = sheet.addRow(["Total", total]);
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(2).font = { bold: true };
  totalRow.getCell(2).numFmt = numFmt;
  totalRow.getCell(1).border = { top: { style: "thin" } };
  totalRow.getCell(2).border = { top: { style: "thin" } };

  addLabelValueRow(sheet, "One-Time Service(s)", classification.oneTimeService);
  if (classification.showOneTimeDetails) {
    addLabelValueRow(sheet, "One-Time Service Name(s)", classification.oneTimeServiceNames.join("; "));
    const oneTimeAmountRow = addLabelValueRow(
      sheet,
      "One-Time Service Amount",
      classification.oneTimeServiceAmount
    );
    oneTimeAmountRow.getCell(2).numFmt = numFmt;
  }
  sheet.addRow([]);

  // Section 5 — Additional Invoicing Details (manual entry)
  addSectionHeader(sheet, "Additional Invoicing Details");
  const invoicing = extracted.additionalInvoicingDetails;
  addLabelValueRow(sheet, "Invoicing Entity", invoicing.invoicingEntity);
  addLabelValueRow(sheet, "Invoicing Entity Address", invoicing.invoicingEntityAddress);
  addLabelValueRow(sheet, "Attention Person", invoicing.attentionPerson);
  addLabelValueRow(sheet, "Attention Person Email Address", invoicing.attentionPersonEmail);
  addLabelValueRow(sheet, "Tax ID No.", invoicing.taxIdNo);
  addLabelValueRow(sheet, "PO Process", invoicing.poProcess);
  if (invoicing.poProcess === "Yes") {
    addLabelValueRow(sheet, "PO Code No.", invoicing.poCodeNo);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
