import { AI_COMPANION_CONFIG } from './config';

export type CompanionChartType = 'line' | 'bar' | 'doughnut' | 'pie';

export interface CompanionChartBlock {
  type: 'chart';
  title?: string;
  chartType: CompanionChartType;
  labels: string[];
  datasets: Array<{ label: string; data: number[]; color?: string }>;
}

export interface CompanionTableBlock {
  type: 'table';
  title?: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | null | undefined>>;
}

export interface CompanionTextBlock {
  type: 'text';
  content: string;
}

export interface CompanionMapPoint {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

export interface CompanionMapBlock {
  type: 'map';
  title?: string;
  markers: CompanionMapPoint[];
  /** Full route line. Markers stay as the pins (usually start and end). */
  path?: CompanionMapPoint[];
}

export interface CompanionMetricsBlock {
  type: 'metrics';
  title?: string;
  items: Array<{ label: string; value: string }>;
}

export type CompanionContentBlock =
  | CompanionTextBlock
  | CompanionChartBlock
  | CompanionTableBlock
  | CompanionMapBlock
  | CompanionMetricsBlock;

export interface CompanionChatResult {
  threadId?: string;
  blocks: CompanionContentBlock[];
  rawText: string;
}

export interface CompanionChatRequest {
  message: string;
  deviceId?: number;
  deviceName?: string;
  threadId?: string;
  userId?: string;
  context?: string;
  onToken?: (token: string, accumulated: string) => void;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeChartType(value: unknown): CompanionChartType {
  const type = String(value ?? '').toLowerCase();
  if (type.includes('doughnut') || type.includes('donut')) return 'doughnut';
  if (type.includes('pie')) return 'pie';
  if (type.includes('bar') || type.includes('column')) return 'bar';
  if (type.includes('line') || type.includes('area') || type.includes('trend')) return 'line';
  return 'line';
}

function unwrapChartSource(data: any): any {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  if (data.chart && typeof data.chart === 'object' && !Array.isArray(data.chart)) {
    return unwrapChartSource({ ...data, ...data.chart, title: data.chart.title ?? data.title });
  }
  const nested = data.data;
  if (
    nested
    && typeof nested === 'object'
    && !Array.isArray(nested)
    && (nested.labels || nested.datasets || nested.series || nested.values)
  ) {
    return {
      ...data,
      ...nested,
      title: nested.title ?? data.title,
      chartType: nested.chartType ?? nested.type ?? data.chartType ?? data.type,
    };
  }
  return data;
}

function numbersFrom(values: any[]): number[] {
  return values.map(value => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value.replace(/,/g, '')) || 0;
    return Number(value?.value ?? value?.y ?? value?.count ?? value?.data) || 0;
  });
}

function normalizeChart(data: any): CompanionChartBlock | null {
  const source = unwrapChartSource(data);
  let labels: any[] | undefined = source?.labels ?? source?.x ?? source?.categories;
  let datasets = source?.datasets ?? source?.series;

  if (!Array.isArray(datasets)) {
    const values = Array.isArray(source?.values)
      ? source.values
      : Array.isArray(source?.data)
        ? source.data
        : null;
    if (values && values.length > 0 && typeof values[0] === 'object' && !Array.isArray(values[0]) && (values[0].label || values[0].name)) {
      labels = values.map((item: any) => item.label ?? item.name);
      datasets = [{ label: source?.title ?? 'Value', data: numbersFrom(values) }];
    } else if (Array.isArray(values)) {
      datasets = [{ label: source?.seriesName ?? source?.title ?? 'Value', data: numbersFrom(values) }];
    }
  }

  if (!Array.isArray(labels) || !Array.isArray(datasets) || datasets.length === 0) return null;

  const normalizedDatasets = datasets.map((ds: any, index: number) => {
    const raw = Array.isArray(ds) ? ds : (ds?.data ?? ds?.values ?? ds?.y ?? []);
    return {
      label: String(ds?.label ?? ds?.name ?? `Series ${index + 1}`),
      data: numbersFrom(Array.isArray(raw) ? raw : []),
      color: typeof ds === 'object' ? ds?.color ?? ds?.backgroundColor : undefined,
    };
  }).filter((ds: { data: number[] }) => ds.data.length > 0);

  if (normalizedDatasets.length === 0) return null;

  const hinted = source?.chartType ?? source?.type ?? data?.chartType ?? data?.type;
  return {
    type: 'chart',
    title: source?.title ?? data?.title,
    chartType: normalizeChartType(hinted),
    labels: labels.map((label: unknown) => String(label)),
    datasets: normalizedDatasets,
  };
}

function normalizeTable(data: any): CompanionTableBlock | null {
  const source = data?.data ?? data?.table ?? data;
  const columns = source?.columns ?? source?.headers;
  const rows = source?.rows ?? source?.data;
  if (!Array.isArray(columns) || !Array.isArray(rows)) return null;

  const normalizedColumns = columns.map((col: any, index: number) => {
    if (typeof col === 'string') {
      return { key: `col_${index}`, label: col };
    }
    return {
      key: String(col?.key ?? col?.field ?? col?.id ?? `col_${index}`),
      label: String(col?.label ?? col?.title ?? col?.key ?? `Column ${index + 1}`),
    };
  });

  const normalizedRows = rows.map((row: any) => {
    if (Array.isArray(row)) {
      return normalizedColumns.reduce<Record<string, string | number>>((acc, col, idx) => {
        acc[col.key] = row[idx] ?? '';
        return acc;
      }, {});
    }
    return row as Record<string, string | number>;
  });

  return {
    type: 'table',
    title: source?.title ?? data?.title,
    columns: normalizedColumns,
    rows: normalizedRows,
  };
}

function isValidCoord(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180
    && !(Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001);
}

function pointFromUnknown(item: any, index: number): CompanionMapPoint | null {
  if (Array.isArray(item) && item.length >= 2) {
    const first = Number(item[0]);
    const second = Number(item[1]);
    const latitude = Math.abs(first) > 90 ? second : first;
    const longitude = Math.abs(first) > 90 ? first : second;
    if (!isValidCoord(latitude, longitude)) return null;
    return { latitude, longitude, title: `Point ${index + 1}` };
  }
  if (!item || typeof item !== 'object') return null;
  const latitude = Number(item.latitude ?? item.lat);
  const longitude = Number(item.longitude ?? item.lng ?? item.lon);
  if (!isValidCoord(latitude, longitude)) return null;
  return {
    latitude,
    longitude,
    title: item.title ? String(item.title) : item.label ? String(item.label) : undefined,
    description: item.description ? String(item.description) : item.address ? String(item.address) : undefined,
  };
}

function normalizeMap(data: any): CompanionMapBlock | null {
  const source = data?.data ?? data?.map ?? data;
  const raw = source?.path ?? source?.polyline ?? source?.route ?? source?.markers ?? source?.points ?? source?.coordinates;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const points = raw
    .map((item: any, index: number) => pointFromUnknown(item, index))
    .filter((point: CompanionMapPoint | null): point is CompanionMapPoint => point != null);
  if (points.length === 0) return null;
  return mapFromPoints(points, source?.title ?? data?.title ?? (points.length > 1 ? 'Route' : 'Location'));
}

function extractCoordPoints(text: string): CompanionMapPoint[] {
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

function mapFromPoints(points: CompanionMapPoint[], title = 'Route'): CompanionMapBlock | null {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return { type: 'map', title: 'Location', markers: [{ ...points[0], title: points[0].title ?? 'Location' }] };
  }
  return {
    type: 'map',
    title,
    markers: [
      { ...points[0], title: 'Start' },
      { ...points[points.length - 1], title: 'End' },
    ],
    path: points,
  };
}

function mapFromTable(table: CompanionTableBlock): CompanionMapBlock | null {
  const latCol = table.columns.find(col => /lat/i.test(col.label) || /lat/i.test(col.key));
  const lonCol = table.columns.find(col => /lon|lng/i.test(col.label) || /lon|lng/i.test(col.key));
  if (!latCol || !lonCol) return null;
  const points = table.rows.map(row => ({
    latitude: Number(row[latCol.key]),
    longitude: Number(row[lonCol.key]),
  })).filter(point => isValidCoord(point.latitude, point.longitude));
  return mapFromPoints(points, table.title ?? 'Route');
}

function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) && String(value ?? '').match(/\d/) ? parsed : null;
}

export function chartFromTable(
  table: CompanionTableBlock,
  chartType: CompanionChartType,
): CompanionChartBlock | null {
  const numericRanked = table.columns
    .map(col => ({
      col,
      score: table.rows.filter(row => /^-?[\d,.]+(?:\s*[%a-z/]+)?$/i.test(String(row[col.key] ?? '').trim())).length,
    }))
    .sort((a, b) => b.score - a.score);
  const numericCol = numericRanked[0]?.score ? numericRanked[0].col : undefined;
  if (!numericCol) return null;
  const labelCol = table.columns.find(col => col.key !== numericCol.key) ?? numericCol;
  const labels = table.rows.map((row, index) => String(row[labelCol.key] ?? `#${index + 1}`));
  const data = table.rows.map(row => numericValue(row[numericCol.key]) ?? 0);
  if (data.every(value => value === 0)) return null;
  return {
    type: 'chart',
    title: table.title,
    chartType,
    labels,
    datasets: [{ label: numericCol.label, data }],
  };
}

export function detectChartType(text: string): CompanionChartType | null {
  if (/doughnut|donut/i.test(text)) return 'doughnut';
  if (/\bpie\b/i.test(text)) return 'pie';
  if (/\b(bar|column)\b/i.test(text)) return 'bar';
  if (/\b(line|trend|over time)\b/i.test(text)) return 'line';
  if (/\b(chart|graph)\b/i.test(text)) return 'bar';
  return null;
}

export function withCompanionVisuals(
  blocks: CompanionContentBlock[],
  hint: string,
): CompanionContentBlock[] {
  const next = [...blocks];
  if (!next.some(block => block.type === 'map' && ((block.path?.length ?? 0) > 1 || block.markers.length > 1))) {
    for (const block of blocks) {
      if (block.type === 'table') {
        const map = mapFromTable(block);
        if (map && (map.path?.length ?? map.markers.length) > 0) {
          next.push(map);
          break;
        }
      }
      if (block.type === 'text') {
        const map = mapFromPoints(extractCoordPoints(block.content));
        if (map) {
          next.push(map);
          break;
        }
      }
    }
  }

  const requested = detectChartType(hint);
  if (requested) {
    const existing = next.find(block => block.type === 'chart');
    if (existing && existing.type === 'chart' && requested !== 'line') {
      existing.chartType = requested;
    } else if (!existing) {
      const table = next.find(block => block.type === 'table');
      if (table && table.type === 'table') {
        const chart = chartFromTable(table, requested);
        if (chart) next.push(chart);
      }
    }
  }

  return next;
}

function normalizeMetrics(data: any): CompanionMetricsBlock | null {
  const source = data?.data ?? data?.metrics ?? data;
  const items = source?.items ?? source?.metrics ?? source?.stats;
  if (!Array.isArray(items) || items.length === 0) return null;

  const normalized = items.map((item: any) => ({
    label: String(item?.label ?? item?.name ?? item?.key ?? ''),
    value: String(item?.value ?? item?.display ?? ''),
  })).filter((item: { label: string; value: string }) => item.label && item.value);

  if (normalized.length === 0) return null;
  return {
    type: 'metrics',
    title: source?.title ?? data?.title,
    items: normalized,
  };
}

function blocksFromUnknown(value: unknown): CompanionContentBlock[] {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object') return [];

  if (Array.isArray(parsed)) {
    const points = parsed
      .map((item, index) => pointFromUnknown(item, index))
      .filter((point): point is CompanionMapPoint => point != null);
    if (points.length >= 2 && points.length >= Math.ceil(parsed.length * 0.5)) {
      const route = mapFromPoints(points, 'Route');
      return route ? [route] : [];
    }
    return parsed.flatMap(item => blocksFromUnknown(item));
  }

  const obj = parsed as Record<string, unknown>;
  const type = String(obj.type ?? '').toLowerCase();
  const chartLike = ['chart', 'bar', 'line', 'pie', 'doughnut', 'donut', 'area', 'column'].includes(type)
    || Boolean(obj.datasets || obj.series)
    || (Array.isArray(obj.labels) && (Array.isArray(obj.data) || Array.isArray(obj.values)));

  if (chartLike) {
    const chart = normalizeChart(obj);
    if (chart) return [chart];
  }

  if (type === 'table' || (obj.columns && obj.rows)) {
    const table = normalizeTable(obj);
    return table ? [table] : [];
  }

  if (type === 'map' || type === 'route' || Array.isArray(obj.markers) || Array.isArray(obj.points) || Array.isArray(obj.path) || Array.isArray(obj.polyline)) {
    const map = normalizeMap(obj);
    if (map) return [map];
  }

  const metricItems = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.metrics) ? obj.metrics : null;
  const looksLikeMetrics = Array.isArray(metricItems) && metricItems.some((item: any) =>
    item && (item.label || item.name) && (item.value != null || item.display != null)
  );
  if (type === 'metrics' || type === 'stats' || looksLikeMetrics) {
    const metrics = normalizeMetrics(obj);
    return metrics ? [metrics] : [];
  }

  if (Array.isArray(obj.blocks)) {
    return obj.blocks.flatMap(block => blocksFromUnknown(block));
  }

  if (Array.isArray(obj.content)) {
    return obj.content.flatMap(block => blocksFromUnknown(block));
  }

  return [];
}

function parseMarkdownTable(text: string): CompanionTableBlock | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.includes('|'));
  if (tableLines.length < 2) return null;

  const headerCells = tableLines[0].split('|').map(c => c.trim()).filter(Boolean);
  const divider = tableLines[1];
  if (!divider.includes('-')) return null;

  const columns = headerCells.map((label, index) => ({
    key: `col_${index}`,
    label,
  }));

  const rows = tableLines.slice(2).map(line => {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    return columns.reduce<Record<string, string>>((acc, col, idx) => {
      acc[col.key] = cells[idx] ?? '';
      return acc;
    }, {});
  });

  if (rows.length === 0) return null;

  return { type: 'table', columns, rows };
}

function extractJsonBlocks(text: string): CompanionContentBlock[] {
  const blocks: CompanionContentBlock[] = [];
  const regex = /```(?:json|chart|javascript)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecNull | null;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(...blocksFromUnknown(match[1]));
  }
  return blocks;
}

function stripMarkdownArtifacts(text: string): string {
  return text
    .replace(/```(?:json)?[\s\S]*?```/gi, '')
    .replace(/^\|.+\|\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildBlocksFromText(text: string): CompanionContentBlock[] {
  const blocks: CompanionContentBlock[] = [];
  const markdownTable = parseMarkdownTable(text);
  if (markdownTable) {
    blocks.push(markdownTable);
    const route = mapFromTable(markdownTable);
    if (route) blocks.push(route);
    const chartType = detectChartType(text);
    if (chartType) {
      const chart = chartFromTable(markdownTable, chartType);
      if (chart) blocks.push(chart);
    }
  }
  const routeFromText = mapFromPoints(extractCoordPoints(text));
  if (routeFromText && !blocks.some(block => block.type === 'map')) blocks.push(routeFromText);
  blocks.push(...extractJsonBlocks(text));

  const cleaned = stripMarkdownArtifacts(text);
  if (cleaned) {
    blocks.unshift({ type: 'text', content: cleaned });
  }

  return blocks;
}

function dedupeBlocks(blocks: CompanionContentBlock[]): CompanionContentBlock[] {
  const seen = new Set<string>();
  return blocks.filter(block => {
    const key = JSON.stringify(block);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseCompanionSSE(raw: string): CompanionChatResult {
  const events: any[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      // ignore malformed chunks
    }
  }

  let threadId: string | undefined;
  let rawText = '';
  const blocks: CompanionContentBlock[] = [];

  for (const event of events) {
    if (event.thread_id) threadId = event.thread_id;

    switch (event.type) {
      case 'token':
        rawText += event.content ?? '';
        break;
      case 'full_response':
        if (typeof event.content === 'string') rawText = event.content;
        if (event.thread_id) threadId = event.thread_id;
        break;
      case 'chart':
      case 'bar':
      case 'line':
      case 'pie':
      case 'doughnut':
      case 'donut':
        {
          const chart = normalizeChart(event);
          if (chart) blocks.push(chart);
        }
        break;
      case 'table':
        {
          const table = normalizeTable(event);
          if (table) blocks.push(table);
        }
        break;
      case 'map':
      case 'route':
        {
          const map = normalizeMap(event);
          if (map) blocks.push(map);
        }
        break;
      case 'metrics':
      case 'stats':
        {
          const metrics = normalizeMetrics(event);
          if (metrics) blocks.push(metrics);
        }
        break;
      case 'tool_result':
      case 'artifact':
      case 'widget':
      case 'visualization':
        blocks.push(
          ...blocksFromUnknown(event.output ?? event.content ?? event.data ?? event.payload)
        );
        break;
      default:
        blocks.push(...blocksFromUnknown(event));
        break;
    }
  }

  if (rawText.trim()) {
    blocks.unshift(...buildBlocksFromText(rawText.trim()));
  }

  const finalBlocks = dedupeBlocks(blocks);
  if (finalBlocks.length === 0 && rawText.trim()) {
    finalBlocks.push({ type: 'text', content: rawText.trim() });
  }

  return {
    threadId,
    blocks: finalBlocks,
    rawText: rawText.trim(),
  };
}

export async function sendCompanionChat(
  request: CompanionChatRequest
): Promise<CompanionChatResult> {
  const url = `${AI_COMPANION_CONFIG.BASE_URL}${AI_COMPANION_CONFIG.CHAT_PATH}`;

  const body = {
    message: request.message,
    device_id: request.deviceId,
    device_name: request.deviceName,
    thread_id: request.threadId,
    user_id: request.userId,
    context: request.context,
  };

  if (request.onToken && typeof XMLHttpRequest !== 'undefined') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastParsedLength = 0;
      let accumulated = '';

      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');

      xhr.onprogress = () => {
        const chunk = xhr.responseText.slice(lastParsedLength);
        lastParsedLength = xhr.responseText.length;
        if (!chunk) return;

        for (const line of chunk.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          try {
            const event = JSON.parse(payload);
            if (event.type === 'token' && event.content) {
              accumulated += event.content;
              request.onToken?.(event.content, accumulated);
            }
          } catch {
            // ignore partial chunks
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parseCompanionSSE(xhr.responseText));
          return;
        }
        reject(new Error(`AI companion request failed (${xhr.status})`));
      };

      xhr.onerror = () => reject(new Error('Network error while contacting AI companion'));
      xhr.send(JSON.stringify(body));
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI companion request failed (${response.status})`);
  }

  const raw = await response.text();
  return parseCompanionSSE(raw);
}
