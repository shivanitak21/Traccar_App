import { AI_COMPANION_CONFIG } from './config';

export type CompanionChartType = 'line' | 'bar';

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

export type CompanionContentBlock =
  | CompanionTextBlock
  | CompanionChartBlock
  | CompanionTableBlock;

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

function normalizeChart(data: any): CompanionChartBlock | null {
  const source = data?.data ?? data?.chart ?? data;
  const labels = source?.labels ?? source?.x ?? source?.categories;
  const datasets = source?.datasets ?? source?.series;
  if (!Array.isArray(labels) || !Array.isArray(datasets) || datasets.length === 0) {
    return null;
  }

  const normalizedDatasets = datasets.map((ds: any, index: number) => ({
    label: String(ds?.label ?? ds?.name ?? `Series ${index + 1}`),
    data: (ds?.data ?? ds?.values ?? []).map((v: any) => Number(v) || 0),
    color: ds?.color ?? ds?.backgroundColor,
  }));

  return {
    type: 'chart',
    title: source?.title ?? data?.title,
    chartType: (source?.chartType ?? source?.type ?? 'line') === 'bar' ? 'bar' : 'line',
    labels: labels.map(String),
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

function blocksFromUnknown(value: unknown): CompanionContentBlock[] {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object') return [];

  if (Array.isArray(parsed)) {
    return parsed.flatMap(item => blocksFromUnknown(item));
  }

  const obj = parsed as Record<string, unknown>;
  const type = String(obj.type ?? '').toLowerCase();

  if (type === 'chart' || obj.datasets || obj.series) {
    const chart = normalizeChart(obj);
    return chart ? [chart] : [];
  }

  if (type === 'table' || (obj.columns && obj.rows)) {
    const table = normalizeTable(obj);
    return table ? [table] : [];
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
  const regex = /```(?:json)?\s*([\s\S]*?)```/gi;
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
  if (markdownTable) blocks.push(markdownTable);
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
