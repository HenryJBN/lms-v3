"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cpu, Send } from "lucide-react"

export default function AIChatAssistant() {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content: "Hi there! I'm your AI learning assistant. How can I help you today?",
    },
  ])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // Add user message to chat
    setChatHistory([...chatHistory, { role: "user", content: message }])

    // Simulate AI response (in a real app, this would call your AI API)
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm simulating a response to your question. In a real application, this would connect to an AI model like GPT-4 to provide accurate answers.",
        },
      ])
    }, 1000)

    setMessage("")
  }

  return (
    <div className="flex flex-col h-64">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                chat.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {chat.role === "assistant" && <Cpu className="h-4 w-4 mb-1 inline-block mr-1" />}
              {chat.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask any question..."
          className="flex-1"
        />
        <Button type="submit" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
