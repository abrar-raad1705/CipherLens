import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  BeakerIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { UniversityLogoHero } from "@/components/home/UniversityLogoHero";

const experiments = [
  { number: "01", domain: "SPATIAL DOMAIN", title: "Image Processing", description: "Shape light, reveal edges, and explore how kernels transform an image.", details: "Convolution · Filters · Color", href: "/processing/convolution", icon: AdjustmentsHorizontalIcon },
  { number: "02", domain: "OPTICAL SECURITY", title: "Encryption", description: "Turn images into ciphers through phase encoding, transforms, and chaos.", details: "DRPE · Fourier · DCT · Arnold", href: "/encryption", icon: ShieldCheckIcon },
  { number: "03", domain: "QUANTITATIVE ANALYSIS", title: "Cryptanalysis", description: "Look beyond the image. Compare distributions, correlations, and security metrics.", details: "Entropy · NPCR · UACI · SSIM", href: "/analysis", icon: ChartBarIcon },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl pb-5 text-[#181818] dark:text-[#F2F2F0]">
      <section className="flex min-h-[calc(100vh-6.5rem)] flex-col justify-center py-6 sm:py-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          <div className="py-2 sm:py-5">
            <div className="mb-5 flex items-center gap-2 text-[11px] sm:text-xs font-mono font-medium uppercase tracking-[0.2em] text-[#2563EB] dark:text-[#7EA2FF]">
              <span className="h-px w-7 bg-current" /> Computational imaging laboratory
            </div>
            <h1 className="font-brand text-[40px] leading-[1.08] tracking-tight sm:text-[48px] lg:text-[54px] xl:text-[60px]">
              Every image has a<br />hidden{" "}
              <span className="text-[#2563EB] dark:text-[#7EA2FF]">signal.</span>
            </h1>
            <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-[#555550] dark:text-[#B8B8B2] sm:text-[17px] sm:leading-[1.7]">
              Discover what lies beneath the pixels. Experiment with spatial filters, optical encryption, and the mathematics that connects them.
            </p>
            <div className="mt-8 flex items-center">
              <a
                href="#workbenches"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[#2563EB] px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2563EB] dark:bg-[#5B8CFF] dark:text-[#0A0E1A] dark:hover:bg-[#467BFF] cursor-pointer"
              >
                <span className="absolute inset-y-0 -left-10 w-10 -skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-[16rem]" />
                <BeakerIcon className="relative h-5 w-5" />
                <span>Explore the lab</span>
                <ChevronDownIcon className="relative h-5 w-5 stroke-[2.25] transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none" />
              </a>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <UniversityLogoHero />
          </div>
        </div>
      </section>

      <section id="workbenches" className="scroll-mt-5 space-y-4">
        <div className="flex items-end justify-between gap-4 border-t border-[#E8E8E3] pt-5 dark:border-[#262626]">
          <div>
            <div className="text-[10px] font-mono font-medium uppercase tracking-[.18em] text-[#999993] dark:text-[#777770]">
              Experiment index
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#181818] dark:text-[#FFFFFF]">
              Choose your workbench
            </h2>
          </div>
          <Link
            href="/decryption"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:underline dark:text-[#7EA2FF]"
          >
            Have an encrypted image? Decrypt <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {experiments.map(({ number, domain, title, description, details, href, icon: Icon }) => (
            <Link
              key={number}
              href={href}
              className="group relative flex min-h-[260px] sm:min-h-[280px] flex-col justify-between rounded-2xl border border-[#E8E8E3] bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#2563EB]/40 hover:shadow-md sm:p-7 dark:border-[#262626] dark:bg-[#151515] dark:hover:border-[#5B8CFF]/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs sm:text-[12px] text-[#999993] dark:text-[#777770]">
                    <span className="font-semibold text-[#2563EB] dark:text-[#7EA2FF]">{number}</span>
                    <span>/</span>
                    <span className="uppercase tracking-wider">{domain}</span>
                  </div>
                  <ArrowUpRightIcon className="h-5 w-5 text-[#999993] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2563EB] dark:text-[#666660] dark:group-hover:text-[#7EA2FF]" />
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F1] text-[#2563EB] dark:bg-[#202020] dark:text-[#7EA2FF]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg sm:text-[19px] xl:text-[20px] font-semibold tracking-tight text-[#181818] transition-colors group-hover:text-[#2563EB] dark:text-[#F2F2F0] dark:group-hover:text-[#7EA2FF]">
                    {title}
                  </h3>
                </div>

                <p className="mt-3.5 text-sm sm:text-[14.5px] leading-relaxed text-[#555550] dark:text-[#A8A8A2]">
                  {description}
                </p>
              </div>

              <div className="mt-6 font-mono text-xs sm:text-[12px] text-[#888882] dark:text-[#7A7A75]">
                {details}
              </div>
            </Link>
          ))}
        </div>

        <div className="flex sm:hidden items-center justify-between pt-1 text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
          <Link href="/decryption" className="inline-flex items-center gap-1.5 font-medium text-[#2563EB] hover:underline dark:text-[#7EA2FF]">
            Have an encrypted image? Decrypt <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex items-center justify-between border-t border-[#E8E8E3] pt-4 text-[11px] text-[#999993] dark:border-[#262626] dark:text-[#777770]">
          <span></span>
          <span>Team AC/DC <span className="mx-2 text-[#D7D7D1] dark:text-[#383838]">/</span> BUET</span>
        </div>
      </section>
    </div>
  );
}
