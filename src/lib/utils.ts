import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round to n decimal places */
export function round(value: number, decimals: number = 2): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}
