import {
  CompanionChartBlock,
  CompanionContentBlock,
  CompanionMapBlock,
  CompanionMapPoint,
  CompanionMetricsBlock,
  CompanionTableBlock,
} from '../../api/aiCompanion';

export type DisplayBlock =
  | { kind: 'plain'; content: string }
  | { kind: 'markdown'; content: string }
  | { kind: 'table'; table: CompanionTableBlock }
  | { kind: 'chart'; chart: CompanionChartBlock }
  | { kind: 'map'; map: CompanionMapBlock }
  | { kind: 'metrics'; metrics: CompanionMetricsBlock };

export interface PresentOptions {
  streaming?: boolean;
  location?: { latitude: number; longitude: number; title?: string };
}

const METRIC_LINE = /^(?:[-*•]\s+)?(?:\*\*)?([A-Za-z][^:\n]{0,42}?)(?:\*\*)?\s*:\s+(\S.*)$/;
const MARKDOWN_HINT = /(^|\n)\s{0,3}(#{1,6}\s|```|>\s|[-*+]\s|\d+\.\s)|\*\*[^*\n]+\*\*|`[^`\n]+`/;
const LOCATION_HINT = /\b(currently at|located at|location is|current location|parked at|last seen at)\b/i;

function isMarkdown(text: string): boolean {
  return MARKDOWN_HINT.test(text);
}

function isValidCoord(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180
    && !(Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001);
}

function parseMetricSection(section: string): CompanionMetricsBlock | null {
  const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const items: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    const match = line.match(METRIC_LINE);
    if (!match) continue;
    items.push({ label: match[1].trim(), value: match[2].trim() });
  }

  if (items.length < 2 || items.length / lines.length < 0.6) return null;
  return { type: 'metrics', items };
}

function extractCoords(text: string): CompanionMapPoint[] {
  const points: CompanionMapPoint[] = [];
  const labeled = /lat(?:itude)?\s*[:=]\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;/\s]\s*lon(?:g(?:itude)?)?\s*[:=]\s*(-?\d{1,3}(?:\.\d+)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = labeled.exec(text)) !== null) {
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (isValidCoord(latitude, longitude)) points.push({ latitude, longitude });
  }
  if (points.length > 0) return points;

  const pair = /(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/g;
  while ((match = pair.exec(text)) !== null) {
    const previous = match.index > 0 ? text[match.index - 1] : '';
    if (/\d/.test(previous)) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (isValidCoord(latitude, longitude)) points.push({ latitude, longitude });
  }
  return points;
}

function splitText(text: string): DisplayBlock[] {
  const blocks: DisplayBlock[] = [];
  const prose: string[] = [];

  const flushProse = () => {
    const joined = prose.join('\n\n').trim();
    prose.length = 0;
    if (!joined) return;
    blocks.push(isMarkdown(joined) ? { kind: 'markdown', content: joined } : { kind: 'plain', content: joined });
  };

  for (const section of text.split(/\n{2,}/)) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    const metrics = parseMetricSection(trimmed);
    if (metrics) {
      flushProse();
      blocks.push({ kind: 'metrics', metrics });
      continue;
    }
    prose.push(trimmed);
  }
  flushProse();

  const coords = extractCoords(text);
  if (coords.length > 0) {
    blocks.push({
      kind: 'map',
      map: {
        type: 'map',
        markers: coords.map((point, index) => ({
          ...point,
          title: coords.length > 1 ? `Point ${index + 1}` : 'Location',
        })),
      },
    });
  }

  return blocks;
}

export function presentCompanionContent(
  blocks: CompanionContentBlock[] | undefined,
  fallbackText?: string,
  options?: PresentOptions,
): DisplayBlock[] {
  const source: CompanionContentBlock[] = blocks && blocks.length > 0
    ? blocks
    : fallbackText
      ? [{ type: 'text', content: fallbackText }]
      : [];

  const out: DisplayBlock[] = [];
  for (const block of source) {
    if (block.type === 'text') {
      if (block.content.trim()) out.push(...splitText(block.content));
    } else if (block.type === 'chart') {
      out.push({ kind: 'chart', chart: block });
    } else if (block.type === 'table') {
      out.push({ kind: 'table', table: block });
    } else if (block.type === 'map') {
      out.push({ kind: 'map', map: block });
    } else if (block.type === 'metrics') {
      out.push({ kind: 'metrics', metrics: block });
    }
  }

  const hasMap = out.some(block => block.kind === 'map');
  const prose = out
    .filter((block): block is { kind: 'plain' | 'markdown'; content: string } =>
      block.kind === 'plain' || block.kind === 'markdown')
    .map(block => block.content)
    .join('\n');

  if (!options?.streaming && !hasMap && options?.location && LOCATION_HINT.test(prose)) {
    out.push({
      kind: 'map',
      map: {
        type: 'map',
        title: options.location.title ?? 'Current location',
        markers: [{
          latitude: options.location.latitude,
          longitude: options.location.longitude,
          title: options.location.title ?? 'Vehicle',
        }],
      },
    });
  }

  return out;
}

export function responsePrefersWideLayout(
  blocks: CompanionContentBlock[] | undefined,
  fallbackText?: string,
): boolean {
  return presentCompanionContent(blocks, fallbackText).some(block =>
    block.kind === 'chart' || block.kind === 'table' || block.kind === 'map' || block.kind === 'metrics'
  );
}
