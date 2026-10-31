import SiteNav from "@/components/landing/SiteNav";
import Footer from "@/components/landing/Footer";

/* Every content page: header, a readable column, footer. */
export default function PageShell({ eyebrow, title, sub, wide = false, children }: {
  eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <main id="top" className="min-h-svh">
      <SiteNav />
      <div className={`mx-auto px-6 pb-24 pt-[clamp(40px,8vh,88px)] md:px-10 ${wide ? "max-w-[1120px]" : "max-w-[820px]"}`}>
        {eyebrow && <p className="text-[15px] font-medium text-pumpkin">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-[clamp(38px,5.4vw,68px)] font-extrabold leading-[1.04] tracking-[-0.015em]">{title}</h1>
        {sub && <p className="mt-4 max-w-[620px] text-[clamp(16px,1.3vw,18.5px)] leading-relaxed text-ink-2">{sub}</p>}
        <div className="mt-12">{children}</div>
      </div>
      <Footer />
    </main>
  );
}
