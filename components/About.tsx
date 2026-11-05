import Photo from "./Photo";
import Reveal from "./Reveal";

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="py-24 lg:py-32">
      <div className="container-x grid items-center gap-14 lg:grid-cols-12 lg:gap-20">
        <Reveal className="lg:col-span-5">
          <Photo
            name="about"
            alt="A woman in an ivory embroidered outfit and statement earrings, looking confidently at the camera"
            className="aspect-[4/5] w-full rounded-t-full"
            sizes="(min-width: 1024px) 40vw, 100vw"
          />
        </Reveal>

        <div className="lg:col-span-7 lg:pl-4">
          <Reveal>
            <p className="eyebrow">About NAZAAKAT</p>
            <h2 id="about-title" className="mt-5 font-serif text-5xl leading-[1.08] font-medium text-charcoal lg:text-6xl">
              Because Style Should <span className="italic text-chocolate">Feel Like You.</span>
            </h2>
            <div className="mt-8 max-w-2xl space-y-5 text-lg text-muted">
              <p>
                We don&apos;t believe fashion is about blindly following trends, or fitting into someone else&apos;s idea
                of how you should look.
              </p>
              <p>
                It is about understanding yourself, your shape, your colours and the life you live, and choosing clothes
                that make you feel comfortable, confident and truly yourself. We listen first, then guide you gently,
                one conversation at a time.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-12 border-l border-taupe pl-6 font-serif text-3xl leading-snug text-chocolate italic sm:text-4xl">
              Confidence is always in fashion.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
