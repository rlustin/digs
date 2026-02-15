import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data comes from SQLite — never stale from React Query's perspective.
      // We invalidate manually after sync batches.
      staleTime: Infinity,
    },
  },
});
