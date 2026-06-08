export function formatPesoFromCentavos(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(centavos / 100);
}

export function formatManilaDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export function formatManilaDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export function titleize(value: string) {
  return value
    .split("_")
    .map((word) => word.replace(/^\w/, (letter) => letter.toUpperCase()))
    .join(" ");
}
