import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { HAIR_COLORS, Mood, SKIN_TONES } from '../lib/echo';
import { DEFAULT_OUTFIT, Outfit, itemById } from '../lib/wardrobe';

/** A small four-point sparkle. */
const star = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r}Z`;

const SPARKLES: [number, number, number][] = [
  [30, 40, 9], [172, 56, 7], [24, 130, 6], [176, 140, 9], [100, 14, 7],
];

/**
 * Placeholder Echo, drawn from simple shapes. The real art replaces this component in 1.0;
 * the props (look, stage, mood, outfit) are what the final character will use too.
 */
export function EchoAvatar({
  size = 200,
  skin = 1,
  hair = 0,
  stage = 0,
  mood = 'content',
  outfit,
  accent = '#8B82FF',
}: {
  size?: number;
  skin?: number;
  hair?: number;
  stage?: number;
  mood?: Mood;
  outfit?: Outfit;
  accent?: string;
}) {
  const skinColor = SKIN_TONES[skin % SKIN_TONES.length];
  const hairColor = HAIR_COLORS[hair % HAIR_COLORS.length];
  const shade = 'rgba(0,0,0,0.08)';
  const o = { ...DEFAULT_OUTFIT, ...(outfit ?? {}) };
  const top = itemById(o.top)!;
  const hat = itemById(o.hat)!;
  const acc = itemById(o.accessory)!;
  const bg = itemById(o.backdrop)!;
  const hasBackdrop = bg.id !== 'bg-none';

  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 200 240">
      <Defs>
        <LinearGradient id={`bg-${bg.id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={bg.color} />
          <Stop offset="1" stopColor={bg.color2 ?? bg.color} />
        </LinearGradient>
      </Defs>

      {/* Scene */}
      {hasBackdrop ? (
        <Rect x="0" y="0" width="200" height="240" rx="28" fill={`url(#bg-${bg.id})`} />
      ) : (
        <Circle cx="100" cy="125" r="96" fill={accent} opacity={0.14} />
      )}
      {bg.id === 'bg-night' || bg.id === 'bg-aurora'
        ? SPARKLES.map(([x, y, r], i) => <Path key={i} d={star(x, y, r * 0.6)} fill="#FFFFFF" opacity={0.85} />)
        : null}
      {bg.id === 'bg-sakura'
        ? [[28, 50], [170, 80], [40, 170], [160, 190], [100, 30]].map(([x, y], i) => (
            <Ellipse key={i} cx={x} cy={y} rx="6" ry="3.5" fill="#FFFFFF" opacity={0.8} rotation={30 * i} origin={`${x}, ${y}`} />
          ))
        : null}
      {bg.id === 'bg-forest'
        ? [[20, 200], [60, 215], [150, 210], [185, 195]].map(([x, y], i) => (
            <Path key={i} d={`M${x - 14} 240 L${x} ${y - 70} L${x + 14} 240Z`} fill="#1F6B50" opacity={0.55} />
          ))
        : null}

      {/* Stage sparkles: one more for each stage reached */}
      {SPARKLES.slice(0, Math.min(stage, 5)).map(([x, y, r], i) => (
        <Path key={i} d={star(x, y, r)} fill={accent} opacity={0.9} />
      ))}

      {/* Wings sit behind the body */}
      {acc.id === 'acc-wings' ? (
        <G opacity={0.95}>
          <Path d="M62 190 C10 170 8 110 30 96 C34 130 54 150 70 160Z" fill={acc.color} stroke={acc.color2} strokeWidth="3" />
          <Path d="M138 190 C190 170 192 110 170 96 C166 130 146 150 130 160Z" fill={acc.color} stroke={acc.color2} strokeWidth="3" />
        </G>
      ) : null}

      {/* Hood and cloak go behind the neck */}
      {top.id === 'top-hoodie' ? <Path d="M56 196 C50 160 70 146 100 146 C130 146 150 160 144 196Z" fill={top.color2} /> : null}
      {top.id === 'top-cloak' ? <Path d="M24 240 C28 180 62 160 100 160 C138 160 172 180 176 240Z" fill={top.color2 ?? top.color} opacity={0.35} /> : null}

      {/* Body */}
      <Path d="M38 240 C38 192 68 172 100 172 C132 172 162 192 162 240Z" fill={top.color} />
      {top.id === 'top-bomber' ? (
        <G>
          <Path d="M100 172 L100 240" stroke={top.color2} strokeWidth="4" />
          <Path d="M38 240 C38 222 40 214 44 206 L52 232Z" fill={top.color2} opacity={0.9} />
          <Path d="M162 240 C162 222 160 214 156 206 L148 232Z" fill={top.color2} opacity={0.9} />
        </G>
      ) : null}
      {top.id === 'top-kimono' ? (
        <G>
          <Path d="M72 174 L100 214 L128 174" fill="none" stroke={top.color2} strokeWidth="6" strokeLinejoin="round" />
          <Rect x="60" y="214" width="80" height="12" fill={top.color2} />
        </G>
      ) : null}
      {top.id === 'top-cloak' ? <Circle cx="100" cy="186" r="6" fill={top.color2} /> : null}
      {top.id === 'top-hoodie' ? <Path d="M90 176 L90 200 M110 176 L110 200" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity={0.8} /> : null}

      {/* Neck */}
      <Rect x="90" y="150" width="20" height="28" rx="8" fill={skinColor} />
      <Rect x="90" y="150" width="20" height="14" rx="6" fill={shade} />

      {/* Scarf */}
      {acc.id === 'acc-scarf' ? (
        <G>
          <Rect x="76" y="158" width="48" height="16" rx="8" fill={acc.color} />
          <Path d="M112 168 L122 200 L106 200Z" fill={acc.color} />
          <Path d="M110 182 L120 182" stroke={acc.color2} strokeWidth="3" />
        </G>
      ) : null}

      {/* Hair behind the head */}
      <Path d="M50 112 C50 54 150 54 150 112 C150 140 142 154 136 160 L64 160 C58 154 50 140 50 112Z" fill={hairColor} />

      {/* Ears and head */}
      <Circle cx="53" cy="118" r="8" fill={skinColor} />
      <Circle cx="147" cy="118" r="8" fill={skinColor} />
      <Ellipse cx="100" cy="112" rx="47" ry="50" fill={skinColor} />

      {/* Face */}
      <Circle cx="68" cy="130" r="8" fill="#FF8FA3" opacity={0.35} />
      <Circle cx="132" cy="130" r="8" fill="#FF8FA3" opacity={0.35} />
      {mood === 'radiant' ? (
        <G>
          <Path d="M70 118 Q80 106 90 118" fill="none" stroke="#231A2E" strokeWidth="4.5" strokeLinecap="round" />
          <Path d="M110 118 Q120 106 130 118" fill="none" stroke="#231A2E" strokeWidth="4.5" strokeLinecap="round" />
        </G>
      ) : mood === 'resting' ? (
        <G>
          {/* Peacefully closed eyes */}
          <Path d="M70 116 Q80 125 90 116" fill="none" stroke="#231A2E" strokeWidth="4" strokeLinecap="round" />
          <Path d="M110 116 Q120 125 130 116" fill="none" stroke="#231A2E" strokeWidth="4" strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Ellipse cx="80" cy="118" rx="9" ry="11" fill="#231A2E" />
          <Ellipse cx="120" cy="118" rx="9" ry="11" fill="#231A2E" />
          <Circle cx="83" cy="113" r="3.2" fill="#FFFFFF" />
          <Circle cx="123" cy="113" r="3.2" fill="#FFFFFF" />
          <Circle cx="77" cy="123" r="1.6" fill="#FFFFFF" opacity={0.8} />
          <Circle cx="117" cy="123" r="1.6" fill="#FFFFFF" opacity={0.8} />
        </G>
      )}
      {mood === 'radiant' ? (
        <Path d="M90 138 Q100 152 110 138Z" fill="#B04A5A" stroke="#B04A5A" strokeWidth="2" strokeLinejoin="round" />
      ) : mood === 'content' ? (
        <Path d="M92 140 Q100 146 108 140" fill="none" stroke="#B04A5A" strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <Path d="M94 141 Q100 145 106 141" fill="none" stroke="#B04A5A" strokeWidth="3" strokeLinecap="round" />
      )}

      {/* Fringe */}
      <Path d="M52 108 C54 60 146 60 148 108 C134 86 114 80 100 90 C86 80 66 86 52 108Z" fill={hairColor} />
      <Path d="M70 76 C86 66 112 66 128 76" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity={0.18} />

      {/* Glasses and headphones */}
      {acc.id === 'acc-glasses' ? (
        <G fill="none" stroke={acc.color} strokeWidth="3.5">
          <Circle cx="80" cy="118" r="15" />
          <Circle cx="120" cy="118" r="15" />
          <Path d="M95 116 L105 116" />
        </G>
      ) : null}
      {acc.id === 'acc-headphones' ? (
        <G>
          <Path d="M52 112 C48 52 152 52 148 112" fill="none" stroke={acc.color} strokeWidth="8" strokeLinecap="round" />
          <Rect x="42" y="102" width="16" height="30" rx="8" fill={acc.color2} />
          <Rect x="142" y="102" width="16" height="30" rx="8" fill={acc.color2} />
        </G>
      ) : null}

      {/* Hats */}
      {hat.id === 'hat-cap' ? (
        <G>
          <Path d="M54 90 C56 56 144 56 146 90Z" fill={hat.color} />
          <Path d="M60 90 L152 90 C160 90 160 98 150 98 L60 98Z" fill={hat.color2} />
        </G>
      ) : null}
      {hat.id === 'hat-beanie' ? (
        <G>
          <Path d="M52 92 C52 50 148 50 148 92Z" fill={hat.color} />
          <Rect x="50" y="86" width="100" height="14" rx="7" fill={hat.color2} />
          <Circle cx="100" cy="48" r="9" fill={hat.color2} />
        </G>
      ) : null}
      {hat.id === 'hat-band' ? <Path d="M52 90 C70 78 130 78 148 90 L148 100 C130 88 70 88 52 100Z" fill={hat.color} /> : null}
      {hat.id === 'hat-wizard' ? (
        <G>
          <Path d="M100 4 L146 86 L54 86Z" fill={hat.color} />
          <Ellipse cx="100" cy="88" rx="62" ry="10" fill={hat.color} />
          <Path d="M64 80 L136 80" stroke={hat.color2} strokeWidth="5" />
          <Path d={star(100, 46, 8)} fill={hat.color2} />
        </G>
      ) : null}
      {hat.id === 'hat-crown' ? (
        <G>
          <Path d="M58 80 L58 52 L78 68 L100 40 L122 68 L142 52 L142 80Z" fill={hat.color} stroke={hat.color2} strokeWidth="3" strokeLinejoin="round" />
          <Circle cx="100" cy="62" r="5" fill="#E5484D" />
        </G>
      ) : null}
    </Svg>
  );
}
