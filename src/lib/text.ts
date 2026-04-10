export function summarizeText(input: string, maxLength = 120): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
}

export function titleFromText(input: string): string {
  const compact = summarizeText(input, 70);
  return compact || "Imported failure";
}
