"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

const NAVY = "#071B34";
const ORANGE = "#F97316";

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const ACCEPTED_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
]);

const normalizeHeader = (value) => String(value || "").trim().toLowerCase();

const isAcceptedFile = (file) => {
  if (!file) return false;
  const name = file.name.toLowerCase();
  if (ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return true;
  if (file.type && ACCEPTED_MIME.has(file.type)) return true;
  return false;
};

const findHeaderIndexes = (rows) => {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;
    let stationIndex = -1;
    let rateIndex = -1;
    row.forEach((cell, cellIndex) => {
      const header = normalizeHeader(cell);
      if (header === "station") stationIndex = cellIndex;
      if (header === "rate") rateIndex = cellIndex;
    });
    if (stationIndex >= 0 && rateIndex >= 0) {
      return { headerRowIndex: rowIndex, stationIndex, rateIndex };
    }
  }
  return null;
};

const parseWorkbookRows = (workbook) => {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The file has no worksheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const header = findHeaderIndexes(rows);
  if (!header) {
    throw new Error('Could not find required columns "station" and "rate". Use the template and try again.');
  }

  const parsed = [];
  let skippedInvalidRate = 0;

  for (let i = header.headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const station = String(row[header.stationIndex] ?? "").trim();
    const rateRaw = row[header.rateIndex];
    if (!station && (rateRaw === "" || rateRaw === null || rateRaw === undefined)) continue;
    if (!station) continue;

    const rate = typeof rateRaw === "number" ? rateRaw : Number(String(rateRaw).replace(/,/g, "").trim());
    if (!Number.isFinite(rate) || rate <= 0) {
      skippedInvalidRate += 1;
      continue;
    }
    parsed.push({ station, rate });
  }

  return { parsed, skippedInvalidRate };
};

const readFileAsWorkbook = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      resolve(workbook);
    } catch {
      reject(new Error("Unable to read this file. Please upload a valid Excel or CSV file."));
    }
  };
  reader.onerror = () => reject(new Error("Failed to read the selected file."));
  reader.readAsArrayBuffer(file);
});

export default function ExcelUploadDialog({ open, onClose, onImport }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [totalParsed, setTotalParsed] = useState(0);
  const [skippedInvalidRate, setSkippedInvalidRate] = useState(0);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);

  const resetState = () => {
    setFileName("");
    setPreview([]);
    setTotalParsed(0);
    setSkippedInvalidRate(0);
    setError("");
    setParsing(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  useEffect(() => {
    if (!open) resetState();
  }, [open]);

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["station", "rate"],
      ["guwahati", 10],
      ["tinshukhiya", 14],
      ["dibrugarh", 13],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rates");
    XLSX.writeFile(workbook, "rate-template.xlsx");
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    setError("");
    setPreview([]);
    setTotalParsed(0);
    setSkippedInvalidRate(0);
    setFileName("");

    if (!file) return;

    if (!isAcceptedFile(file)) {
      setError("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }

    setParsing(true);
    setFileName(file.name);

    try {
      const workbook = await readFileAsWorkbook(file);
      const { parsed, skippedInvalidRate: skipped } = parseWorkbookRows(workbook);
      if (!parsed.length) {
        setError(
          skipped > 0
            ? "No valid rows found. Check that rates are numeric and greater than zero."
            : "No data rows found after the header row.",
        );
        setPreview([]);
        setTotalParsed(0);
        setSkippedInvalidRate(skipped);
        return;
      }
      setPreview(parsed.slice(0, 10));
      setTotalParsed(parsed.length);
      setSkippedInvalidRate(skipped);
      if (skipped > 0) {
        setError(`${skipped} row(s) skipped due to invalid rate values.`);
      }
    } catch (parseError) {
      setError(parseError.message || "Failed to parse the file.");
      setPreview([]);
      setTotalParsed(0);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!inputRef.current?.files?.[0] || !totalParsed) {
      setError("Select a valid file with at least one rate row before importing.");
      return;
    }
    setParsing(true);
    setError("");
    try {
      const workbook = await readFileAsWorkbook(inputRef.current.files[0]);
      const { parsed } = parseWorkbookRows(workbook);
      onImport(parsed);
      onClose();
    } catch (parseError) {
      setError(parseError.message || "Import failed.");
    } finally {
      setParsing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rate-upload-title"
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-card-lg"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 id="rate-upload-title" className="text-lg font-bold" style={{ color: NAVY }}>
            Upload Rate Card
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Import general rates from Excel or CSV. Required columns: <strong>station</strong>, <strong>rate</strong>.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:bg-orange-50/40">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              Choose file (.xlsx, .xls, .csv)
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download Template
            </button>
          </div>

          {fileName && (
            <p className="text-xs font-medium text-slate-500">
              Selected: <span className="text-slate-800">{fileName}</span>
              {totalParsed > 0 && ` · ${totalParsed} row(s) ready`}
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {error}
            </p>
          )}

          {preview.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Station</th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, index) => (
                    <tr key={`${row.station}-${index}`}>
                      <td className="px-4 py-2 font-medium text-slate-800">{row.station}</td>
                      <td className="px-4 py-2 text-slate-700">₹{Number(row.rate).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalParsed > 10 && (
                <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                  Showing first 10 of {totalParsed} rows.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={parsing || !totalParsed}
            className="inline-flex h-[42px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: ORANGE }}
          >
            {parsing ? "Processing…" : "Confirm Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
