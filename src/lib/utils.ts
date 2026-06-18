/**
 * Merge class names, handling conditional classes
 * (shadcn/ui compatible)
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .map((c) => String(c).trim())
    .join(" ");
}
