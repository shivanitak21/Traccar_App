import { TraccarPosition } from '../api/traccar';

export function mergePositionHistory(
  prev: TraccarPosition[],
  incoming: TraccarPosition | TraccarPosition[],
  maxPoints = 30,
): TraccarPosition[] {
  const incomingList = Array.isArray(incoming) ? incoming : [incoming];
  const byId = new Map<number, TraccarPosition>();

  for (const position of [...prev, ...incomingList]) {
    if (position.latitude && position.longitude) {
      byId.set(position.id, position);
    }
  }

  return [...byId.values()]
    .sort((a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime())
    .slice(-maxPoints);
}

export function positionsToPath(positions: TraccarPosition[]) {
  return positions.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
}
