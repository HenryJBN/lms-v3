import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, ExternalLink, Share2 } from "lucide-react"
import NFTCertificate from "@/components/nft-certificate"

export default function CertificatesPage() {
  // In a real app, this data would come from your blockchain integration
  const certificates = [
    {
      id: "1",
      title: "HTML & CSS Fundamentals",
      issueDate: "May 15, 2023",
      image: "/placeholder.svg?height=250&width=400",
      tokenId: "0x7298c31b8c08cE82a65Bd16E1F6A8459B0C90a55",
      blockchain: "Polygon",
    },
  ]

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
          {certificates.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <NFTCertificate
                  key={cert.id}
                  title={cert.title}
                  issueDate={cert.issueDate}
                  image={cert.image}
                  tokenId={cert.tokenId}
                  blockchain={cert.blockchain}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-center">No certificates yet</p>
                <p className="text-sm text-muted-foreground text-center mt-1 mb-4">
                  Complete courses to earn NFT certificates
                </p>
                <Button>Browse Courses</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blockchain" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Verify Certificate</CardTitle>
              <CardDescription>
                Enter a certificate ID or token ID to verify its authenticity on the blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter certificate or token ID"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button>Verify</Button>
              </div>

              <div className="flex items-center p-4 rounded-md bg-primary/10">
                <div className="mr-4">
                  <ExternalLink className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">How verification works</h3>
                  <p className="text-sm text-muted-foreground">
                    Certificates are stored on the blockchain as NFTs, making them tamper-proof and
                    permanently verifiable. The verification process checks the certificate's
                    metadata and confirms its issuance by our platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
