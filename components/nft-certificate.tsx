"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, ExternalLink, Share2, ShieldCheck, Download, Calendar } from "lucide-react"
import { Certificate } from "@/lib/services/certificates"

interface NFTCertificateProps {
  certificate: Certificate
}

export default function NFTCertificate({
  certificate
}: NFTCertificateProps) {
  const isNFT = !!certificate.token_id
  const formattedDate = new Date(certificate.issued_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })

  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {/* Certificate Preview Placeholder / Thumbnail */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="relative w-[90%] h-[90%] border-4 border-double border-primary/20 bg-background flex flex-col items-center justify-center p-4 text-center shadow-sm">
             <Award className="h-10 w-10 text-primary/30 mb-2" />
             <div className="text-[10px] font-serif uppercase tracking-widest text-muted-foreground">Certificate of Completion</div>
             <div className="mt-2 text-xs font-bold leading-tight line-clamp-2">{certificate.title}</div>
             <div className="mt-4 flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/10" />)}
             </div>
          </div>
        </div>
        
        {isNFT && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary/90 backdrop-blur-md gap-1.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              NFT VERIFIED
            </Badge>
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {certificate.certificate_url && (
            <Button size="sm" variant="secondary" className="gap-2" onClick={() => window.open(certificate.certificate_url, '_blank')}>
              <ExternalLink className="h-4 w-4" />
              View PDF
            </Button>
          )}
          <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
      
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-lg leading-tight line-clamp-1">
          {certificate.title}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Issued on {formattedDate}
        </CardDescription>
      </CardHeader>
      
      {isNFT && (
        <CardContent className="px-5 pb-2">
          <div className="rounded-md bg-muted p-2 font-mono text-[10px] flex justify-between items-center">
            <span>#{certificate.token_id}</span>
            <span className="text-primary font-bold uppercase">{certificate.blockchain_network}</span>
          </div>
        </CardContent>
      )}
      
      <CardFooter className="p-4 pt-2 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2" asChild disabled={!certificate.certificate_url}>
          <a href={certificate.certificate_url} download target="_blank" rel="noreferrer">
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
