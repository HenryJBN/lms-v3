import AdaptiveLearningEngine from "@/components/adaptive-learning-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrainCircuit, ChevronLeft, ChevronRight, Gem, Play } from "lucide-react"

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  // This would be dynamically fetched based on the lessonId in a real app
  const lesson = {
    id: params.lessonId,
    title: "Digital Signatures in Blockchain",
    module: "Cryptography in Blockchain",
    courseTitle: "Introduction to Blockchain Technology",
    videoUrl: "/placeholder.svg?height=400&width=800",
    content: `
    <h2>Digital Signatures in Blockchain</h2>
    
    <p>Digital signatures are a critical component of blockchain technology. They allow users to sign transactions and prove ownership of assets without revealing their private keys.</p>
    
    <h3>Key Concepts</h3>
    
    <p>A digital signature in blockchain works through asymmetric cryptography, using a pair of keys:</p>
    
    <ul>
      <li><strong>Private Key:</strong> Known only to the owner, used to create signatures</li>
      <li><strong>Public Key:</strong> Shared with everyone, used to verify signatures</li>
    </ul>
    
    <p>When a user initiates a transaction, the following process occurs:</p>
    
    <ol>
      <li>The transaction data is run through a hash function</li>
      <li>The hash is encrypted with the user's private key to create a signature</li>
      <li>The signature, original data, and public key are sent to the network</li>
      <li>Validators use the public key to decrypt the signature</li>
      <li>If the decrypted signature matches the hash of the transaction data, the signature is valid</li>
    </ol>
    
    <h3>Properties of Digital Signatures</h3>
    
    <p>Good digital signatures have three important properties:</p>
    
    <ul>
      <li><strong>Authentication:</strong> Verify who created the signature</li>
      <li><strong>Non-repudiation:</strong> Signer cannot deny signing the data</li>
      <li><strong>Integrity:</strong> Data hasn't been altered after signing</li>
    </ul>
    
    <h3>Digital Signature Algorithms</h3>
    
    <p>Different blockchains use different signature algorithms:</p>
    
    <ul>
      <li><strong>ECDSA:</strong> Used by Bitcoin and many others</li>
      <li><strong>EdDSA:</strong> Used by Cardano and other platforms</li>
      <li><strong>Schnorr:</strong> Increasingly adopted for its simplicity and efficiency</li>
    </ul>
    `,
    previousLesson: {
      id: "cryptographic-hash-functions",
      title: "Cryptographic Hash Functions",
    },
    nextLesson: {
      id: "public-private-keys",
      title: "Public & Private Keys",
    },
    tokensForCompletion: 5,
  }

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <span>{lesson.courseTitle}</span>
        <ChevronRight className="h-4 w-4" />
        <span>{lesson.module}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
          <Gem className="h-4 w-4" />
          <span>+{lesson.tokensForCompletion} tokens on completion</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
            <img
              src={lesson.videoUrl || "/placeholder.svg"}
              alt={lesson.title}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Button size="lg" className="rounded-full" variant="default">
                <Play className="mr-2 h-4 w-4" />
                Play Video Lesson
              </Button>
            </div>
          </div>

          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Lesson Content</TabsTrigger>
              <TabsTrigger value="transcript">Video Transcript</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-6">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
              />
            </TabsContent>
            <TabsContent value="transcript" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground italic">
                    This is a placeholder for the video transcript. In a real application, this
                    would contain the full transcript of the lesson video with timestamps. This is
                    important for accessibility and allows students to search for specific content
                    within the video.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="resources" className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Supplementary Materials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex justify-between items-center">
                        <span className="text-sm">Digital Signatures Cheat Sheet</span>
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </li>
                      <li className="flex justify-between items-center">
                        <span className="text-sm">ECDSA Implementation Example</span>
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">External Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex justify-between items-center">
                        <span className="text-sm">Cryptography Fundamentals Article</span>
                        <Button variant="ghost" size="sm">
                          Visit
                        </Button>
                      </li>
                      <li className="flex justify-between items-center">
                        <span className="text-sm">Digital Signature Demo Tool</span>
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4">
            {lesson.previousLesson ? (
              <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {lesson.previousLesson.title}
              </Button>
            ) : (
              <div></div>
            )}

            {lesson.nextLesson && (
              <Button>
                {lesson.nextLesson.title}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BrainCircuit className="mr-2 h-5 w-5 text-primary" />
                Knowledge Check
              </CardTitle>
              <CardDescription>Test your understanding with AI-generated questions</CardDescription>
            </CardHeader>
            <CardContent>
              <AdaptiveLearningEngine />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Module Progress</span>
                    <span>2/4 lessons</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "50%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Course Progress</span>
                    <span>7/15 lessons</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "47%" }}></div>
                  </div>
                </div>

                <Separator className="my-2" />

                <div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium">Next Up</h4>
                      <p className="text-xs text-muted-foreground">{lesson.nextLesson?.title}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Mark Complete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
