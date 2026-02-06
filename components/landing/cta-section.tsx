import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="border-t border-border py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 px-6 py-16 text-center md:px-16">
          <h2 className="text-balance font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Ready to see your city move?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Whether you{"'"}re a daily commuter or a vehicle operator, Radaa
            gives you the visibility you need. Start exploring for free.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link href="/routes">
                Explore Routes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-transparent px-8"
              asChild
            >
              <Link href="/sign-up">Register as Operator</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
