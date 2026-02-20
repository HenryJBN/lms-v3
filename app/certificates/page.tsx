"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, ExternalLink, Share2, Loader2, ShieldCheck } from "lucide-react"
import NFTCertificate from "@/components/nft-certificate"
import { certificatesService, Certificate } from "@/lib/services/certificates"

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCertificates() {
      try {
        const data = await certificatesService.getMyCertificates()
        setCertificates(data)
      } catch (error) {
        console.error("Failed to fetch certificates:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCertificates()
  }, [])

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Certificates</h1>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share Portfolio
        </Button>
      </div>

      <Tabs defaultValue="certificates" className="w-full">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="certificates">Certificates ({certificates.length})</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your achievements...</p>
            </div>
          ) : certificates.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <NFTCertificate
                  key={cert.id}
                  certificate={cert}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-center">No certificates yet</p>
                <p className="text-sm text-muted-foreground text-center mt-1 mb-4">
                  Complete courses to earn professional certificates
                </p>
                <Button asChild>
                  <a href="/courses">Browse Courses</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blockchain" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Blockchain Credentials
              </CardTitle>
              <CardDescription>
                Certificates are eligible for blockchain verification after course completion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-10 border rounded-xl bg-primary/5">
                <ShieldCheck className="h-16 w-16 text-primary/50 mb-6" />
                <h3 className="text-xl font-semibold">Ready for the Future</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  Blockchain verification is coming soon. Your current certificates are securely stored in our system and will be eligible for on-chain minting.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
