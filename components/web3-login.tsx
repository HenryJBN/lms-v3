"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletIcon, Mail, Key, LogIn } from "lucide-react"

export default function Web3Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleTraditionalLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate login
    setTimeout(() => {
      setIsLoading(false)
      // In a real app, you'd navigate to the dashboard or handle authentication
      alert("Login successful!")
    }, 1500)
  }

  const handleWeb3Login = (provider: string) => {
    setIsLoading(true)

    // Simulate Web3 login
    setTimeout(() => {
      setIsLoading(false)
      // In a real app, you'd use Web3 library to connect wallet
      alert(`Connected to ${provider}!`)
    }, 1500)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign in to your account</DialogTitle>
          <DialogDescription>
            Choose how you'd like to authenticate to access your learning dashboard.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="traditional" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="traditional">Traditional</TabsTrigger>
            <TabsTrigger value="web3">Web3 Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="traditional">
            <form onSubmit={handleTraditionalLogin} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="your@email.com"
                    type="email"
                    className="pl-8"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Key className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-8"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="text-center text-sm">
                <a href="#" className="text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="web3" className="space-y-4 py-4">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => handleWeb3Login("MetaMask")}
                disabled={isLoading}
              >
                <span>Connect with MetaMask</span>
                <WalletIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => handleWeb3Login("WalletConnect")}
                disabled={isLoading}
              >
                <span>Connect with WalletConnect</span>
                <WalletIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => handleWeb3Login("Coinbase Wallet")}
                disabled={isLoading}
              >
                <span>Connect with Coinbase Wallet</span>
                <WalletIcon className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to earn L-Tokens and receive NFT certificates
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
