import { Plus } from "lucide-react";

interface FloatingAddButtonProps {
  onClick: () => void;
  label?: string;
}

export default function FloatingAddButton({ onClick, label = "Add Task" }: FloatingAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 z-40 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
      style={{
        width: "56px",
        height: "56px",
        bottom: "calc(72px + 1rem + env(safe-area-inset-bottom, 0px))",
        // Same color as the greeting font (David) — the day-washed heading ink.
        background: "var(--fab-bg, var(--heading-ink))",
        color: "#FBF7ED",
        border: "none",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
        margin: "0",
        cursor: "pointer",
      }}
      title={label}
    >
      <Plus size={24} strokeWidth={2.5} style={{ margin: "0", padding: "0" }} />
    </button>
  );
}
