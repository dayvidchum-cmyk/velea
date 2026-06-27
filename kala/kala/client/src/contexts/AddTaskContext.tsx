import React, { createContext, useContext, useState } from "react";
import type { TaskMode } from "../../../shared/types";

interface AddTaskContextType {
  quickAddMode: TaskMode | null;
  setQuickAddMode: (mode: TaskMode | null) => void;
}

const AddTaskContext = createContext<AddTaskContextType | undefined>(undefined);

export function AddTaskProvider({ children }: { children: React.ReactNode }) {
  const [quickAddMode, setQuickAddMode] = useState<TaskMode | null>(null);

  return (
    <AddTaskContext.Provider value={{ quickAddMode, setQuickAddMode }}>
      {children}
    </AddTaskContext.Provider>
  );
}

export function useAddTask() {
  const context = useContext(AddTaskContext);
  if (!context) {
    throw new Error("useAddTask must be used within AddTaskProvider");
  }
  return context;
}
