import { ElevaticsPosition } from '../api/elevatics';

export function mergePositionHistory(
  prev: ElevaticsPosition[],
  incoming: ElevaticsPosition | ElevaticsPosition[],
  maxPoints = 30,
): ElevaticsPosition[] {
  const incomingList = Array.isArray(incoming) ? incoming : [incoming];
  const byId = new Map<number, ElevaticsPosition>();

  for (const position of [...prev, ...incomingList]) {
    if (position.latitude && position.longitude) {
      byId.set(position.id, position);
    }
  }

  return [...byId.values()]
    .sort((a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime())
    .slice(-maxPoints);
}

export function positionsToPath(positions: ElevaticsPosition[]) {
  return positions.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
}
