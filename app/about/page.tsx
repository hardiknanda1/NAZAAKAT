import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "About | NAZAAKAT",
  description: "Because style should feel like you. Learn how NAZAAKAT approaches personal fashion consulting.",
};

export default function AboutPage() {
  return (
    <>
      <Header logo={<Logo />} />
      <main id="main">
        <div className="pt-28 pb-24 sm:pt-36 lg:pt-40 lg:pb-32">
          <AboutContent headingLevel="h1" />
        </div>
      </main>
      <Footer />
    </>
  );
}
