"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMutation, useQuery } from "convex/react"
import { MessageCircle, Plus, Send, User, Zap } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"

type Message = Doc<"messages">

export default function Home() {
  const [message, setMessage] = useState("")
  const [author, setAuthor] = useState("User")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Get all messages with real-time updates
  const messages = useQuery(api.messages.list)
  const sendMessage = useMutation(api.messages.send)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      await sendMessage({
        author,
        body: message,
      })
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
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/40 flex flex-col">
          {/* New Chat Button */}
          <div className="p-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => window.location.reload()}
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

          {/* User Name Input */}
          <div className="p-4">
            <label
              htmlFor="author-input"
              className="text-sm font-medium mb-2 block"
            >
              Your Name
            </label>
            <input
              id="author-input"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <Separator />

          {/* Chat History */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 py-2">
              <div className="p-2 rounded-md hover:bg-accent cursor-pointer group">
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">AI Streaming Chat</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </ScrollArea>

          <Separator />

          {/* User Profile */}
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{author}</p>
                <p className="text-xs text-muted-foreground">Convex + AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="border-b p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">AI Chat</h1>
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
                    <MessageDisplay key={msg._id} message={msg} />
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
                    disabled={!author.trim()}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || !author.trim()}
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
                {!author.trim()
                  ? "Please enter your name to start chatting"
                  : "AI responses are generated using Vercel AI SDK with real-time streaming"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// Component to display individual messages with streaming support
function MessageDisplay({ message }: { message: Message }) {
  const [displayText, setDisplayText] = useState(message.body)
  const [isTyping, setIsTyping] = useState(false)

  // Get chunks for streaming messages
  const chunks = useQuery(
    api.messages.getMessageChunks,
    message.isStreaming ? { messageId: message._id } : "skip",
  )

  // Update display text as chunks arrive
  useEffect(() => {
    if (message.isStreaming && chunks) {
      const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
      const fullText = sortedChunks.map((chunk) => chunk.content).join("")
      setDisplayText(fullText)
      setIsTyping(!message.isComplete && chunks.length > 0)
    } else {
      setDisplayText(message.body)
      setIsTyping(false)
    }
  }, [chunks, message.body, message.isStreaming, message.isComplete])

  const isAI = message.messageType === "ai"
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
            <p className="text-xs font-medium opacity-70">{message.author}</p>
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
