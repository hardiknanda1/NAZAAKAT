import About from "@/components/About";
import Booking from "@/components/Booking";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Logo from "@/components/Logo";
import Services from "@/components/Services";
import Statement from "@/components/Statement";

export default function Home() {
  return (
    <>
      <Header logo={<Logo />} />
      <main id="main">
        <Hero />
        <Services />
        <Statement>Not a new you. Just a style that feels more like you.</Statement>
        <HowItWorks />
        <About />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
