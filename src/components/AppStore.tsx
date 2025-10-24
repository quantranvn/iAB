import { Coins, Sparkles, CheckCircle2, Store } from "lucide-react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

const featuredAnimations = [
  {
    id: "nebula-drift",
    name: "Nebula Drift",
    description: "Cosmic hues sweeping across your scooter with a gentle breathing glow.",
    price: 320,
    gradient: "from-purple-500 via-fuchsia-500 to-cyan-400",
  },
  {
    id: "sunset-rush",
    name: "Sunset Rush",
    description: "Vibrant oranges melt into soft magentas to mimic a city sunset skyline.",
    price: 275,
    gradient: "from-orange-500 via-rose-500 to-purple-500",
  },
  {
    id: "glacier-trace",
    name: "Glacier Trace",
    description: "Crystalline blues ripple outward with a frosted shimmer animation.",
    price: 290,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
  },
];

const ownedAnimations = [
  {
    id: "aurora-veil",
    name: "Aurora Veil",
    description: "Ribboned greens and violets cascading in smooth waves.",
    gradient: "from-emerald-500 via-lime-400 to-teal-500",
  },
  {
    id: "starlight-chase",
    name: "Starlight Chase",
    description: "Speckled white sparks orbiting a midnight indigo core.",
    gradient: "from-slate-800 via-blue-600 to-slate-900",
  },
];

export function AppStoreDialogContent() {
  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Scooter AppStore
        </DialogTitle>
        <DialogDescription>
          Browse premium light animations, preview pricing, and review the effects you've already purchased.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-10 pb-4">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">Featured Animations</h3>
              <Badge variant="secondary">Premium</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Unlock new looks for your scooter with animated lighting sequences priced in ride tokens.
            </p>
            <div className="space-y-4">
              {featuredAnimations.map((animation) => (
                <article
                  key={animation.id}
                  className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur transition hover:border-primary/40"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className={`relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-br ${animation.gradient} sm:w-40`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.55),transparent)] opacity-70" />
                      <div className="absolute inset-0 animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(255,255,255,0.15)_0deg,rgba(255,255,255,0.5)_120deg,rgba(255,255,255,0.05)_240deg,rgba(255,255,255,0.15)_360deg)]" />
                    </div>
                    <div className="flex flex-1 flex-col gap-3">
                      <div>
                        <h4 className="text-base font-semibold">{animation.name}</h4>
                        <p className="text-sm text-muted-foreground">{animation.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                          <Coins className="h-4 w-4" />
                          {animation.price} Tokens
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" className="gap-2">
                            Preview
                          </Button>
                          <Button size="sm" className="gap-2">
                            Purchase
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h3 className="text-lg font-semibold">Your Purchased Animations</h3>
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-500">
                Paid
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              These effects are ready to sync to your scooter. Tokens have already been deducted.
            </p>
            <div className="space-y-4">
              {ownedAnimations.map((animation) => (
                <article
                  key={animation.id}
                  className="rounded-2xl border border-border/60 bg-muted/60 p-4 backdrop-blur"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className={`relative h-20 w-full overflow-hidden rounded-xl bg-gradient-to-br ${animation.gradient} sm:w-32`}>
                      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.55),transparent),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.35),transparent)]" />
                    </div>
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold">{animation.name}</h4>
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-500">
                          Paid
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{animation.description}</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Owned — no additional tokens required
                        </span>
                        <Button size="sm" variant="outline" className="gap-2">
                          Apply to scooter
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </DialogContent>
  );
}

export default AppStoreDialogContent;
