import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Skeleton className="h-8 w-32" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <div className="flex flex-1">
        {/* Sidebar Skeleton */}
        <aside className="hidden md:flex flex-col w-64 border-r p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <div className="mt-auto">
            <Skeleton className="h-10 w-full" />
          </div>
        </aside>

        {/* Content Area Skeleton */}
        <main className="flex-1 p-6 space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </main>
      </div>
    </div>
  );
}
