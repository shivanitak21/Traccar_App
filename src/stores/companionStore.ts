import { create } from 'zustand';
import { sanitizeBrandText } from '../utils/brandText';
import {
  sendCompanionChat,
  withCompanionVisuals,
  CompanionContentBlock,
} from '../api/aiCompanion';
import { useAuthStore } from './authStore';
import { useFleetStore } from './fleetStore';
import { formatSpeed } from '../utils/units';
import { usePrefsStore } from './prefsStore';
import { resolveAddressForPosition, isLocationQuestion, preferAddressInText } from '../utils/address';

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

async function resolveDeviceAddress(deviceId: number): Promise<string | null> {
  const device = useFleetStore.getState().devices.find(d => d.id === deviceId);
  if (!device?.position) return null;

  let address = device.address || device.position.address || null;
  if (!address) {
    address = await resolveAddressForPosition(device.position);
    if (address) useFleetStore.getState().updateDeviceAddress(deviceId, address);
  }
  return address;
}

async function buildDeviceContext(deviceId: number): Promise<string> {
  const device = useFleetStore.getState().devices.find(d => d.id === deviceId);
  if (!device) return `Vehicle: ${deviceId}`;

  const prefs = usePrefsStore.getState().prefs;
  const pos = device.position;
  const parts = [
    `Vehicle: ${device.name} (${device.uniqueId})`,
    `Status: ${device.isMoving ? 'Moving' : device.computedStatus}`,
    'IMPORTANT: When answering location questions, use the street address below. Never reply with latitude, longitude, or raw coordinates.',
  ];

  if (pos) {
    parts.push(`Speed: ${formatSpeed(pos.speed, prefs.speedUnit)}`);

    const address = await resolveDeviceAddress(deviceId);
    if (address) {
      parts.push(`Address: ${address}`);
      parts.push(`Current location (human-readable): ${address}`);
    } else {
      parts.push('Address: unavailable — say location could not be resolved yet.');
    }

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
      if (isLocationQuestion(trimmed)) {
        const address = await resolveDeviceAddress(deviceId);
        if (address) {
          const directAnswer = `${deviceName} is currently at:\n${address}`;
          set(state => ({
            sending: false,
            messages: state.messages.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    streaming: false,
                    text: directAnswer,
                    blocks: [{ type: 'text', content: directAnswer }],
                  }
                : msg
            ),
          }));
          return;
        }
      }

      const context = await buildDeviceContext(deviceId);
      const knownAddress = await resolveDeviceAddress(deviceId);
      const result = await sendCompanionChat({
        message: trimmed,
        deviceId,
        deviceName,
        threadId: threadId ?? undefined,
        userId,
        context,
      });

      const displayText = (text: string) =>
        sanitizeBrandText(preferAddressInText(text, knownAddress));

      const blocks = withCompanionVisuals(
        result.blocks.length > 0 ? result.blocks : [{ type: 'text', content: result.rawText || 'No response received.' }],
        `${trimmed}\n${result.rawText}`,
      );

      set(state => ({
        threadId: result.threadId ?? state.threadId,
        sending: false,
        messages: state.messages.map(msg =>
          msg.id === assistantId
            ? {
                ...msg,
                streaming: false,
                text: displayText(result.rawText),
                blocks: blocks.map(block =>
                  block.type === 'text'
                    ? { ...block, content: displayText(block.content) }
                    : block
                ),
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
                  content: sanitizeBrandText(error?.message ?? 'Failed to reach AI companion. Please try again.'),
                }],
              }
            : msg
        ),
      }));
    }
  },
}));
