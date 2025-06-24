"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Zap, MessageSquare, Bot } from "lucide-react"
import Link from "next/link"

export function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">Chat with AI</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="https://github.com/lightfastai/chat" className="text-gray-600 hover:text-gray-900">
                GitHub
              </Link>
              <Button asChild variant="outline">
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
          Chat with the latest AI models. Pay only for what you use with our credit-based system.
        </p>
      </div>

      {/* Pricing Card */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  Most Popular
                </Badge>
              </div>
              <CardTitle className="text-2xl">Starter Plan</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">$8</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mt-2">800 credits included</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>800 credits per month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>All AI models included</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Unlimited conversations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Email support</span>
                </div>
              </div>

              {/* Credit Costs Breakdown */}
              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Credit costs per message:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">GPT-4o</span>
                    <span className="font-medium">1 credit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GPT-4o Mini</span>
                    <span className="font-medium">1 credit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Claude Sonnet</span>
                    <span className="font-medium">2 credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Claude Haiku</span>
                    <span className="font-medium">1 credit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Computer Use</span>
                    <span className="font-medium">5 credits</span>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/signin">
                  <Zap className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need</h2>
            <p className="mt-4 text-gray-600">Simple credit-based pricing with access to the latest AI models</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <MessageSquare className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Unlimited Conversations</h3>
              <p className="text-gray-600">Chat as much as you want. No conversation limits, only credit usage.</p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Bot className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">All AI Models</h3>
              <p className="text-gray-600">Access GPT-4o, Claude Sonnet, and more. Choose the best model for each task.</p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Zap className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pay Per Use</h3>
              <p className="text-gray-600">Only pay for what you use. No waste, no surprises.</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do credits work?
              </h3>
              <p className="text-gray-600">
                Credits are consumed each time you send a message to an AI model. Different models cost different amounts of credits based on their computational complexity. Most messages cost 1-2 credits.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I run out of credits?
              </h3>
              <p className="text-gray-600">
                When you run out of credits, you'll need to wait until your next monthly allocation or purchase additional credits. We'll notify you when you're running low.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. Your credits will remain available until the end of your billing period.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Which AI models are included?
              </h3>
              <p className="text-gray-600">
                All our supported AI models are included: GPT-4o, GPT-4o Mini, Claude 3.5 Sonnet, Claude 3.5 Haiku, and more. You can switch between models at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 Chat with AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}