import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
} from 'react-native';
import { BODY_FACE_BY_WEIGHT, FONTS } from '../../constants/typography';

/**
 * Drop-in replacements for React Native's `Text` and `TextInput` that default to Nunito Sans.
 *
 * React Native has no global font setting. The usual workarounds don't apply here: `defaultProps`
 * was removed in React 19, and RN 0.81 defines `Text`/`TextInput` as plain function components
 * (not `forwardRef` objects), so there's no `.render` to patch either. Importing these instead of
 * the react-native originals is the remaining option that's both type-safe and upgrade-proof.
 *
 * Reanimated's `Animated.Text` is deliberately left alone: every use of it in this app renders an
 * emoji, where the typeface is irrelevant, and wrapping reanimated around a non-native component
 * would put those animations at risk for no gain.
 *
 * Two rules, both load-bearing:
 *  - A style that already names a `fontFamily` is passed through untouched. That's how the
 *    Baloo 2 display styles (`FONTS.display`) keep their rounded face, and how a nested `<Text>` span
 *    can opt into inheriting its parent's face.
 *  - `fontWeight` is cleared whenever a face is applied. A named face already encodes its weight,
 *    and Android honours one or the other rather than combining them — pairing
 *    `NunitoSans_700Bold` with `fontWeight: '700'` can actually render *lighter* than the face
 *    alone.
 */

function faceFor(style: unknown): string | null {
  const flat = StyleSheet.flatten(style as any) as any;
  if (flat?.fontFamily) return null;
  return BODY_FACE_BY_WEIGHT[String(flat?.fontWeight ?? '400')] ?? FONTS.body;
}

// The ref is typed loosely on purpose: `React.ComponentRef<typeof RNText>` trips over this
// workspace's duplicate @types/react resolution. Prop types — the part call sites rely on — are
// still fully checked through TextProps/TextInputProps.
export const Text = React.forwardRef<any, TextProps>(
  ({ style, ...rest }, ref) => {
    const face = faceFor(style);
    return (
      <RNText
        ref={ref}
        style={face ? [style, { fontFamily: face, fontWeight: undefined }] : style}
        {...rest}
      />
    );
  }
);
Text.displayName = 'AppText';

export const TextInput = React.forwardRef<any, TextInputProps>(
  ({ style, ...rest }, ref) => {
    const face = faceFor(style);
    return (
      <RNTextInput
        ref={ref}
        style={face ? [style, { fontFamily: face, fontWeight: undefined }] : style}
        {...rest}
      />
    );
  }
);
TextInput.displayName = 'AppTextInput';
