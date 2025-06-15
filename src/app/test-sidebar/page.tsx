"use client"

import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { useState } from "react"

const testTitles = [
  "Short title",
  "This is a medium length title that might wrap",
  "This is an extremely long title that will definitely need to be truncated because it's way too long to fit in the sidebar without causing layout issues or overflow problems",
  "Another really really really really really really really really really really long title with lots of repetition",
  "🔥 Title with emojis 🚀 and special characters & symbols! @#$%^&*()",
  "Title with numbers 123456789 and more text after that continues on and on",
]

export default function TestSidebarPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex h-screen">
      <SidebarProvider defaultOpen={true}>
        <Sidebar variant="inset" collapsible="none" className="w-64">
          <SidebarHeader className="p-4">
            <h2 className="text-lg font-semibold">Test Sidebar</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {testTitles.map((title, index) => (
                    <SidebarMenuItem key={index}>
                      <SidebarMenuButton
                        onClick={() => setSelectedId(`item-${index}`)}
                        isActive={selectedId === `item-${index}`}
                        className="w-full"
                      >
                        <span className="truncate text-sm font-medium flex-1 min-w-0">
                          {title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <h3 className="px-3 text-xs font-medium text-muted-foreground mb-2">
                Testing overflow behavior
              </h3>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="w-full">
                      <span className="text-sm font-medium flex-1 min-w-0">
                        Without truncate class - This is an extremely long title that will show what happens without proper truncation
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="w-full">
                      <span className="truncate text-sm font-medium flex-1 min-w-0 bg-red-100 dark:bg-red-900/20">
                        With truncate class (highlighted) - This is an extremely long title that should be properly truncated with ellipsis
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-bold mb-4">Sidebar Long Title Test</h1>
          <p>Click on items in the sidebar to test selection and overflow behavior.</p>
          <p className="mt-2">Selected: {selectedId || "None"}</p>
          
          <div className="mt-8 space-y-2">
            <h2 className="text-lg font-semibold">Test Cases:</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Short titles should display normally</li>
              <li>Long titles should truncate with ellipsis (...)</li>
              <li>Sidebar should maintain fixed width (w-64 = 16rem)</li>
              <li>No horizontal scrolling should occur</li>
              <li>Pin buttons (if present) should not be pushed off screen</li>
            </ul>
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}