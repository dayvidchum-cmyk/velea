// Moved to shared/task-kind.ts so the SERVER can rank by kind too (the handshake
// reaches "Aligned for today"). This file re-exports to keep client imports stable.
export { kindOfTask, KIND_ORDER, KIND_WORD, type TaskKind } from "../../../shared/task-kind";
