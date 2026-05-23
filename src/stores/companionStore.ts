import { create } from 'zustand';
import {
  sendCompanionChat,
  CompanionContentBlock,
} from '../api/aiCompanion';
import { useAuthStore } from './authStore';
import { useFleetStore } from './fleetStore';
import { formatSpeed } from '../utils/units';
import { usePrefsStore } from './prefsStore';

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  blocks?: CompanionContentBlock[];
  streaming?: boolean;
  error?: boolean;
}

interface CompanionState {
  visible: boolean;
  deviceId: number | null;
  deviceName: string | null;
  threadId: string | null;
  messages: CompanionMessage[];
  sending: boolean;

  open: (deviceId: number, deviceName: string) => void;
  close: () => void;
  sendMessage: (text: string) => Promise<void>;
  resetThread: () => void;
}

function buildWelcomeMessage(deviceName: string): CompanionMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    blocks: [{
      type: 'text',
      content:
        `Hi! I'm your AI companion for ${deviceName}. Ask about live status, trips, speed trends, fuel, stops, alerts, or reports.`,
    }],
  };
}

function buildDeviceContext(deviceId: number): string {
  const device = useFleetStore.getState().devices.find(d => d.id === deviceId);
  if (!device) return `Vehicle: ${deviceId}`;

  const prefs = usePrefsStore.getState().prefs;
  const pos = device.position;
  const parts = [
    `Vehicle: ${device.name} (${device.uniqueId})`,
    `Status: ${device.isMoving ? 'Moving' : device.computedStatus}`,
  ];

  if (pos) {
    parts.push(`Speed: ${formatSpeed(pos.speed, prefs.speedUnit)}`);
    parts.push(`Location: ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`);
    if (device.address) parts.push(`Address: ${device.address}`);
    parts.push(`Last update: ${new Date(pos.fixTime).toLocaleString()}`);
  }

  return parts.join('\n');
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  visible: false,
  deviceId: null,
  deviceName: null,
  threadId: null,
  messages: [],
  sending: false,

  open: (deviceId, deviceName) => {
    set({
      visible: true,
      deviceId,
      deviceName,
      threadId: null,
      messages: [buildWelcomeMessage(deviceName)],
      sending: false,
    });
  },

  close: () => {
    set({ visible: false, sending: false });
  },

  resetThread: () => {
    const { deviceName } = get();
    set({
      threadId: null,
      messages: deviceName ? [buildWelcomeMessage(deviceName)] : [],
    });
  },

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const { deviceId, deviceName, threadId, sending } = get();
    if (!deviceId || !deviceName || sending) return;

    const userMessage: CompanionMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
    };

    const assistantId = `${Date.now()}-assistant`;
    const streamingMessage: CompanionMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      blocks: [{ type: 'text', content: '' }],
      streaming: true,
    };

    set(state => ({
      sending: true,
      messages: [...state.messages, userMessage, streamingMessage],
    }));

    const user = useAuthStore.getState().user;
    const userId = user?.email ?? (user?.id ? String(user.id) : undefined);

    try {
      const result = await sendCompanionChat({
        message: trimmed,
        deviceId,
        deviceName,
        threadId: threadId ?? undefined,
        userId,
        context: buildDeviceContext(deviceId),
        onToken: (_token, accumulated) => {
          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    text: accumulated,
                    blocks: [{ type: 'text', content: accumulated }],
                  }
                : msg
            ),
          }));
        },
      });

      set(state => ({
        threadId: result.threadId ?? state.threadId,
        sending: false,
        messages: state.messages.map(msg =>
          msg.id === assistantId
            ? {
                ...msg,
                streaming: false,
                text: result.rawText,
                blocks: result.blocks.length > 0
                  ? result.blocks
                  : [{ type: 'text', content: result.rawText || 'No response received.' }],
              }
            : msg
        ),
      }));
    } catch (error: any) {
      set(state => ({
        sending: false,
        messages: state.messages.map(msg =>
          msg.id === assistantId
            ? {
                ...msg,
                streaming: false,
                error: true,
                blocks: [{
                  type: 'text',
                  content: error?.message ?? 'Failed to reach AI companion. Please try again.',
                }],
              }
            : msg
        ),
      }));
    }
  },
}));
