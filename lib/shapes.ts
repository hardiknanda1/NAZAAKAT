// The five body shapes shown in the home page hero, in the order of its guess buttons. The ring of
// panels repeats them in this order. `id` is stored with guesses and analyses, so it never changes,
// even where the display name does (pear is shown as "Triangle", apple as "Round").

export type Proportions = { shoulder: number; bust: number; waist: number; hip: number; thigh: number };
type Pt = [number, number];

export type BodyShape = {
  id: string;
  name: string;
  short: string;
  description: string;
  flatters: string[];
  tone: { from: string; to: string; glow: string }; // the deep colours of the shape's card
  panel: string; // the muted colour of its panels in the hero ring
  figure: Proportions; // half-widths for the small outline on the card (200 x 400 viewBox)
};

export const shapes: BodyShape[] = [
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
    tone: { from: "#0d3c40", to: "#165a5c", glow: "rgba(31, 95, 107, 0.45)" },
    panel: "#2a6f70",
    figure: { shoulder: 50, bust: 44, waist: 30, hip: 34, thigh: 27 },
  },
  {
    id: "rectangle",
    name: "Rectangle",
    short: "Straight lines",
    description: "Shoulders, waist and hips in one long, straight, athletic line.",
    flatters: [
      "Peplums, belts and wrap styles that shape a waist",
      "Angrakhas and asymmetric hemlines",
      "Layered dupattas and ruffles for soft curves",
      "Textured fabrics and bold prints",
    ],
    tone: { from: "#033227", to: "#0a4636", glow: "rgba(8, 67, 52, 0.45)" },
    panel: "#2f7a5e",
    figure: { shoulder: 39, bust: 38, waist: 33, hip: 39, thigh: 29 },
  },
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
    tone: { from: "#4f0c1c", to: "#74172c", glow: "rgba(122, 20, 38, 0.45)" },
    panel: "#8f2235",
    figure: { shoulder: 42, bust: 41, waist: 25, hip: 44, thigh: 30 },
  },
  {
    id: "pear",
    name: "Triangle",
    short: "Fuller hips",
    description: "Hips wider than the shoulders, with a slimmer, delicate upper body.",
    flatters: [
      "Boat necks, embellished yokes and statement sleeves",
      "A-line kurtas and softly flared skirts",
      "Deeper shades below, colour and detail above",
      "Straight or wide-leg trousers",
    ],
    tone: { from: "#6a2320", to: "#8e3a31", glow: "rgba(208, 100, 95, 0.45)" },
    panel: "#d4655f",
    figure: { shoulder: 35, bust: 34, waist: 27, hip: 50, thigh: 34 },
  },
  {
    id: "apple",
    name: "Round",
    short: "Fuller middle",
    description: "Fuller through the bust and middle, with slimmer arms and legs.",
    flatters: [
      "Empire waists and flowing A-line silhouettes",
      "Deep V-necks that lengthen the torso",
      "Longline jackets and open shrugs",
      "Straight pants and knee-length hems that show your legs",
    ],
    tone: { from: "#5c3d0a", to: "#7d5612", glow: "rgba(215, 162, 56, 0.45)" },
    panel: "#d6a23c",
    figure: { shoulder: 40, bust: 43, waist: 41, hip: 40, thigh: 30 },
  },
];

const CX = 100;
const f = (n: number) => n.toFixed(1);
type Seg = [Pt, Pt, Pt]; // two control points and the end point of a cubic curve

/** Outline of the body (neck to the bottom edge), drawn as a small icon on each shape's card. */
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

export const SHAPE_IDS = shapes.map((s) => s.id);
export const shapeById = (id: string | null | undefined) => shapes.find((s) => s.id === id) ?? null;

// Discount for guessing your own body shape right. Public so the page and the server agree on it.
const configuredPercent = Number(process.env.NEXT_PUBLIC_SHAPE_DISCOUNT_PERCENT);
export const SHAPE_DISCOUNT_PERCENT = configuredPercent > 0 && configuredPercent < 100 ? Math.round(configuredPercent) : 20;

// Browser storage keys shared by the hero, the analyser and the booking page.
export const GUESS_KEY = "nazaakat_shape_guess";
export const DISCOUNT_KEY = "nazaakat_discount";
export type StoredDiscount = { id: string; phone: string; percent: number };
