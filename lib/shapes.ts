// The five body shapes shown in the home page hero, with the proportions used to draw the
// silhouette (half-widths in a 200 x 400 viewBox, centre at x = 100).

export type Proportions = { shoulder: number; bust: number; waist: number; hip: number; thigh: number };

export type BodyShape = {
  id: string;
  name: string;
  short: string;
  description: string;
  flatters: string[];
  tone: { from: string; to: string; glow: string };
  figure: Proportions;
};

export const shapes: BodyShape[] = [
  {
    id: "hourglass",
    name: "Hourglass",
    short: "Defined waist",
    description: "Bust and hips in balance, with a clearly defined waist between them.",
    flatters: [
      "Wrap dresses and belted kurtas",
      "Fitted anarkalis that follow the waist",
      "High-waisted trousers with tucked tops",
      "V and sweetheart necklines",
    ],
    tone: { from: "#5e1220", to: "#a8384f", glow: "rgba(168, 56, 79, 0.55)" },
    figure: { shoulder: 42, bust: 41, waist: 25, hip: 44, thigh: 30 },
  },
  {
    id: "pear",
    name: "Pear",
    short: "Fuller hips",
    description: "Hips wider than the shoulders, with a slimmer, delicate upper body.",
    flatters: [
      "Boat necks, embellished yokes and statement sleeves",
      "A-line kurtas and softly flared skirts",
      "Deeper shades below, colour and detail above",
      "Straight or wide-leg trousers",
    ],
    tone: { from: "#0f3d33", to: "#2f8069", glow: "rgba(47, 128, 105, 0.5)" },
    figure: { shoulder: 35, bust: 34, waist: 27, hip: 50, thigh: 34 },
  },
  {
    id: "apple",
    name: "Apple",
    short: "Fuller middle",
    description: "Fuller through the bust and middle, with slimmer arms and legs.",
    flatters: [
      "Empire waists and flowing A-line silhouettes",
      "Deep V-necks that lengthen the torso",
      "Longline jackets and open shrugs",
      "Straight pants and knee-length hems that show your legs",
    ],
    tone: { from: "#7a4a12", to: "#d49c3e", glow: "rgba(212, 156, 62, 0.5)" },
    figure: { shoulder: 40, bust: 43, waist: 41, hip: 40, thigh: 30 },
  },
  {
    id: "rectangle",
    name: "Rectangle",
    short: "Straight lines",
    description: "Shoulders, waist and hips in one long, straight, athletic line.",
    flatters: [
      "Peplums, belts and wrap styles that shape a waist",
      "Layered dupattas and ruffles for soft curves",
      "Angrakhas and asymmetric hemlines",
      "Textured fabrics and bold prints",
    ],
    tone: { from: "#14284a", to: "#3e66a3", glow: "rgba(62, 102, 163, 0.5)" },
    figure: { shoulder: 39, bust: 38, waist: 33, hip: 39, thigh: 29 },
  },
  {
    id: "inverted-triangle",
    name: "Inverted Triangle",
    short: "Broad shoulders",
    description: "Shoulders broader than the hips, with a slim waist and long legs.",
    flatters: [
      "V-necks and halter cuts that soften the shoulders",
      "Flared lehengas, palazzos and A-line skirts",
      "Volume and prints on the lower half",
      "Simple shoulders and soft, fluid drapes",
    ],
    tone: { from: "#47213f", to: "#9b5b8d", glow: "rgba(155, 91, 141, 0.5)" },
    figure: { shoulder: 50, bust: 44, waist: 30, hip: 34, thigh: 27 },
  },
];

const CX = 100;
const f = (n: number) => n.toFixed(1);

type Pt = [number, number];
type Seg = [Pt, Pt, Pt]; // two control points and the end point of a cubic curve

/**
 * Outline of the body (neck to the bottom edge, no head or arms). Every shape produces a path with
 * the same commands in the same order, so one can be animated smoothly into another.
 */
export function bodyPath({ shoulder: s, bust: b, waist: w, hip: h, thigh: t }: Proportions) {
  const start: Pt = [8, 64];
  const right: Seg[] = [
    [[8, 72], [9, 78], [12, 84]],
    [[17, 91], [s - 12, 93], [s, 104]],
    [[s + 6, 110], [b + 1, 122], [b, 142]],
    [[b - 1, 160], [w, 168], [w, 186]],
    [[w, 206], [h, 214], [h, 240]],
    [[h, 262], [t + 3, 280], [t, 305]],
    [[t - 2, 330], [t - 6, 360], [t - 8, 400]],
  ];

  const x = (dx: number, side: 1 | -1) => f(CX + side * dx);
  let d = `M${x(start[0], 1)} ${f(start[1])}`;
  for (const [c1, c2, p] of right) d += ` C${x(c1[0], 1)} ${f(c1[1])} ${x(c2[0], 1)} ${f(c2[1])} ${x(p[0], 1)} ${f(p[1])}`;

  // Back up the left side: the same curves mirrored and reversed.
  const last = right[right.length - 1][2];
  d += ` L${x(last[0], -1)} ${f(last[1])}`;
  for (let i = right.length - 1; i >= 0; i--) {
    const [c1, c2] = right[i];
    const end = i === 0 ? start : right[i - 1][2];
    d += ` C${x(c2[0], -1)} ${f(c2[1])} ${x(c1[0], -1)} ${f(c1[1])} ${x(end[0], -1)} ${f(end[1])}`;
  }
  return `${d} Z`;
}

/** One arm, hanging slightly away from the body so the waist and hips stay visible. */
export function armPath({ shoulder: s, hip: h }: Proportions, side: 1 | -1) {
  const hand = Math.max(h, s) + 12;
  const elbow = (s + hand) / 2 + 2;
  const a = s + 2;
  const p = (dx: number, y: number) => `${f(CX + side * dx)} ${f(y)}`;
  return (
    `M${p(a - 2, 100)}` +
    ` C${p(a + 8, 100)} ${p(a + 9, 112)} ${p(a + 8, 125)}` +
    ` C${p(a + 8, 150)} ${p(elbow + 6, 170)} ${p(elbow + 6, 190)}` +
    ` C${p(elbow + 6, 215)} ${p(hand + 5, 240)} ${p(hand + 5, 262)}` +
    ` C${p(hand + 5, 276)} ${p(hand - 5, 282)} ${p(hand - 6, 270)}` +
    ` C${p(hand - 6, 250)} ${p(elbow - 5, 215)} ${p(elbow - 5, 192)}` +
    ` C${p(elbow - 5, 165)} ${p(a - 6, 145)} ${p(a - 6, 125)} Z`
  );
}
