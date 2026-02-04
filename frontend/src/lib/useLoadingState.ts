import { useState } from 'react';

/**
 * Custom hook untuk manage loading state dengan error handling
 */
export function useLoadingState(initialLoading = false) {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const startLoading = () => {
    setIsLoading(true);
    setError(null);
  };

  const stopLoading = () => {
    setIsLoading(false);
  };

  const setLoadingError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const resetError = () => {
    setError(null);
  };

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    resetError,
  };
}

/**
 * Custom hook untuk action loading (tombol)
 */
export function useActionLoading() {
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const startAction = (actionId: string) => {
    setLoadingActions(prev => new Set(prev).add(actionId));
  };

  const stopAction = (actionId: string) => {
    setLoadingActions(prev => {
      const next = new Set(prev);
      next.delete(actionId);
      return next;
    });
  };

  const isActionLoading = (actionId: string) => {
    return loadingActions.has(actionId);
  };

  return {
    startAction,
    stopAction,
    isActionLoading,
  };
}
