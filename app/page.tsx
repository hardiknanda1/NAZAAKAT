import About from "@/components/About";
import Booking from "@/components/Booking";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Logo from "@/components/Logo";
import Services from "@/components/Services";
import Statement from "@/components/Statement";
import StartAtTop from "@/components/StartAtTop";

export default function Home() {
  return (
    <>
      <StartAtTop />
      <Header logo={<Logo />} />
      <main id="main">
        <Hero />
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
