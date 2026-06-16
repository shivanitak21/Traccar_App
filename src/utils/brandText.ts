/** Strip legacy vendor names from strings shown in the UI. */
export function sanitizeBrandText(text: string): string {
  if (!text) return text;
  return text.replace(/traccar/gi, 'Elevatics IoT');
}
