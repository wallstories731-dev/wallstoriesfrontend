import { InstagramIcon, WhatsAppIcon, UpiIcon } from "./icons"

const steps = [
  {
    num: "01",
    Icon: ({ className }: { className?: string }) => (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h.01M14 20h.01M20 14h.01M20 20h.01" strokeWidth={2} />
      </svg>
    ),
    title: "Pick your prints",
    body: "Tap any poster you love. Add sizes and quantities right from the catalogue — no account needed.",
  },
  {
    num: "02",
    Icon: ({ className }: { className?: string }) => (
      <span className={`flex items-center gap-1.5 ${className ?? ""}`}>
        <InstagramIcon className="h-5 w-5" />
        <span className="text-[11px] font-semibold tracking-widest text-ink-soft">or</span>
        <WhatsAppIcon className="h-5 w-5" />
      </span>
    ),
    title: "Send your list",
    body: "Send your prepared list on WhatsApp, or copy it into Instagram. Review the message in chat before sending; attach artwork separately if needed.",
  },
  {
    num: "03",
    Icon: ({ className }: { className?: string }) => <UpiIcon className={className} />,
    title: "Confirm & pay by UPI",
    body: "I'll confirm sizes, share a UPI QR, and dispatch within 1–2 days. Pan-India delivery in 4–6 days.",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-to-order" className="border-b border-hairline bg-ground-soft/50 py-10 sm:py-14">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <p className="mb-8 text-[11px] tracking-[0.28em] text-magenta uppercase">How it works</p>

        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative flex gap-4 sm:flex-col sm:gap-4">
              {/* connector line between steps on desktop */}
              {i < steps.length - 1 && (
                <div className="absolute hidden sm:block top-[22px] left-[calc(50%+32px)] right-[-50%] h-px bg-hairline" />
              )}

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-hairline bg-ground text-ink sm:mx-0">
                <step.Icon className="h-5 w-5 text-magenta" />
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline gap-2 sm:flex-col sm:gap-1">
                  <span className="text-[10px] font-semibold tracking-[0.22em] text-ink-soft/60 uppercase">{step.num}</span>
                  <h3 className="font-display font-semibold tracking-[-0.01em] text-[16px] text-ink sm:text-[18px]">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft sm:mt-2 sm:text-[14px]">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
