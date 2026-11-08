import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Logo from "@/components/Logo";
import ShapeAnalyzer from "@/components/ShapeAnalyzer";
import { SHAPE_DISCOUNT_PERCENT } from "@/lib/shapes";

export const metadata: Metadata = {
  title: "Find Your Body Shape | NAZAAKAT",
  description: "Guess your body shape, upload one photo, and find out in seconds. Guess right for a discount on your style consultation.",
};

export default function BodyShapePage() {
  return (
    <>
      <Header logo={<Logo />} />
      <main id="main">
        <div className="container-x max-w-4xl pt-32 pb-24 sm:pt-36 lg:pt-40 lg:pb-32">
          <p className="eyebrow">Body Shape Analysis</p>
          <h1 className="mt-5 font-serif text-[2.6rem] leading-[1.06] font-medium text-charcoal sm:text-6xl">
            Do you know your body shape?
            <span className="block text-chocolate italic">Let&apos;s find out.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            Make your guess, then add one photo. We read your proportions in seconds. Guess right and you get{" "}
            <strong className="font-medium text-[#6b1424]">{SHAPE_DISCOUNT_PERCENT}% off</strong> your consultation.
          </p>
          <div className="mt-12">
            <ShapeAnalyzer />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
