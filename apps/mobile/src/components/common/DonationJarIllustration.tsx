import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, G, Path, Ellipse, Rect } from 'react-native-svg';

/**
 * The Donations empty-state illustration: a hand holding a glass jar with a heart inside and a
 * sprout growing out of the lid.
 *
 * Drawn rather than downloaded. The reference mockup's version isn't a real stock asset — every
 * search for it turned up only licensed Freepik/Vecteezy/iStock lookalikes, none an actual match —
 * and cropping it out of the mockup would mean a ~3.3x upscale of a 143x120px region. SVG stays
 * sharp at any size and carries no licence question.
 *
 * Gradient ids are prefixed: react-native-svg resolves `url(#id)` against a document-wide table,
 * so a bare id like "heart" would collide with any other SVG on screen using the same name.
 */
export function DonationJarIllustration({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.92} viewBox="0 0 200 184">
      <Defs>
        <LinearGradient id="djHeart" x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor="#F4B47C" />
          <Stop offset="1" stopColor="#DC6F42" />
        </LinearGradient>
        <LinearGradient id="djGlass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="0.5" stopColor="#EDF4F5" stopOpacity="0.88" />
          <Stop offset="1" stopColor="#D8E7EA" stopOpacity="0.9" />
        </LinearGradient>
        <LinearGradient id="djLid" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A9A855" />
          <Stop offset="1" stopColor="#71712C" />
        </LinearGradient>
        <LinearGradient id="djSkin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F9D5B8" />
          <Stop offset="1" stopColor="#E9B18C" />
        </LinearGradient>
        <LinearGradient id="djFinger" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#F1BE99" />
          <Stop offset="0.55" stopColor="#F9D5B8" />
          <Stop offset="1" stopColor="#EFBE9B" />
        </LinearGradient>
        <LinearGradient id="djCuff" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3B77B2" />
          <Stop offset="1" stopColor="#A6C6DF" />
        </LinearGradient>
        <RadialGradient id="djGround" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#D6D8C4" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#D6D8C4" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Ellipse cx="84" cy="168" rx="44" ry="9" fill="url(#djGround)" />

      {/* Sprout — drawn first so the stem reads as continuing down through the lid. */}
      <G>
        <Path d="M96 96 C 96 74, 97 50, 100 28" stroke="#3E7A38" strokeWidth="3" fill="none" strokeLinecap="round" />
        <Path d="M99 38 C 88 28, 74 28, 68 36 C 76 46, 91 46, 99 38 Z" fill="#6FA85C" />
        <Path d="M100 32 C 110 20, 126 20, 133 28 C 124 39, 108 40, 100 32 Z" fill="#5B9A4C" />
        <Path d="M97 60 C 86 54, 74 56, 70 63 C 79 70, 92 68, 97 60 Z" fill="#7BB466" />
        <Path d="M99 53 C 109 43, 123 43, 129 50 C 120 59, 106 60, 99 53 Z" fill="#6FA85C" />
        <Path d="M100 24 C 96 16, 100 8, 107 8 C 111 15, 107 22, 100 24 Z" fill="#5B9A4C" />
        {/* Stray falling leaf, echoing the reference's loose detail. */}
        <Path d="M146 50 C 150 45, 156 45, 158 49 C 154 54, 148 54, 146 50 Z" fill="#7BB466" />
      </G>

      {/* Forearm, cuff, then palm — all behind the jar, drawn back to front. */}
      <Path d="M138 140 L 196 194" stroke="url(#djSkin)" strokeWidth="44" strokeLinecap="round" fill="none" />
      <Path d="M152 154 L 172 172" stroke="url(#djCuff)" strokeWidth="48" fill="none" />
      <Path
        d="M100 104 C 122 99, 141 109, 145 126 C 148 141, 138 152, 124 152 L 98 152 C 88 152, 83 143, 86 134 Z"
        fill="url(#djSkin)"
      />

      {/* Jar */}
      <G>
        <Path
          d="M56 92 C 56 79, 63 75, 72 75 L 118 75 C 127 75, 134 79, 134 92 L 134 130 C 134 145, 125 152, 111 152 L 79 152 C 65 152, 56 145, 56 130 Z"
          fill="url(#djGlass)"
          stroke="#C2D6DA"
          strokeWidth="1.8"
        />
        <Rect x="50" y="62" width="90" height="15" rx="6.5" fill="url(#djLid)" />
        <Rect x="53" y="64" width="84" height="4" rx="2" fill="#C3C273" fillOpacity="0.55" />
      </G>

      {/* Heart, seen through the glass */}
      <Path
        d="M95 141 C 74 128, 66 118, 66 107 C 66 98, 73 92, 81 92 C 87 92, 92 95, 95 100 C 98 95, 103 92, 109 92 C 117 92, 124 98, 124 107 C 124 118, 116 128, 95 141 Z"
        fill="url(#djHeart)"
      />

      {/* Specular highlight, over the heart */}
      <Path d="M67 88 C 65 99, 65 118, 67 131" stroke="#FFFFFF" strokeWidth="5" strokeOpacity="0.8" strokeLinecap="round" fill="none" />

      {/* Fingertips curled around the near side of the jar */}
      <G>
        <Rect x="44" y="97" width="30" height="13" rx="6.5" fill="url(#djFinger)" />
        <Rect x="42" y="112" width="32" height="13" rx="6.5" fill="url(#djFinger)" />
        <Rect x="44" y="127" width="30" height="13" rx="6.5" fill="url(#djFinger)" />
        <Rect x="49" y="142" width="26" height="12" rx="6" fill="url(#djFinger)" />
      </G>
    </Svg>
  );
}
