"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface BranchNavigationProps {
  currentBranch: number
  totalBranches: number
  onNavigate: (branchSequence: number) => void
  className?: string
}

export function BranchNavigation({
  currentBranch,
  totalBranches,
  onNavigate,
  className = "",
}: BranchNavigationProps) {
  if (totalBranches <= 1) return null

  const canGoPrevious = currentBranch > 0
  const canGoNext = currentBranch < totalBranches - 1

  return (
    <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={() => onNavigate(currentBranch - 1)}
        disabled={!canGoPrevious}
        aria-label="Previous branch"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      <span className="px-1 font-mono">
        {currentBranch + 1}/{totalBranches}
      </span>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={() => onNavigate(currentBranch + 1)}
        disabled={!canGoNext}
        aria-label="Next branch"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  )
}