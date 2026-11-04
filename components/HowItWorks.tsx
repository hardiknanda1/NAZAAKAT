import Reveal from "./Reveal";

const steps = [
  {
    title: "Start Your Consultation",
    text: "Tap Start Consultation and allow your camera and microphone. No app or account needed.",
  },
  {
    title: "Meet Your Style Consultant",
    text: "Have a one-on-one consultation to understand your body proportions, preferences and style.",
  },
  {
    title: "Discover Your Personal Style",
    text: "Receive tailored recommendations and a curated fashion catalogue.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="bg-chocolate py-24 text-ivory lg:py-32">
      <div className="container-x">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-beige">How It Works</p>
          <h2 id="how-title" className="mt-5 font-serif text-5xl leading-[1.08] font-medium lg:text-6xl">
            A More Personal <span className="italic">Approach to Style.</span>
          </h2>
        </Reveal>

        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10 lg:mt-20 lg:gap-16">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 0.12} className="border-t border-ivory/30 pt-8">
                <span className="font-serif text-6xl text-beige italic" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-serif text-3xl leading-tight font-medium">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-3 text-lg text-beige">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal className="mt-16 lg:mt-20">
          <a href="/start" className="btn border border-ivory text-lg text-ivory hover:bg-ivory hover:text-chocolate">
            Start Your Consultation
          </a>
        </Reveal>
      </div>
    </section>
  );
}
