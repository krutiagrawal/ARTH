import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';

interface EyeIconProps {
  visible: boolean;
  color: string;
  size?: number;
}

/** Hand-drawn eye / eye-off icon (no icon library in the app; built with react-native-svg). */
function EyeIcon({ visible, color, size = 22 }: EyeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      {!visible && (
        <Line x1={3} y1={3} x2={21} y2={21} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      )}
    </Svg>
  );
}

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  /** Style applied to the underlying TextInput (keeps each screen's look). */
  inputStyle?: TextInputProps['style'];
  /** Color of the eye icon (default a translucent white to suit the dark cards). */
  iconColor?: string;
}

/**
 * A password TextInput with a trailing eye icon that toggles visibility.
 * Drop-in replacement for `<TextInput secureTextEntry />` — pass the usual TextInput props
 * plus `inputStyle` for the field styling.
 */
export function PasswordInput({ inputStyle, iconColor = 'rgba(255,255,255,0.75)', ...rest }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  // Lift the field's outer margins onto the wrapper so the input's own marginBottom/marginTop
  // doesn't vertically offset the centered eye icon.
  const flat = StyleSheet.flatten(inputStyle) ?? {};
  const {
    margin, marginTop, marginBottom, marginVertical, marginLeft, marginRight, marginHorizontal,
    ...fieldStyle
  } = flat as ViewStyle;
  const outerMargin: ViewStyle = {
    margin, marginTop, marginBottom, marginVertical, marginLeft, marginRight, marginHorizontal,
  };

  return (
    <View style={[outerMargin, styles.wrap]}>
      <TextInput
        {...rest}
        style={[fieldStyle, styles.input]}
        secureTextEntry={!show}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setShow((s) => !s)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
      >
        <EyeIcon visible={show} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    // Reserve space so typed text never runs under the eye icon.
    paddingRight: 46,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
