"use client"

import {
  Authenticated,
  SignInButton,
  SignOutButton,
  Unauthenticated,
  UserDropdown,
} from "@/components/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/hooks/useAuth"
import { useMutation, useQuery } from "convex/react"
import {
  ChevronRight,
  LogOut,
  MessageCircle,
  Plus,
  Send,
  Settings,
  User,
  Zap,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc, Id } from "../../convex/_generated/dataModel"

type Message = Doc<"messages">

// Header component that works for both authenticated and unauthenticated states
function Header() {
  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">AI Chat</span>
        </div>
        <SignOutButton />

        <Unauthenticated>
          <SignInButton />
        </Unauthenticated>

        <Authenticated>
          <UserDropdown />
        </Authenticated>
      </div>
    </header>
  )
}

// Landing page component for unauthenticated users
function LandingPage() {
  const { signIn } = useAuth()
  const [message, setMessage] = useState("")

  const handleSubmit = () => {
    // Trigger sign in when user tries to send a message
    void signIn("github")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 text-sm text-muted-foreground mb-6">
              <Zap className="w-4 h-4" />
              Powered by GPT-4o-mini • Real-time streaming
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Chat with AI
              <span className="block text-muted-foreground">in real-time</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Experience the future of AI conversation with real-time streaming
              responses, persistent chat history, and a beautiful interface.
            </p>
          </div>

          {/* Chat input preview */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything... (Sign in to start chatting)"
                className="min-h-[120px] resize-none pr-16 text-lg border-2 transition-colors focus:border-primary"
                rows={4}
              />
              <Button
                onClick={handleSubmit}
                size="lg"
                className="absolute right-3 bottom-3 h-12 w-12 p-0 rounded-full"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Press{" "}
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Enter</kbd>{" "}
                to send,
                <kbd className="px-2 py-1 text-xs bg-muted rounded">
                  Shift + Enter
                </kbd>{" "}
                for new line
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20 grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Real-time Streaming</h3>
                <p className="text-sm text-muted-foreground">
                  Watch AI responses appear character by character as they're
                  generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Persistent History</h3>
                <p className="text-sm text-muted-foreground">
                  All your conversations are saved and organized by topic
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your conversations are private and secured with GitHub
                  authentication
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// Main chat interface for authenticated users
function ChatInterface() {
  const [message, setMessage] = useState("")
  const [currentThreadId, setCurrentThreadId] = useState<Id<"threads"> | null>(
    null,
  )
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuth()

  // Get threads for user
  const threads = useQuery(api.threads.list)
  const createThread = useMutation(api.threads.create)

  // Get messages for current thread
  const messages = useQuery(
    api.messages.list,
    currentThreadId ? { threadId: currentThreadId } : "skip",
  )
  const sendMessage = useMutation(api.messages.send)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Auto-select first thread when threads are loaded
  useEffect(() => {
    if (threads && threads.length > 0 && !currentThreadId) {
      setCurrentThreadId(threads[0]._id)
    }
  }, [threads, currentThreadId])

  const handleNewChat = async () => {
    try {
      const newThreadId = await createThread({
        title: "New Chat",
      })
      setCurrentThreadId(newThreadId)
    } catch (error) {
      console.error("Error creating new thread:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      // Create a new thread if none is selected
      if (!currentThreadId) {
        const newThreadId = await createThread({
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        })
        setCurrentThreadId(newThreadId)

        await sendMessage({
          threadId: newThreadId,
          body: message,
        })
      } else {
        await sendMessage({
          threadId: currentThreadId,
          body: message,
        })
      }
      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        <Header />

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/40 flex flex-col">
            {/* New Chat Button */}
            <div className="p-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleNewChat}
                  >
                    <Plus className="w-4 h-4" />
                    New chat
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start a new conversation</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            {/* Chat History */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-2 py-2">
                {threads?.map((thread) => (
                  <button
                    key={thread._id}
                    type="button"
                    className={`w-full p-2 rounded-md hover:bg-accent cursor-pointer group text-left ${
                      currentThreadId === thread._id ? "bg-accent" : ""
                    }`}
                    onClick={() => setCurrentThreadId(thread._id)}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{thread.title}</span>
                      {currentThreadId === thread._id && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(thread.lastMessageAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
                {(!threads || threads.length === 0) && (
                  <div className="text-center text-muted-foreground py-4">
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs">Start a new chat to begin</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* User Profile Section */}
            <Separator />
            <div className="p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 px-2 py-1.5 h-auto hover:bg-accent"
                  >
                    <Avatar className="h-8 w-8">
                      {user?.image && (
                        <AvatarImage src={user.image} alt={user.name || ""} />
                      )}
                      <AvatarFallback className="bg-primary/10">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm flex-1 min-w-0">
                      <span className="font-medium truncate w-full text-left">
                        {user?.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full text-left">
                        {user?.email || ""}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || ""}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Profile settings</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Header */}
            <div className="border-b p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">
                  {currentThreadId && threads
                    ? threads.find((t) => t._id === currentThreadId)?.title ||
                      "AI Chat"
                    : "AI Chat"}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Streaming</Badge>
                  <Badge variant="outline">GPT-4o-mini</Badge>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
              <div className="p-4">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {!messages?.length && (
                    <div className="text-center text-muted-foreground py-12">
                      <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        Welcome to AI Chat
                      </h3>
                      <p>
                        Start a conversation with our AI assistant. Messages
                        stream in real-time!
                      </p>
                    </div>
                  )}

                  {messages
                    ?.slice()
                    .reverse()
                    .map((msg) => (
                      <MessageDisplay
                        key={msg._id}
                        message={msg}
                        userName="User"
                      />
                    ))}
                </div>
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Message AI assistant..."
                      className="min-h-[60px] resize-none pr-12"
                      rows={1}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!message.trim()}
                          size="sm"
                          className="absolute right-2 bottom-2 h-8 w-8 p-0"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send message (Enter)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  AI responses are generated using Vercel AI SDK with real-time
                  streaming
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// Component to display individual messages with streaming support
function MessageDisplay({
  message,
  userName,
}: { message: Message; userName: string }) {
  const [displayText, setDisplayText] = useState(message.body)
  const [isTyping, setIsTyping] = useState(false)

  // Update display text when message body changes (via Convex reactivity)
  useEffect(() => {
    setDisplayText(message.body)
    setIsTyping(
      Boolean(
        message.isStreaming && !message.isComplete && message.body.length > 0,
      ),
    )
  }, [message.body, message.isStreaming, message.isComplete])

  const isAI = message.messageType === "assistant"
  const isStreaming = message.isStreaming && !message.isComplete

  return (
    <div className={`flex gap-4 ${isAI ? "" : "justify-end"} animate-fade-in`}>
      {isAI && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Zap className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <Card
        className={`max-w-2xl ${
          isAI ? "" : "bg-primary text-primary-foreground"
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium opacity-70">
              {message.messageType === "user" ? userName : "AI Assistant"}
            </p>
            {isStreaming && (
              <div className="flex items-center text-xs opacity-70">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
                  <div
                    className="w-1 h-1 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-1 h-1 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
                <span className="ml-2">typing...</span>
              </div>
            )}
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {displayText || (isStreaming ? "..." : "")}
            {isTyping && (
              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
            )}
          </p>

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs opacity-70">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
            {message.isComplete && isAI && (
              <Badge variant="secondary" className="text-xs">
                ✓ Complete
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!isAI && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-secondary">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

// Main component that switches between landing and chat based on auth state
export default function Home() {
  return (
    <>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
      <Authenticated>
        <ChatInterface />
      </Authenticated>
    </>
  )
}
