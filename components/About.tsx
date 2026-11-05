import AboutContent from "./AboutContent";

// The home page keeps its own About section, unchanged, alongside the standalone /about page
// the navbar links to (app/about/page.tsx). Both render the same content.
export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="py-24 lg:py-32">
      <AboutContent />
    </section>
  );
}
