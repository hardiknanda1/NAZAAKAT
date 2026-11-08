import { CalendarHeart } from "lucide-react";

// Small line icons in the same stroke style as Lucide.
function DressFormIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2v2" />
      <path d="M9 4h6c0 2-1.2 3-1.2 4.5 0 1.3 2.2 2.3 2.2 5.5 0 3-2 5-4 5h-2c-2 0-4-2-4-5 0-3.2 2.2-4.2 2.2-5.5C9.2 7 9 6 9 4Z" />
      <path d="M12 19v3M9.5 22h5" />
    </svg>
  );
}

function HangerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 6.5a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2V10" />
      <path d="M12 10 3.3 16.2A1 1 0 0 0 3.9 18h16.2a1 1 0 0 0 .6-1.8Z" />
    </svg>
  );
}

const features = [
  { label: "Body Analysis", Icon: DressFormIcon },
  { label: "Personalised Looks", Icon: HangerIcon },
  { label: "Occasion-Led Dressing", Icon: CalendarHeart },
];

// The row of three icons under the hero's buttons, shared by both hero versions.
export default function HeroFeatures({ iconClassName = "h-9 w-9 text-chocolate", labelClassName = "text-[0.95rem] font-medium sm:text-base" }: { iconClassName?: string; labelClassName?: string }) {
  return (
    <ul className="mt-14 grid max-w-xl grid-cols-3 divide-x divide-taupe/50">
      {features.map(({ label, Icon }) => (
        <li key={label} className="flex flex-col items-center gap-3 px-2 text-center">
          <Icon className={iconClassName} aria-hidden />
          <span className={`leading-snug text-charcoal ${labelClassName}`}>{label}</span>
        </li>
      ))}
    </ul>
  );
}
