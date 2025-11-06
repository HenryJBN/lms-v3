import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, ExternalLink, Share2 } from "lucide-react"

interface NFTCertificateProps {
  title: string
  issueDate: string
  image: string
  tokenId: string
  blockchain: string
}

export default function NFTCertificate({ title, issueDate, image, tokenId, blockchain }: NFTCertificateProps) {
  return (
    <Card className="overflow-hidden border-2">
      <div className="relative">
        <img src={image || "/placeholder.svg"} alt={`${title} Certificate`} className="w-full h-auto" />
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">{blockchain}</div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        <CardDescription>Issued on {issueDate}</CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="rounded-md bg-muted p-2 font-mono text-xs">
          Token ID: {tokenId.substring(0, 8)}...{tokenId.substring(tokenId.length - 8)}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-0">
        <Button variant="ghost" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button variant="outline" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Chain
        </Button>
      </CardFooter>
    </Card>
  )
}
