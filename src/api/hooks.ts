import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elevaticsAPI } from './elevatics';
import { QUERY_KEYS } from './config';

// ── Devices ──────────────────────────────────────────────────────────────────

export function useDevices() {
  return useQuery({
    queryKey: QUERY_KEYS.devices,
    queryFn: () => elevaticsAPI.getDevices(),
  });
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.device(id),
    queryFn: () => elevaticsAPI.getDevice(id),
    enabled: !!id,
  });
}

// ── Positions ─────────────────────────────────────────────────────────────────

export function usePositions(deviceId?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.position(deviceId ?? 0),
    queryFn: () => elevaticsAPI.getPositions(deviceId),
    refetchInterval: 15_000,
  });
}

// ── Geofences ─────────────────────────────────────────────────────────────────

export function useGeofences() {
  return useQuery({
    queryKey: QUERY_KEYS.geofences,
    queryFn: () => elevaticsAPI.getGeofences(),
  });
}

export function useCreateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: elevaticsAPI.createGeofence.bind(elevaticsAPI),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.geofences }),
  });
}

export function useUpdateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      elevaticsAPI.updateGeofence(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.geofences }),
  });
}

export function useDeleteGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => elevaticsAPI.deleteGeofence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.geofences }),
  });
}

// ── Events / Alerts ───────────────────────────────────────────────────────────

export function useEvents(deviceId?: number, from?: string, to?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.events(deviceId),
    queryFn: () => elevaticsAPI.getEvents(deviceId, from, to),
    enabled: !!(from && to),
    staleTime: 60_000,
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function useReportRoute(deviceId: number, from: string, to: string) {
  return useQuery({
    queryKey: QUERY_KEYS.reports.route(deviceId, from, to),
    queryFn: () => elevaticsAPI.getRoute(deviceId, from, to),
    enabled: !!(deviceId && from && to),
    staleTime: 5 * 60_000,
  });
}

export function useReportTrips(deviceId: number, from: string, to: string) {
  return useQuery({
    queryKey: QUERY_KEYS.reports.trips(deviceId, from, to),
    queryFn: () => elevaticsAPI.getReportTrips(deviceId, from, to),
    enabled: !!(deviceId && from && to),
    staleTime: 5 * 60_000,
  });
}

export function useReportSummary(deviceId: number, from: string, to: string) {
  return useQuery({
    queryKey: QUERY_KEYS.reports.summary(deviceId, from, to),
    queryFn: () => elevaticsAPI.getReportSummary(deviceId, from, to),
    enabled: !!(deviceId && from && to),
    staleTime: 5 * 60_000,
  });
}

export function useReportStops(deviceId: number, from: string, to: string) {
  return useQuery({
    queryKey: QUERY_KEYS.reports.stops(deviceId, from, to),
    queryFn: () => elevaticsAPI.getReportStops(deviceId, from, to),
    enabled: !!(deviceId && from && to),
    staleTime: 5 * 60_000,
  });
}

// ── Commands ──────────────────────────────────────────────────────────────────

export function useSendCommand() {
  return useMutation({
    mutationFn: ({ deviceId, type, attributes }: { deviceId: number; type: string; attributes?: any }) =>
      elevaticsAPI.sendCommand(deviceId, type, attributes),
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: () => elevaticsAPI.getNotifications(),
    staleTime: 2 * 60_000,
  });
}

// ── Drivers ───────────────────────────────────────────────────────────────────

export function useDrivers() {
  return useQuery({
    queryKey: QUERY_KEYS.drivers,
    queryFn: () => elevaticsAPI.getDrivers(),
  });
}
