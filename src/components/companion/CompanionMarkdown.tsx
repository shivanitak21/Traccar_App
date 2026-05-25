/**
 * Lightweight markdown renderer for AI companion chat bubbles.
 * Zero external dependencies — parses common markdown to React Native components.
 *
 * Supported syntax:
 *   Headings:    # H1  ## H2  ### H3
 *   Bold:        **text** or __text__
 *   Italic:      *text* or _text_
 *   Bold+Italic: ***text***
 *   Inline code: `code`
 *   Code block:  ```...```
 *   Blockquote:  > text
 *   Unordered:   - item  •  item  * item
 *   Ordered:     1. item
 *   HR:          --- or *** or ___
 *   Paragraphs:  blank-line separated blocks
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------
type TokenType =
  | 'h1' | 'h2' | 'h3'
  | 'bullet_item'
  | 'ordered_item'
  | 'blockquote'
  | 'code_block'
  | 'hr'
  | 'paragraph';

interface Token {
  type: TokenType;
  content: string;
  number?: number; // ordered list number
}

// ---------------------------------------------------------------------------
// Inline renderer  (bold / italic / code within a line of text)
// ---------------------------------------------------------------------------
let _inlineKey = 0;

function renderInline(text: string): React.ReactNode[] {
  // Patterns ordered by precedence: bold+italic > bold > italic > code
  const INLINE = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|___(.+?)___|\*(.+?)\*|_(.+?)_|`(.+?)`)/gs;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }

    const full = m[0];
    const key = `inline-${_inlineKey++}`;

    if (full.startsWith('***') || full.startsWith('___')) {
      parts.push(<Text key={key} style={inlineStyles.boldItalic}>{m[2] ?? m[5]}</Text>);
    } else if (full.startsWith('**') || full.startsWith('__')) {
      parts.push(<Text key={key} style={inlineStyles.bold}>{m[3] ?? m[4]}</Text>);
    } else if (full.startsWith('`')) {
      parts.push(<Text key={key} style={inlineStyles.code}>{m[8]}</Text>);
    } else {
      parts.push(<Text key={key} style={inlineStyles.italic}>{m[6] ?? m[7]}</Text>);
    }

    last = m.index + full.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

// ---------------------------------------------------------------------------
// Block-level tokeniser
// ---------------------------------------------------------------------------
function tokenise(markdown: string): Token[] {
  const tokens: Token[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines
    if (!trimmed) { i++; continue; }

    // Fenced code block  ``` ... ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      tokens.push({ type: 'code_block', content: codeLines.join('\n') });
      continue;
    }

    // Headings
    if (/^#{1} /.test(trimmed)) {
      tokens.push({ type: 'h1', content: trimmed.slice(2).trim() });
      i++; continue;
    }
    if (/^#{2} /.test(trimmed)) {
      tokens.push({ type: 'h2', content: trimmed.slice(3).trim() });
      i++; continue;
    }
    if (/^#{3,} /.test(trimmed)) {
      const spaceIdx = trimmed.indexOf(' ');
      tokens.push({ type: 'h3', content: trimmed.slice(spaceIdx + 1).trim() });
      i++; continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      tokens.push({ type: 'hr', content: '' });
      i++; continue;
    }

    // Blockquote  — collect consecutive > lines
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      tokens.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Ordered list item
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      tokens.push({ type: 'ordered_item', content: orderedMatch[2], number: parseInt(orderedMatch[1], 10) });
      i++; continue;
    }

    // Unordered list item  - • * +
    if (/^[-•*+]\s/.test(trimmed)) {
      tokens.push({ type: 'bullet_item', content: trimmed.slice(2).trim() });
      i++; continue;
    }

    // Paragraph — collect consecutive non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```') &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^(\d+)\.\s/.test(lines[i].trim()) &&
      !/^[-•*+]\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      tokens.push({ type: 'paragraph', content: paraLines.join(' ') });
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------
function renderToken(token: Token, index: number): React.ReactNode {
  switch (token.type) {
    case 'h1':
      return <Text key={index} style={blockStyles.h1}>{renderInline(token.content)}</Text>;
    case 'h2':
      return <Text key={index} style={blockStyles.h2}>{renderInline(token.content)}</Text>;
    case 'h3':
      return <Text key={index} style={blockStyles.h3}>{renderInline(token.content)}</Text>;

    case 'hr':
      return <View key={index} style={blockStyles.hr} />;

    case 'blockquote':
      return (
        <View key={index} style={blockStyles.blockquote}>
          <Text style={blockStyles.blockquoteText}>{renderInline(token.content)}</Text>
        </View>
      );

    case 'code_block':
      return (
        <ScrollView key={index} horizontal showsHorizontalScrollIndicator={false} style={blockStyles.codeBlock}>
          <Text style={blockStyles.codeBlockText}>{token.content}</Text>
        </ScrollView>
      );

    case 'bullet_item':
      return (
        <View key={index} style={blockStyles.listItem}>
          <Text style={blockStyles.bullet}>{'•'}</Text>
          <Text style={blockStyles.listText}>{renderInline(token.content)}</Text>
        </View>
      );

    case 'ordered_item':
      return (
        <View key={index} style={blockStyles.listItem}>
          <Text style={blockStyles.orderedNum}>{token.number}.</Text>
          <Text style={blockStyles.listText}>{renderInline(token.content)}</Text>
        </View>
      );

    case 'paragraph':
    default:
      return (
        <Text key={index} style={blockStyles.paragraph}>
          {renderInline(token.content)}
        </Text>
      );
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface CompanionMarkdownProps {
  children: string;
}

export const CompanionMarkdown: React.FC<CompanionMarkdownProps> = ({ children }) => {
  const tokens = tokenise(children ?? '');
  return (
    <View style={styles.wrap}>
      {tokens.map((token, i) => renderToken(token, i))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const inlineStyles = StyleSheet.create({
  bold: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  italic: {
    fontStyle: 'italic',
    color: colors.text.secondary,
  },
  boldItalic: {
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.text.primary,
  },
  code: {
    ...typography.mono,
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    borderRadius: 4,
  },
});

const blockStyles = StyleSheet.create({
  h1: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  h2: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: 10,
    marginBottom: 3,
  },
  h3: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 8,
    marginBottom: 2,
  },
  paragraph: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: 4,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginVertical: 10,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 4,
  },
  blockquoteText: {
    ...typography.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  codeBlock: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 10,
    marginVertical: 6,
  },
  codeBlockText: {
    ...typography.mono,
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingRight: 4,
  },
  bullet: {
    ...typography.body,
    color: colors.primary,
    marginRight: 8,
    lineHeight: 22,
    fontWeight: '700',
  },
  orderedNum: {
    ...typography.body,
    color: colors.primary,
    marginRight: 6,
    lineHeight: 22,
    fontWeight: '600',
    minWidth: 18,
  },
  listText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
    flex: 1,
  },
});

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
});
