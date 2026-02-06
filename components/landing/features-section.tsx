import {
  Route,
  Eye,
  Shield,
  Clock,
  ImageIcon,
  Smartphone,
} from "lucide-react"

const FEATURES = [
  {
    icon: Eye,
    title: "Real-Time Visibility",
    description:
      "See which routes are active right now. No guessing, no static schedules -- just live movement data you can rely on.",
  },
  {
    icon: Route,
    title: "Route Intelligence",
    description:
      "Browse all routes with stages, origins, destinations, and live vehicle counts. Filter by county or search by name.",
  },
  {
    icon: ImageIcon,
    title: "Vehicle Gallery",
    description:
      "Recognize your ride before you board. Browse vehicle images, ratings, and route history to build confidence and familiarity.",
  },
  {
    icon: Clock,
    title: "Reduced Wait Time",
    description:
      "Know if a matatu is on the way before you walk to the stage. Make decisions based on what is actually moving.",
  },
  {
    icon: Shield,
    title: "Safety & Awareness",
    description:
      "Observe movement patterns and share journey visibility with loved ones. Peace of mind without intrusive communication.",
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    description:
      "Lightweight web app that works on any phone. No heavy downloads, no sign-up required to browse -- just open and go.",
  },
]

export function FeaturesSection() {
  return (
    <section className="border-t border-border bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Transport that you can see
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Radaa replaces uncertainty with observable, real-time data -- giving
            every commuter the visibility that was previously impossible.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
