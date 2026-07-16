import VeleaLoader from "@/components/VeleaLoader";

/**
 * Loading signal shown while the narrative engine is generating prose. THE BEACH-BALL
 * LAW (v546, re-broken and re-swept v587): every loading state is the sweeping
 * VeleaMark — never a bare spinner or words alone. `color` kept for API compatibility.
 */
export default function ProseLoading({
  color,
  label = "Reading your chart…",
}: { color?: string; label?: string }) {
  void color;
  return <VeleaLoader size={26} label={label} />;
}
