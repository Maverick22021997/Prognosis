import Image from "next/image";

import { supportProject } from "@/lib/support-project";

type SupportProjectCardProps = {
  compact?: boolean;
};

export default function SupportProjectCard({
  compact = false,
}: SupportProjectCardProps) {
  if (compact) {
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-5">
        <div className="flex items-center gap-4">
          <a
            href={supportProject.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-2xl border border-white/[0.09] bg-white p-2 transition-transform hover:-translate-y-0.5"
            aria-label="Открыть страницу поддержки prognosis.io"
          >
            <Image
  src={supportProject.qrImage}
  alt="QR-код для поддержки prognosis.io"
  width={84}
  height={84}
  className="block"
  priority={false}
/>
          </a>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {supportProject.title}
            </p>

            <p className="mt-1 text-xs leading-5 text-white/45">
              {supportProject.description}
            </p>

            <a
              href={supportProject.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs font-medium text-[#9ba6ff] transition-colors hover:text-[#bbc2ff]"
            >
              Перейти к поддержке →
            </a>
          </div>
        </div>

        <p className="mt-4 border-t border-white/[0.07] pt-4 text-[11px] leading-5 text-white/30">
          {supportProject.disclaimer}
        </p>
      </section>
    );
  }

  return (
    <section className="w-[168px] rounded-3xl border border-white/[0.09] bg-[#11151d]/95 p-4 text-center shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <p className="text-xs font-semibold leading-5 text-white/80">
        {supportProject.title}
      </p>

      <a
        href={supportProject.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto mt-4 block w-fit rounded-2xl border border-white/[0.1] bg-white p-2 transition-transform hover:-translate-y-0.5"
        aria-label="Открыть страницу поддержки prognosis.io"
      >
        <Image
          src={supportProject.qrImage}
          alt="QR-код для поддержки prognosis.io"
          width={120}
          height={120}
          className="h-[120px] w-[120px]"
        />
      </a>

      <p className="mt-4 text-[11px] leading-5 text-white/40">
        {supportProject.description}
      </p>

      <a
        href={supportProject.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex text-xs font-medium text-[#9ba6ff] transition-colors hover:text-[#bbc2ff]"
      >
        Открыть ссылку →
      </a>

      <p className="mt-4 border-t border-white/[0.07] pt-4 text-[10px] leading-4 text-white/25">
        {supportProject.disclaimer}
      </p>
    </section>
  );
}