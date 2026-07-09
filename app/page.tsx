"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { deriveContractFields } from "@/lib/deriveFields";
import { classifyServicesAndTerm } from "@/lib/classifyServicesAndTerm";
import { formatIsoAsDDMMYYYY } from "@/lib/dateUtils";
import type { ExtractedFields } from "@/lib/types";

type Phase = "upload" | "review";
type Busy = "idle" | "extracting" | "generating";

interface ServiceRow {
  name: string;
  amount: string;
  currency: string;
}

interface FormState {
  clientLegalEntityName: string;
  legalEntityAddress: string;
  focusCorePreparer: string;
  clientSignerName: string;
  signingDateRaw: string;
  proposalIssueDateRaw: string;
  currency: "USD" | "MMK" | "";
  services: ServiceRow[];
  invoicingEntity: string;
  invoicingEntityAddress: string;
  attentionPerson: string;
  attentionPersonEmail: string;
  taxIdNo: string;
  poProcess: "Yes" | "No" | "";
  poCodeNo: string;
  specialNotes: string[];
}

const EMPTY_FORM: FormState = {
  clientLegalEntityName: "",
  legalEntityAddress: "",
  focusCorePreparer: "",
  clientSignerName: "",
  signingDateRaw: "",
  proposalIssueDateRaw: "",
  currency: "",
  services: [],
  invoicingEntity: "",
  invoicingEntityAddress: "",
  attentionPerson: "",
  attentionPersonEmail: "",
  taxIdNo: "",
  poProcess: "",
  poCodeNo: "",
  specialNotes: [],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapExtractedToForm(extracted: ExtractedFields): FormState {
  return {
    clientLegalEntityName: extracted.clientLegalEntityName ?? "",
    legalEntityAddress: extracted.legalEntityAddress ?? "",
    focusCorePreparer: extracted.focusCorePreparer ?? "",
    clientSignerName: extracted.clientSignerName ?? "",
    signingDateRaw: extracted.signingDate.raw ?? "",
    proposalIssueDateRaw: extracted.proposalIssueDate.raw ?? "",
    currency: (extracted.contractCurrency as "USD" | "MMK" | null) ?? "",
    services: extracted.services.map((s) => ({
      name: s.name,
      amount: String(s.amount),
      currency: s.currency || "",
    })),
    invoicingEntity: extracted.additionalInvoicingDetails.invoicingEntity,
    invoicingEntityAddress: extracted.additionalInvoicingDetails.invoicingEntityAddress,
    attentionPerson: extracted.additionalInvoicingDetails.attentionPerson,
    attentionPersonEmail: extracted.additionalInvoicingDetails.attentionPersonEmail,
    taxIdNo: extracted.additionalInvoicingDetails.taxIdNo,
    poProcess: extracted.additionalInvoicingDetails.poProcess,
    poCodeNo: extracted.additionalInvoicingDetails.poCodeNo,
    specialNotes: extracted.specialNotes ?? [],
  };
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [busy, setBusy] = useState<Busy>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are supported.");
      return;
    }
    setFile(f);
    setErrorMessage("");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const handleExtract = useCallback(async () => {
    if (!file) return;
    setBusy("extracting");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Something went wrong." }));
        throw new Error(body.error || "Something went wrong.");
      }

      const extracted: ExtractedFields = await res.json();
      setForm(mapExtractedToForm(extracted));
      setPhase("review");
      setBusy("idle");
    } catch (err) {
      setBusy("idle");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [file]);

  const derived = useMemo(
    () =>
      deriveContractFields({
        signingDateRaw: form.signingDateRaw || null,
        proposalIssueDateRaw: form.proposalIssueDateRaw || null,
        currency: form.currency || null,
      }),
    [form.signingDateRaw, form.proposalIssueDateRaw, form.currency]
  );

  const total = useMemo(
    () => form.services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    [form.services]
  );

  const classification = useMemo(
    () =>
      classifyServicesAndTerm(
        form.services.map((s) => ({ name: s.name, amount: Number(s.amount) || 0 })),
        {
          initialTermEndDateDisplay: derived.initialTermEndDate
            ? formatIsoAsDDMMYYYY(derived.initialTermEndDate)
            : "⚠ Pending valid signing date",
          autoRenewal: derived.autoRenewal,
          terminationNoticePeriod: derived.terminationNoticePeriod,
        }
      ),
    [form.services, derived]
  );

  const attentionPersonEmailValid =
    form.attentionPersonEmail.trim() === "" || EMAIL_PATTERN.test(form.attentionPersonEmail.trim());

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateService = (index: number, patch: Partial<ServiceRow>) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const addService = () => {
    setForm((prev) => ({
      ...prev,
      services: [...prev.services, { name: "", amount: "0", currency: prev.currency || "" }],
    }));
  };

  const removeService = (index: number) => {
    setForm((prev) => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }));
  };

  const handleGenerate = useCallback(async () => {
    setBusy("generating");
    setErrorMessage("");

    try {
      const body = {
        clientLegalEntityName: form.clientLegalEntityName || null,
        legalEntityAddress: form.legalEntityAddress || null,
        focusCorePreparer: form.focusCorePreparer || null,
        clientSignerName: form.clientSignerName || null,
        signingDateRaw: form.signingDateRaw || null,
        proposalIssueDateRaw: form.proposalIssueDateRaw || null,
        currency: form.currency || null,
        services: form.services.map((s) => ({
          name: s.name,
          amount: Number(s.amount) || 0,
          currency: s.currency || form.currency || "",
        })),
        additionalInvoicingDetails: {
          invoicingEntity: form.invoicingEntity,
          invoicingEntityAddress: form.invoicingEntityAddress,
          attentionPerson: form.attentionPerson,
          attentionPersonEmail: form.attentionPersonEmail,
          taxIdNo: form.taxIdNo,
          poProcess: form.poProcess,
          poCodeNo: form.poProcess === "Yes" ? form.poCodeNo : "",
        },
        specialNotes: form.specialNotes,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const respBody = await res.json().catch(() => ({ error: "Something went wrong." }));
        throw new Error(respBody.error || "Something went wrong.");
      }

      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "checklist.xlsx";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setBusy("idle");
    } catch (err) {
      setBusy("idle");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [form]);

  return (
    <main className="min-h-screen pb-16">
      <header className="bg-fc-dark text-white">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-2 rounded-sm bg-fc-red" />
            <div>
              <h1 className="text-xl font-semibold">Myanmar Incorporation Extractor</h1>
              <p className="text-sm text-slate-300">
                Upload a signed Incorporation Services Proposal, review the extracted data, then
                generate an Excel checklist.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {phase === "upload" && (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-fc-dark">
              Step 1 — Upload Signed PDF
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors ${
                isDragging ? "border-fc-red bg-red-50" : "border-slate-300 bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {file ? (
                <p className="text-sm font-medium text-fc-dark">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-fc-dark">
                    Drag & drop a PDF here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-500">PDF files only</p>
                </>
              )}
            </div>

            <button
              onClick={handleExtract}
              disabled={!file || busy === "extracting"}
              className="mt-4 w-full rounded-md bg-fc-red px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "extracting" ? "Extracting…" : "Extract Data"}
            </button>

            {busy === "extracting" && (
              <div className="mt-4 flex items-center justify-center gap-3 rounded-md bg-slate-50 py-6 text-sm text-slate-600">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-fc-red" />
                Extracting data from PDF…
              </div>
            )}

            {busy === "idle" && errorMessage && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            )}
          </section>
        )}

        {phase === "review" && (
          <div className="space-y-6">
            <SectionCard title="Client & Signer Info">
              <TextField
                label="Client Legal Entity Name"
                value={form.clientLegalEntityName}
                onChange={(v) => updateField("clientLegalEntityName", v)}
              />
              <TextField
                label="Legal Entity Address"
                value={form.legalEntityAddress}
                onChange={(v) => updateField("legalEntityAddress", v)}
              />
              <TextField
                label="FocusCore Preparer"
                value={form.focusCorePreparer}
                onChange={(v) => updateField("focusCorePreparer", v)}
              />
              <TextField
                label="Client Signer"
                value={form.clientSignerName}
                onChange={(v) => updateField("clientSignerName", v)}
              />
            </SectionCard>

            <SectionCard title="Contract Period & Terms">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Signing Date (as printed — DD/MM/YYYY or e.g. &ldquo;6 Jul 2026&rdquo;)
                </label>
                <input
                  type="text"
                  value={form.signingDateRaw}
                  onChange={(e) => updateField("signingDateRaw", e.target.value)}
                  placeholder="e.g. 06/07/2026"
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    derived.needsReview
                      ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500"
                      : "border-slate-300 focus:border-fc-red focus:ring-fc-red"
                  }`}
                />
                {derived.needsReview && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    ⚠ Needs manual review — {derived.reviewNotes[0]}
                  </p>
                )}
              </div>
              <TextField
                label="Proposal Issue Date (as printed)"
                value={form.proposalIssueDateRaw}
                onChange={(v) => updateField("proposalIssueDateRaw", v)}
              />
              <ReadOnlyField
                label="Contract Start Date"
                value={
                  derived.contractStartDate
                    ? formatIsoAsDDMMYYYY(derived.contractStartDate)
                    : "⚠ Pending valid signing date"
                }
              />
              <ReadOnlyField
                label="Initial Term End Date"
                value={classification.initialTermEndDateDisplay}
              />
              <ReadOnlyField label="Auto-Renewal" value={classification.autoRenewal} />
              <ReadOnlyField
                label="Termination Notice Period"
                value={classification.terminationNoticePeriod}
              />
              <ReadOnlyField
                label="Invoice Due Date"
                value={
                  derived.invoiceDueDate
                    ? formatIsoAsDDMMYYYY(derived.invoiceDueDate)
                    : "⚠ Pending valid signing date"
                }
              />
            </SectionCard>

            <SectionCard title="Financial Terms">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Contract Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value as "USD" | "MMK" | "")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fc-red focus:outline-none focus:ring-1 focus:ring-fc-red"
                >
                  <option value="">— Select —</option>
                  <option value="USD">USD</option>
                  <option value="MMK">MMK</option>
                </select>
              </div>
              <ReadOnlyField label="Commercial Tax (5%)" value={derived.commercialTax} />
              <ReadOnlyField
                label="Stamp Duty Clause Applicable"
                value={derived.stampDutyClauseApplicable}
              />
              {derived.stampDutyClauseApplicable === "Yes" && (
                <ReadOnlyField
                  label="Additional Stamp Duty Fees"
                  value={derived.stampDutyFee ?? ""}
                />
              )}
            </SectionCard>

            <SectionCard title="Services Selected">
              <div className="space-y-2">
                {form.services.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => updateService(i, { name: e.target.value })}
                      placeholder="Service name"
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fc-red focus:outline-none focus:ring-1 focus:ring-fc-red"
                    />
                    <input
                      type="number"
                      value={s.amount}
                      onChange={(e) => updateService(i, { amount: e.target.value })}
                      className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fc-red focus:outline-none focus:ring-1 focus:ring-fc-red"
                    />
                    <button
                      onClick={() => removeService(i)}
                      className="rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-500 hover:bg-slate-100"
                      aria-label="Remove service"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={addService}
                  className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  + Add Service
                </button>
              </div>

              <div className="mt-4 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-fc-dark">
                <span>Total</span>
                <span>
                  {total.toLocaleString()} {form.currency}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm">
                <ReadOnlyField label="One-Time Service(s)" value={classification.oneTimeService} />
                {classification.showOneTimeDetails && (
                  <>
                    <ReadOnlyField
                      label="One-Time Service Name(s)"
                      value={classification.oneTimeServiceNames.join("; ")}
                    />
                    <ReadOnlyField
                      label="One-Time Service Amount"
                      value={classification.oneTimeServiceAmount.toLocaleString()}
                    />
                  </>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Additional Invoicing Details">
              <p className="mb-2 text-xs text-slate-500">
                Entered manually — none of these fields are extracted from the PDF.
              </p>
              <TextField
                label="Invoicing Entity"
                value={form.invoicingEntity}
                onChange={(v) => updateField("invoicingEntity", v)}
              />
              <TextField
                label="Invoicing Entity Address"
                value={form.invoicingEntityAddress}
                onChange={(v) => updateField("invoicingEntityAddress", v)}
              />
              <TextField
                label="Attention Person"
                value={form.attentionPerson}
                onChange={(v) => updateField("attentionPerson", v)}
              />
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Attention Person Email Address
                </label>
                <input
                  type="email"
                  value={form.attentionPersonEmail}
                  onChange={(e) => updateField("attentionPersonEmail", e.target.value)}
                  placeholder="name@example.com"
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    attentionPersonEmailValid
                      ? "border-slate-300 focus:border-fc-red focus:ring-fc-red"
                      : "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500"
                  }`}
                />
                {!attentionPersonEmailValid && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    ⚠ Enter a valid email address.
                  </p>
                )}
              </div>
              <TextField
                label="Tax ID No."
                value={form.taxIdNo}
                onChange={(v) => updateField("taxIdNo", v)}
              />
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  PO Process
                </label>
                <select
                  value={form.poProcess}
                  onChange={(e) => updateField("poProcess", e.target.value as "Yes" | "No" | "")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fc-red focus:outline-none focus:ring-1 focus:ring-fc-red"
                >
                  <option value="">— Select —</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              {form.poProcess === "Yes" && (
                <TextField
                  label="PO Code No."
                  value={form.poCodeNo}
                  onChange={(v) => updateField("poCodeNo", v)}
                />
              )}
              {form.specialNotes.length > 0 && (
                <ReadOnlyField
                  label="Special Invoicing Rule"
                  value={form.specialNotes.join("\n")}
                />
              )}
            </SectionCard>

            {busy === "idle" && errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhase("upload");
                  setBusy("idle");
                  setErrorMessage("");
                  setFile(null);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Start Over
              </button>
              <button
                onClick={handleGenerate}
                disabled={busy === "generating"}
                className="flex-1 rounded-md bg-fc-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "generating" ? "Generating…" : "Generate & Download Excel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fc-dark">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fc-red focus:outline-none focus:ring-1 focus:ring-fc-red"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="whitespace-pre-wrap text-right font-medium text-fc-dark">{value}</span>
    </div>
  );
}
