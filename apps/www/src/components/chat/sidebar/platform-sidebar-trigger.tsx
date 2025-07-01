"use client"

import { usePlatformShortcuts } from "@/hooks/use-platform-shortcuts"
import { SidebarTrigger } from "@lightfast/ui/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lightfast/ui/components/ui/tooltip"

export function PlatformSidebarTrigger() {
  const { getShortcut } = usePlatformShortcuts()
  const toggleShortcut = getShortcut("toggleSidebar")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SidebarTrigger className="h-8 w-8" />
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-xs">Toggle sidebar ({toggleShortcut.display})</p>
      </TooltipContent>
    </Tooltip>
  )
}
