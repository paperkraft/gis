import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeFirstLetter(value?: string | null): string {
  if (!value) return "";
  const str = value.trim();
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}

export function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, char => char.toUpperCase());
}

export function naturalSort(a: any, b: any, direction: "asc" | "desc" = "asc") {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;

  const isANumber = !isNaN(Number(a)) && a !== "" && typeof a !== "boolean";
  const isBNumber = !isNaN(Number(b)) && b !== "" && typeof b !== "boolean";

  if (isANumber && isBNumber) {
    const numA = Number(a);
    const numB = Number(b);
    return direction === "asc" ? numA - numB : numB - numA;
  }

  // Natural sort for strings (handles P-1, P-2, P-10)
  const comparison = String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return direction === "asc" ? comparison : -comparison;
}