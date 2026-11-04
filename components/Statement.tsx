import Reveal from "./Reveal";

// A quiet editorial pause between sections.
export default function Statement({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} aria-label="Brand statement" className="py-28 sm:py-36 lg:py-44">
      <Reveal className="container-x text-center">
        <span aria-hidden className="mx-auto block h-14 w-px bg-taupe" />
        <blockquote className="mx-auto mt-10 max-w-4xl font-serif text-[2.4rem] leading-[1.15] text-chocolate italic sm:text-5xl lg:text-[4rem]">
          {children}
        </blockquote>
        <span aria-hidden className="mx-auto mt-10 block h-14 w-px bg-taupe" />
      </Reveal>
    </section>
  );
}
