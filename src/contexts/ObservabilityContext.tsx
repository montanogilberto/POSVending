// Reactive wrapper around the observability workflow lifecycle (src/utils/
// observability.ts). Lets components start/end a business workflow (e.g. client
// registration) so every backend call in between carries the same X-Workflow-Id.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  startWorkflow as startWorkflowUtil,
  endWorkflow as endWorkflowUtil,
  getCurrentWorkflowId,
} from '../utils/observability';

interface ObservabilityContextValue {
  currentWorkflowId: string | null;
  /** Begin a business workflow; returns the new workflowId. */
  startWorkflow: (name: string) => string;
  /** End the current workflow. */
  endWorkflow: () => void;
}

const ObservabilityContext = createContext<ObservabilityContextValue>({
  currentWorkflowId: null,
  startWorkflow: () => '',
  endWorkflow: () => undefined,
});

export const ObservabilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(() => getCurrentWorkflowId());

  const startWorkflow = useCallback((name: string) => {
    const id = startWorkflowUtil(name);
    setCurrentWorkflowId(id);
    return id;
  }, []);

  const endWorkflow = useCallback(() => {
    endWorkflowUtil();
    setCurrentWorkflowId(null);
  }, []);

  const value = useMemo(
    () => ({ currentWorkflowId, startWorkflow, endWorkflow }),
    [currentWorkflowId, startWorkflow, endWorkflow],
  );

  return <ObservabilityContext.Provider value={value}>{children}</ObservabilityContext.Provider>;
};

export const useObservability = (): ObservabilityContextValue => useContext(ObservabilityContext);
