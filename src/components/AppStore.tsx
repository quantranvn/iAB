import { useEffect, useMemo, useState } from "react";
import { Sparkles, CheckCircle2, Store, PlayCircle, Loader2 } from "lucide-react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import {
  fetchStoreAnimations,
  initializeFirebaseIfReady,
  isFirebaseConfigured,
  loadUserProfile,
  type StoreAnimation,
} from "../utils/firebase";
import { FALLBACK_USER_PROFILE } from "../types/userProfile";

export const FALLBACK_FEATURED_ANIMATIONS: StoreAnimation[] = [
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

export const FALLBACK_USER_ANIMATIONS: StoreAnimation[] = [
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

interface AppStoreDialogContentProps {
  activeUserId: string;
  onAnimationSelect?: (animationId: string) => void;
  selectedAnimationId?: string | null;
}

export function AppStoreDialogContent({
  activeUserId,
  onAnimationSelect,
  selectedAnimationId,
}: AppStoreDialogContentProps) {
  const firebaseConfigured = isFirebaseConfigured();
  const [availableAnimations, setAvailableAnimations] = useState<StoreAnimation[]>(
    FALLBACK_FEATURED_ANIMATIONS
  );
  const [userAnimations, setUserAnimations] = useState<StoreAnimation[]>(
    FALLBACK_USER_ANIMATIONS
  );
  const [loading, setLoading] = useState(firebaseConfigured);
  const [usingFallbackData, setUsingFallbackData] = useState(!firebaseConfigured);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const applyFallback = () => {
        if (!isMounted) {
          return;
        }

        setLoading(false);
        setUserAnimations(FALLBACK_USER_ANIMATIONS);
        setAvailableAnimations(FALLBACK_FEATURED_ANIMATIONS);
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

        const preferredIds =
          profile?.userAnimations && profile.userAnimations.length > 0
            ? profile.userAnimations
            : FALLBACK_USER_PROFILE.userAnimations;

        const catalogLookup = new Map(catalog.map((animation) => [animation.id, animation]));
        const fallbackLookup = new Map(
          FALLBACK_USER_ANIMATIONS.map((animation) => [animation.id, animation])
        );

        const resolvedLibrary = preferredIds
          .map((id) => catalogLookup.get(id) ?? fallbackLookup.get(id))
          .filter((animation): animation is StoreAnimation => Boolean(animation));

        setUserAnimations(
          resolvedLibrary.length > 0 ? resolvedLibrary : FALLBACK_USER_ANIMATIONS
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
  }, [activeUserId, firebaseConfigured]);

  const defaultGradient = "from-purple-500 via-sky-500 to-indigo-500";
  const libraryAnimations = useMemo(() => userAnimations, [userAnimations]);
  const catalogAnimations = useMemo(() => availableAnimations, [availableAnimations]);

  const handlePlayAnimation = (animation: StoreAnimation) => {
    onAnimationSelect?.(animation.id);
    toast.success(`Queued ${animation.name} for playback`);
  };

  const handlePreviewAnimation = (animation: StoreAnimation) => {
    toast.info(`Preview "${animation.name}" coming soon.`);
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

      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-10 pb-4">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h3 className="text-lg font-semibold">My Animation Library</h3>
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600">
                {libraryAnimations.length} saved
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Animations synced from your Firestore profile. Choose one to play instantly on your scooter.
            </p>
            <div className="space-y-4">
              {libraryAnimations.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  No custom animations saved yet. Use the profile dialog to add your favorites.
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
                          className={`relative h-20 w-full overflow-hidden rounded-xl bg-gradient-to-br ${
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
                              Synced from user profile
                            </span>
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
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">Discover Animations</h3>
              <Badge variant="secondary">Catalog</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Explore additional effects available in the shared animation catalog.
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
                catalogAnimations.map((animation) => (
                  <article
                    key={animation.id}
                    className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur transition hover:border-primary/40"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div
                        className={`relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-br ${
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
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Shared catalog entry
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handlePreviewAnimation(animation)}
                          >
                            Preview
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
    </DialogContent>
  );
}

export default AppStoreDialogContent;
