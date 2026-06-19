export type InvoiceTemplateId = "classic" | "modern" | "minimal";

export const INVOICE_TEMPLATES = [
  {
    id: "classic" as InvoiceTemplateId,
    name: "Classic",
    description: "Clean professional layout with blue accents and bordered line items.",
    previewAccent: "#2563eb",
    previewBg: "#eff6ff",
  },
  {
    id: "modern" as InvoiceTemplateId,
    name: "Modern",
    description: "Bold colored header band with elegant typography.",
    previewAccent: "#7c3aed",
    previewBg: "#f5f3ff",
  },
  {
    id: "minimal" as InvoiceTemplateId,
    name: "Minimal",
    description: "Simple and elegant — ideal for black-and-white printing.",
    previewAccent: "#111827",
    previewBg: "#f9fafb",
  },
] as const;
