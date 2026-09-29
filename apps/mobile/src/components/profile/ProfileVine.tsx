import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

/**
 * A real ivy photo (apps/mobile/assets/illustrations/profile_vine.png) at the top of
 * ProfileHeader — part of the same scrollable content as the avatar/name/stats below it (one
 * continuous card, not a separate fixed banner), so it scrolls away with the rest of the profile
 * and reappears when scrolling back to the top, like any other list content.
 *
 * Height is computed in plain JS from the real screen width and the image's actual pixel ratio
 * (neither `aspectRatio` nor a fixed height + `resizeMode` reliably matched the image's own shape
 * in practice), so the box is exactly the image's shape — full width, nothing to crop.
 *
 * Uses the full, uncropped source (1536x1024) — the photo's longest trailing strands run almost
 * its entire height with no clean gap anywhere to crop at without slicing through a leaf or stem,
 * so showing the whole thing (a taller banner) is the tradeoff for nothing ever being cut off.
 *
 * `topInset` (pass `insets.top`) reserves space above the image so the OS status bar's
 * clock/battery row keeps showing the plain background, not vine — this is the first thing in the
 * scrollable content now, which otherwise starts right at the true top of the screen.
 */

const SOURCE_WIDTH = 1536;
const SOURCE_HEIGHT = 1024;
const SCREEN_WIDTH = Dimensions.get('window').width;
const HEIGHT = SCREEN_WIDTH / (SOURCE_WIDTH / SOURCE_HEIGHT);

export function ProfileVine({ topInset = 0 }: { topInset?: number }) {
  return (
    <View style={{ paddingTop: topInset }}>
      <Image
        source={require('../../../assets/illustrations/profile_vine.png')}
        style={styles.image}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: SCREEN_WIDTH, height: HEIGHT, marginHorizontal: -20 },
});
