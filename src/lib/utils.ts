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