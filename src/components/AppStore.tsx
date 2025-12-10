import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Store,
  PlayCircle,
  Loader2,
  Coins,
  ShoppingBag,
  ArrowRight,
  Wand2,
} from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import {
  fetchStoreAnimations,
  initializeFirebaseIfReady,
  isFirebaseConfigured,
  loadUserProfile,
  type StoreAnimation,
} from "../utils/firebase";
import { FALLBACK_USER_PROFILE } from "../types/userProfile";

const animationToolkitUrl = "/Animation_Toolkit.html";

export const FALLBACK_FEATURED_ANIMATIONS: StoreAnimation[] = [
  {
    id: "nebula-drift",
    name: "Nebula Drift",
    description: "Cosmic hues sweeping across your scooter with a gentle breathing glow.",
    price: 320,
    gradient: "from-purple-500 via-fuchsia-500 to-cyan-400",
    toolkitAnimId: "nebulaDrift",
  },
  {
    id: "sunset-rush",
    name: "Sunset Rush",
    description: "Vibrant oranges melt into soft magentas to mimic a city sunset skyline.",
    price: 275,
    gradient: "from-orange-500 via-rose-500 to-purple-500",
    toolkitAnimId: "sunsetRush",
  },
  {
    id: "glacier-trace",
    name: "Glacier Trace",
    description: "Crystalline blues ripple outward with a frosted shimmer animation.",
    price: 290,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    toolkitAnimId: "glacierTrace",
  },
];

export const FALLBACK_USER_ANIMATIONS: StoreAnimation[] = [
  {
    id: "aurora-veil",
    name: "Aurora Veil",
    description: "Ribboned greens and violets cascading in smooth waves.",
    gradient: "from-emerald-500 via-lime-400 to-teal-500",
    toolkitAnimId: "auroraVeil",
  },
  {
    id: "starlight-chase",
    name: "Starlight Chase",
    description: "Speckled white sparks orbiting a midnight indigo core.",
    gradient: "from-slate-800 via-blue-600 to-slate-900",
    toolkitAnimId: "starlightChase",
  },
  {
    id: "animation-toolkit-slot",
    name: "Animation Toolkit slot",
    description: "Save your custom animation here from the Animation Toolkit.",
    gradient: "from-indigo-600 via-sky-500 to-emerald-500",
    toolkitAnimId: "animationToolkit",
  },
];

export type AnimationLibraryTab = "owned" | "store" | "designer";

interface AppStoreDialogContentProps {
  activeUserId: string;
  onAnimationSelect?: (animationId: string) => void;
  selectedAnimationId?: string | null;
  initialTab?: AnimationLibraryTab;
  onTabChange?: (tab: AnimationLibraryTab) => void;
  onClose?: () => void;
}

export function AppStoreDialogContent({
  activeUserId,
  onAnimationSelect,
  selectedAnimationId,
  initialTab = "owned",
  onTabChange,
  onClose,
}: AppStoreDialogContentProps) {
  const firebaseConfigured = isFirebaseConfigured();
  const fallbackTokenBalance = FALLBACK_USER_PROFILE.tokenBalance ?? 1200;
  const [availableAnimations, setAvailableAnimations] = useState<StoreAnimation[]>(
    FALLBACK_FEATURED_ANIMATIONS,
  );
  const [ownedAnimations, setOwnedAnimations] = useState<StoreAnimation[]>(
    FALLBACK_USER_ANIMATIONS,
  );
  const [tokenBalance, setTokenBalance] = useState<number>(fallbackTokenBalance);
  const [activeTabState, setActiveTabState] = useState<AnimationLibraryTab>(initialTab);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [usingFallbackData, setUsingFallbackData] = useState(!firebaseConfigured);

  useEffect(() => {
    setActiveTabState(initialTab);
  }, [initialTab]);

  useEffect(() => {
    onTabChange?.(activeTabState);
  }, [activeTabState, onTabChange]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const applyFallback = () => {
        if (!isMounted) {
          return;
        }

        setLoading(false);
        setOwnedAnimations(FALLBACK_USER_ANIMATIONS);
        setAvailableAnimations(FALLBACK_FEATURED_ANIMATIONS);
        setTokenBalance(fallbackTokenBalance);
        setUsingFallbackData(true);
      };

      if (!activeUserId) {
        applyFallback();
        return;
      }

      if (!firebaseConfigured) {
        applyFallback();
        return;
      }

      setLoading(true);
      const ready = await initializeFirebaseIfReady();

      if (!isMounted) {
        return;
      }

      if (!ready) {
        applyFallback();
        return;
      }

      try {
        const [animations, profile] = await Promise.all([
          fetchStoreAnimations(),
          loadUserProfile(activeUserId),
        ]);

        if (!isMounted) {
          return;
        }

        const catalog = animations.length > 0 ? animations : FALLBACK_FEATURED_ANIMATIONS;
        setAvailableAnimations(catalog);

        const ownedIds =
          profile?.ownedAnimations && profile.ownedAnimations.length > 0
            ? profile.ownedAnimations
            : profile?.userAnimations && profile.userAnimations.length > 0
              ? profile.userAnimations
              : FALLBACK_USER_PROFILE.ownedAnimations.length > 0
                ? FALLBACK_USER_PROFILE.ownedAnimations
                : FALLBACK_USER_PROFILE.userAnimations;

        const catalogLookup = new Map(catalog.map((animation) => [animation.id, animation]));
        const fallbackLookup = new Map(
          FALLBACK_USER_ANIMATIONS.map((animation) => [animation.id, animation]),
        );

        const resolvedLibrary = ownedIds
          .map((id) => catalogLookup.get(id) ?? fallbackLookup.get(id))
          .filter((animation): animation is StoreAnimation => Boolean(animation));

        setOwnedAnimations(
          resolvedLibrary.length > 0 ? resolvedLibrary : FALLBACK_USER_ANIMATIONS,
        );
        setTokenBalance(
          typeof profile?.tokenBalance === "number"
            ? profile.tokenBalance
            : fallbackTokenBalance,
        );
        setUsingFallbackData(animations.length === 0);
      } catch (error) {
        console.error("Failed to load app store data", error);
        toast.error("Unable to load animations from the cloud. Showing sample content.");
        applyFallback();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [activeUserId, firebaseConfigured, fallbackTokenBalance]);

  const defaultGradient = "from-purple-500 via-sky-500 to-indigo-500";
  const libraryAnimations = useMemo(() => ownedAnimations, [ownedAnimations]);
  const catalogAnimations = useMemo(() => availableAnimations, [availableAnimations]);
  const ownedAnimationIds = useMemo(
    () => new Set(libraryAnimations.map((animation) => animation.id)),
    [libraryAnimations],
  );

  const handlePlayAnimation = (animation: StoreAnimation) => {
    onAnimationSelect?.(animation.id);
    toast.success(`Queued ${animation.name} for playback`);
    onClose?.();
  };

  const handlePreviewAnimation = (animation: StoreAnimation) => {
    toast.info(`Preview "${animation.name}" coming soon.`);
  };

  const handlePurchaseAnimation = (animation: StoreAnimation) => {
    const price = animation.price ?? 0;
    const alreadyOwned = ownedAnimationIds.has(animation.id);

    if (alreadyOwned) {
      toast.info(`You already own ${animation.name}.`);
      setActiveTabState("owned");
      return;
    }

    if (price > tokenBalance) {
      const difference = price - tokenBalance;
      toast.error(
        `Not enough tokens to purchase ${animation.name}. You need ${difference.toLocaleString()} more.`,
      );
      return;
    }

    setTokenBalance((balance) => balance - price);
    setOwnedAnimations((previous) => {
      if (previous.some((item) => item.id === animation.id)) {
        return previous;
      }

      return [...previous, animation];
    });

    toast.success(`${animation.name} added to your library!`, {
      description:
        price > 0 ? `Spent ${price.toLocaleString()} scooter tokens.` : undefined,
    });

    onAnimationSelect?.(animation.id);
    setActiveTabState("owned");
  };

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Animation Library
        </DialogTitle>
        <DialogDescription>
          Manage the light shows linked to your rider profile and explore new effects from the catalog.
        </DialogDescription>
        {usingFallbackData && (
          <p className="text-xs text-muted-foreground">
            Showing demo animations. Connect to Firebase to sync your personal library.
          </p>
        )}
      </DialogHeader>

      <Tabs
        value={activeTabState}
        onValueChange={(value) => setActiveTabState(value as AnimationLibraryTab)}
        className="mt-4 flex flex-1 flex-col gap-4"
      >
      <TabsList
        className="
          flex
          space-x-2
          overflow-x-auto
          whitespace-nowrap
          no-scrollbar
          h-auto
        "
      >
        <TabsTrigger value="owned" className="flex items-center gap-2 px-3 py-2">
          <CheckCircle2 className="h-4 w-4" />
          Owned
        </TabsTrigger>
      
        <TabsTrigger value="store" className="flex items-center gap-2 px-3 py-2">
          <Sparkles className="h-4 w-4" />
          Store
        </TabsTrigger>
      
        <TabsTrigger value="designer" className="flex items-center gap-2 px-3 py-2">
          <Wand2 className="h-4 w-4" />
          Designer
        </TabsTrigger>
      </TabsList>


        <TabsContent value="owned" className="mt-0 flex-1">
          <ScrollArea className="max-h-[55vh] pr-4">
            <div className="space-y-6 pb-4">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-lg font-semibold">My animation library</h3>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600">
                    {libraryAnimations.length} owned
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  These are the shows currently synced to your rider profile. Choose one to play instantly on your scooter.
                </p>
                <div className="space-y-4">
                  {libraryAnimations.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                      No owned animations yet. Visit the store to unlock your first premium theme.
                    </div>
                  ) : (
                    libraryAnimations.map((animation) => {
                      const isActive = selectedAnimationId === animation.id;
                      return (
                        <article
                          key={animation.id}
                          className="rounded-2xl border border-border/60 bg-muted/50 p-4 backdrop-blur"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row">
                            <div
                              className={`relative h-20 w-full overflow-y-auto rounded-xl bg-gradient-to-br ${
                                animation.gradient ?? defaultGradient
                              } sm:w-32`}
                            >
                              <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.5),transparent),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.35),transparent)]" />
                            </div>
                            <div className="flex flex-1 flex-col gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold">{animation.name}</h4>
                                {isActive && (
                                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{animation.description}</p>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  Synced to rider profile
                                </span>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                  <Button
                                    size="sm"
                                    className="gap-2"
                                    variant={isActive ? "secondary" : "default"}
                                    onClick={() => handlePlayAnimation(animation)}
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                    {isActive ? "Now playing" : "Play on scooter"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>

              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Need a fresh vibe?</h4>
                    <p className="text-sm text-muted-foreground">
                      Spend scooter tokens to unlock premium animations inspired by mobile theme stores.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setActiveTabState("store")}
                  >
                    <Sparkles className="h-4 w-4" />
                    Browse store
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="store" className="mt-0 flex-1">
          <ScrollArea className="max-h-[55vh] pr-4">
            <div className="space-y-6 pb-4">
              <section className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Coins className="h-4 w-4 text-amber-500" />
                        Scooter tokens
                      </div>
                      <p className="text-3xl font-semibold">
                        {tokenBalance.toLocaleString()}
                        <span className="ml-2 text-base font-normal text-muted-foreground">tokens</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        Buy tokens
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Redeem code
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Unlock premium lighting effects instantly with your scooter token balance.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-lg font-semibold">Animation store</h3>
                  <Badge variant="secondary">Catalog</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Purchase new light shows just like browsing a mobile theme store.
                </p>
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading animations...
                    </div>
                  ) : catalogAnimations.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                      No catalog animations available right now.
                    </div>
                  ) : (
                    catalogAnimations.map((animation) => {
                      const price = animation.price ?? 0;
                      const alreadyOwned = ownedAnimationIds.has(animation.id);

                      return (
                        <article
                          key={animation.id}
                          className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur transition hover:border-primary/40"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row">
                            <div
                              className={`relative h-24 w-full overflow-y-auto rounded-xl bg-gradient-to-br ${
                                animation.gradient ?? defaultGradient
                              } sm:w-40`}
                            >
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.55),transparent)] opacity-70" />
                              <div className="absolute inset-0 animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(255,255,255,0.15)_0deg,rgba(255,255,255,0.5)_120deg,rgba(255,255,255,0.05)_240deg,rgba(255,255,255,0.15)_360deg)]" />
                            </div>
                            <div className="flex flex-1 flex-col gap-3">
                              <div>
                                <h4 className="text-base font-semibold">{animation.name}</h4>
                                <p className="text-sm text-muted-foreground">{animation.description}</p>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  <Coins className="h-3 w-3 text-amber-500" />
                                  {price > 0
                                    ? `${price.toLocaleString()} tokens`
                                    : "Included with membership"}
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => handlePreviewAnimation(animation)}
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="gap-2"
                                    variant={alreadyOwned ? "secondary" : "default"}
                                    disabled={alreadyOwned}
                                    onClick={() => handlePurchaseAnimation(animation)}
                                  >
                                    {alreadyOwned ? (
                                      <>
                                        <CheckCircle2 className="h-4 w-4" /> Owned
                                      </>
                                    ) : price === 0 ? (
                                      <>
                                        <Sparkles className="h-4 w-4" /> Add to library
                                      </>
                                    ) : (
                                      <>
                                        <ShoppingBag className="h-4 w-4" /> Buy for {price.toLocaleString()}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="designer" className="mt-0 flex-1">
          <ScrollArea className="h-[85vh] pr-4">
            <div className="mt-4 h-[85vh] overflow-hidden rounded-xl border shadow-inner">
                <iframe
                  title="Animation designer toolkit"
                  src={animationToolkitUrl}
                  className="h-full w-full min-h-[600px] border-0 bg-background"
                  loading="lazy"
                />
            </div>
          </ScrollArea>
        </TabsContent>

       
      </Tabs>
    </DialogContent>
  );
}

export default AppStoreDialogContent;
