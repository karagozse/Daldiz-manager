/** 1 ondalik, Turk format (virgul). Ornek: 3.2 -> "3,2" */
export function formatOneDecimalTR(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
