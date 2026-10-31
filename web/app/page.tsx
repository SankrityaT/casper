import Hero from "@/components/Hero";
import ProductDemo from "@/components/ProductDemo";
import Verbs from "@/components/landing/Verbs";
import AnyAgent from "@/components/landing/AnyAgent";
import Closing from "@/components/landing/Closing";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main id="top">
      <Hero />
      <ProductDemo />
      <Verbs />
      <AnyAgent />
      <Closing />
      <Footer />
    </main>
  );
}
