import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster
        position="top-center"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
