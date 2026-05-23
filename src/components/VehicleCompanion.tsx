import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Bot, X, Send, RotateCcw } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useCompanionStore } from '../stores/companionStore';
import { CompanionMessageBlocks } from './companion/CompanionMessageBlocks';

export const VehicleCompanion: React.FC = () => {
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');

  const {
    visible,
    deviceName,
    messages,
    sending,
    close,
    sendMessage,
    resetThread,
  } = useCompanionStore();

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    await sendMessage(text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, sending, sendMessage]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <Bot size={20} color={colors.primary} strokeWidth={2} />
              <View style={styles.headerTextWrap}>
                <Text style={styles.sheetTitle}>AI Companion</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {deviceName ?? 'Vehicle'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={resetThread} hitSlop={10} style={styles.iconBtn}>
                <RotateCcw size={18} color={colors.text.secondary} />
              </Pressable>
              <Pressable onPress={close} hitSlop={10} style={styles.iconBtn}>
                <X size={22} color={colors.text.secondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.userBubble : styles.botBubble,
                  msg.error && styles.errorBubble,
                ]}
              >
                {msg.role === 'user' ? (
                  <Text style={styles.userText}>{msg.text}</Text>
                ) : (
                  <CompanionMessageBlocks
                    blocks={msg.blocks}
                    fallbackText={msg.text}
                    streaming={msg.streaming}
                  />
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={`Ask about ${deviceName ?? 'this vehicle'}...`}
              placeholderTextColor={colors.text.tertiary}
              multiline
              maxLength={1000}
              editable={!sending}
              onSubmitEditing={handleSend}
            />
            <Pressable
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#0d0f14" />
                : <Send size={18} color="#0d0f14" strokeWidth={2.5} />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    minHeight: '62%',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  sheetTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  sheetSubtitle: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  bubble: {
    maxWidth: '92%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    width: '92%',
  },
  errorBubble: {
    borderColor: colors.error,
  },
  userText: {
    ...typography.body,
    color: '#0d0f14',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text.primary,
    ...typography.body,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
});
