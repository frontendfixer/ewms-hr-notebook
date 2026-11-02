/** RFC 4180 CSV with a BOM so Excel opens ₹ and → correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined) => {
    let s = value == null ? "" : String(value);
    // Stop spreadsheet apps from treating free text (remarks) as a formula.
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n");
}
