"use client"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useGuestChat } from "@/providers/guest-chat-provider"
import { LogIn, Plus, User } from "lucide-react"
import Link from "next/link"
import { ActiveMenuItem } from "./ActiveMenuItem"

// Lightfast logo component
function LightfastLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="104"
      height="70"
      viewBox="0 0 104 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lightfast"
      {...props}
    >
      <title>Lightfast</title>
      <path
        d="M15.3354 57.3195H47.1597V69.7863H0.543457V0.632019H15.3354V57.3195Z"
        fill="currentColor"
      />
      <path
        d="M79.6831 69.7863H65.2798L89.0532 0.658386H103.457L79.6831 69.7863Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function GuestSidebar() {
  const guestChat = useGuestChat()

  if (!guestChat) return null

  const { threads, shouldShowUpgradePrompt } = guestChat

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <LightfastLogo className="w-6 h-6 text-foreground" />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <ActiveMenuItem href="/chat" threadId="new">
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </ActiveMenuItem>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {threads.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {threads.map((thread) => (
                  <SidebarMenuItem key={thread.id}>
                    <ActiveMenuItem
                      href={`/chat/${thread.id}`}
                      threadId={thread.id as any}
                    >
                      <span className="truncate">{thread.title}</span>
                    </ActiveMenuItem>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {shouldShowUpgradePrompt && (
          <div className="p-4 mx-2 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              You've sent 10+ messages! Sign in to save unlimited chats and get
              AI responses.
            </p>
            <Link href="/signin" className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            disabled
          >
            <User className="w-4 h-4" />
            <span className="text-muted-foreground">Guest User</span>
          </Button>
          <Link href="/signin" className="block mt-2">
            <Button variant="outline" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
