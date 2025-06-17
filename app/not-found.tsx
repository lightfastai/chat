import { Button } from "@/components/ui/button"
import { FileQuestion, Home, Search } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-blue-500/10 p-3">
          <FileQuestion className="h-6 w-6 text-blue-500" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>

        <p className="text-sm text-muted-foreground">
          Sorry, we couldn't find the page you're looking for. It might have
          been moved or deleted.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/docs">
              <Search className="mr-2 h-4 w-4" />
              Search docs
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
