"use client"

import { useMutation, useQuery } from "convex/react"
import { useEffect, useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"

// Use generated Convex types instead of manual definitions
type Message = Doc<"messages">
type MessageChunk = Doc<"messageChunks">

export function ChatStreaming() {
  const [newMessage, setNewMessage] = useState("")
  const [author, setAuthor] = useState("User")

  // Get all messages with real-time updates
  const messages = useQuery(api.messages.list)
  const sendMessage = useMutation(api.messages.send)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      await sendMessage({
        author,
        body: newMessage,
      })
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  return (
    <div className="flex flex-col h-96 max-w-2xl mx-auto border rounded-lg bg-white shadow-lg">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-800">
          AI Chat with Streaming
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Powered by Vercel AI SDK & Convex
        </p>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
          className="mt-2 px-3 py-1 border rounded-md text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
        {messages?.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Start a conversation with the AI!</p>
          </div>
        ) : (
          messages?.map((message) => (
            <MessageDisplay key={message._id} message={message} />
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t bg-gray-50 rounded-b-lg"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={!author.trim()}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !author.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        {!author.trim() && (
          <p className="text-xs text-red-500 mt-1">
            Please enter your name first
          </p>
        )}
      </form>
    </div>
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
    <div
      className={`flex ${isAI ? "justify-start" : "justify-end"} animate-fade-in`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
          isAI
            ? "bg-gray-100 text-gray-800 border border-gray-200"
            : "bg-blue-500 text-white"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs opacity-70 font-medium">{message.author}</div>
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
        <div className="whitespace-pre-wrap leading-relaxed">
          {displayText || (isStreaming ? "..." : "")}
          {isTyping && (
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 opacity-70" />
          )}
        </div>
        {message.isComplete && isAI && (
          <div className="text-xs opacity-50 mt-1">✓ Complete</div>
        )}
      </div>
    </div>
  )
}
