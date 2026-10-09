import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { FONTS, TEXT } from '../../constants/typography';
import { RADIUS, SPACING } from '../../constants/theme';
import { parseRichText } from './richTextParser';

/** Splits "a **b** c" into runs so bold text can be styled inside a single <Text>. */
function Inline({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={i} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

/** Renders a lesson section body. The supported markdown subset is documented in richTextParser.ts. */
export function RichText({ body }: { body: string }) {
  const blocks = useMemo(() => parseRichText(body), [body]);

  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'p':
            return <Inline key={i} text={block.text} style={styles.paragraph} />;
          case 'h3':
            return (
              <Text key={i} style={styles.h3}>
                {block.text}
              </Text>
            );
          case 'ul':
            return (
              <View key={i} style={styles.list}>
                {block.items.map((item, k) => (
                  <View key={k} style={styles.listRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Inline text={item} style={styles.listText} />
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={i} style={styles.quote}>
                <Inline text={block.text} style={styles.quoteText} />
              </View>
            );
          case 'stat':
            return (
              <View key={i} style={styles.stat}>
                <Text style={styles.statValue}>{block.value}</Text>
                <Text style={styles.statLabel}>{block.label}</Text>
              </View>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: { ...TEXT.body, fontSize: 17, lineHeight: 28, color: COLORS.textPrimary, marginBottom: SPACING.md },
  bold: { fontFamily: FONTS.bodyBold },
  h3: { ...TEXT.subheading, fontSize: 18, color: COLORS.forestDeep, marginTop: SPACING.xs, marginBottom: SPACING.sm },
  list: { marginBottom: SPACING.md, gap: SPACING.sm },
  listRow: { flexDirection: 'row', gap: SPACING.sm, paddingRight: SPACING.sm },
  bullet: { ...TEXT.body, fontSize: 17, lineHeight: 28, color: COLORS.sageDark },
  listText: { ...TEXT.body, fontSize: 17, lineHeight: 28, color: COLORS.textPrimary, flex: 1 },
  quote: { borderLeftWidth: 4, borderLeftColor: COLORS.sage, paddingLeft: SPACING.md, marginVertical: SPACING.sm, marginBottom: SPACING.md },
  quoteText: { ...TEXT.subheading, fontSize: 19, lineHeight: 29, color: COLORS.forestDeep, fontStyle: 'italic' },
  stat: { backgroundColor: COLORS.forestDeep, borderRadius: RADIUS.lg, padding: SPACING.lg, marginVertical: SPACING.sm, marginBottom: SPACING.md, alignItems: 'center' },
  statValue: { ...TEXT.stat, fontSize: 44, lineHeight: 52, color: COLORS.golden },
  statLabel: { ...TEXT.body, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: SPACING.xs },
});
