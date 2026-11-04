import Photo from "./Photo";
import Reveal from "./Reveal";

const services = [
  {
    title: "Body Shape Analysis",
    text: "Understand your silhouette and the cuts, fabrics and lines that flatter it naturally.",
  },
  {
    title: "Body Proportion Analysis",
    text: "Learn how lengths, waistlines and layers can bring your proportions into graceful balance.",
  },
  {
    title: "Personal Style Assessment",
    text: "Put words to the style you are drawn to, and make it work for your everyday life.",
  },
  {
    title: "Colour Analysis",
    text: "Discover the shades that brighten your complexion and bring warmth to your face.",
  },
  {
    title: "Personalised Outfit Recommendations",
    text: "Outfits chosen for your body and your occasions, with gentle guidance on what to keep, pair and add to your wardrobe.",
  },
  {
    title: "Curated Fashion Catalogues",
    text: "A personal lookbook of pieces selected for you, ready whenever you shop.",
  },
];

export default function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="bg-beige/60 py-24 lg:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <p className="eyebrow">Our Services</p>
              <h2 id="services-title" className="mt-5 font-serif text-5xl leading-[1.08] font-medium text-charcoal lg:text-6xl">
                Your Style, <span className="italic text-chocolate">Understood.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg text-muted">
                Every individual is different. Our consultations help you understand what works for your body,
                personality and lifestyle.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-12 hidden lg:block">
              <Photo
                name="services"
                alt="Close-up of an ivory lace dupatta with delicate floral embroidery"
                className="aspect-[4/5] w-full max-w-sm rounded-t-full"
                sizes="24rem"
              />
            </Reveal>
          </div>
        </div>

        <ol className="lg:col-span-7">
          {services.map((s, i) => (
            <li key={s.title} className="border-t border-taupe/50 last:border-b">
              <Reveal className="grid grid-cols-[3.25rem_1fr] gap-4 py-9 sm:grid-cols-[5rem_1fr] sm:gap-6 sm:py-11">
                <span aria-hidden className="pt-1 font-serif text-3xl text-muted italic sm:text-4xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-serif text-[1.9rem] leading-tight font-medium text-charcoal sm:text-4xl">{s.title}</h3>
                  <p className="mt-3 max-w-lg text-lg text-muted">{s.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
