import About from "@/components/About";
import Booking from "@/components/Booking";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import ShapeHero from "@/components/ShapeHero";
import Statement from "@/components/Statement";
import StartAtTop from "@/components/StartAtTop";

// NEXT_PUBLIC_HERO=classic brings back the original photo hero (components/Hero.tsx).
const classicHero = process.env.NEXT_PUBLIC_HERO === "classic";

export default function Home() {
  return (
    <>
      <StartAtTop />
      <Header />
      <main id="main">
        {classicHero ? <Hero /> : <ShapeHero />}
        <Services />
        <Statement>You already have a style. We are here to find it.</Statement>
        <HowItWorks />
        <About />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
