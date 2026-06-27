import type { TaskMode, PanchangMode } from "../../../shared/types";

const TAG_CLASSES: Record<string, string> = {
  Restraint: "tag-restraint",
  Build: "tag-build",
  Selective: "tag-selective",
  Action: "tag-action",
  Flex: "tag-flex",
  ACTION: "tag-action",
  BUILD: "tag-build",
  RESTRAINT: "tag-restraint",
  FLEX: "tag-flex",
  "SELECTIVE ACTION": "tag-selective",
};

const DISPLAY_LABELS: Record<string, string> = {
  Restraint: "Restraint",
  Build: "Build",
  Selective: "Selective",
  Action: "Action",
  Flex: "Flex",
  ACTION: "Action",
  BUILD: "Build",
  RESTRAINT: "Restraint",
  FLEX: "Flex",
  "SELECTIVE ACTION": "Selective",
};

interface ModeTagProps {
  mode: TaskMode | PanchangMode | string;
  className?: string;
}

export default function ModeTag({ mode, className = "" }: ModeTagProps) {
  const cls = TAG_CLASSES[mode] ?? "tag-build";
  const label = DISPLAY_LABELS[mode] ?? mode;
  return (
    <span className={`${cls} ${className}`}>{label}</span>
  );
}
