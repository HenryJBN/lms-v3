import Link from "next/link"
import { Button } from "@/components/ui/button"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container max-w-4xl py-12">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: March 15, 2025</p>
          </div>

          <div className="mt-8 space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Introduction</h2>
              <p>
                Welcome to DCA LMS. These Terms of Service ("Terms") govern your use of our website, platform, and
                services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by
                these Terms.
              </p>
              <p>
                Please read these Terms carefully before using our Services. If you do not agree to these Terms, you may
                not access or use our Services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Definitions</h2>
              <p>
                <strong>"DCA LMS"</strong>, <strong>"we"</strong>, <strong>"us"</strong>, or <strong>"our"</strong>{" "}
                refers to DCA Learning Management System, the company that operates the Services.
              </p>
              <p>
                <strong>"User"</strong>, <strong>"you"</strong>, or <strong>"your"</strong> refers to any individual or
                entity that accesses or uses our Services.
              </p>
              <p>
                <strong>"Content"</strong> refers to all materials, information, data, text, graphics, images, videos,
                audio files, and other materials that are part of our Services or that users submit, post, or make
                available through our Services.
              </p>
              <p>
                <strong>"L-Tokens"</strong> refers to the digital tokens earned and used within the DCA LMS platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Account Registration</h2>
              <p>
                To access certain features of our Services, you may be required to register for an account. You agree to
                provide accurate, current, and complete information during the registration process and to update such
                information to keep it accurate, current, and complete.
              </p>
              <p>
                You are responsible for safeguarding your account credentials and for all activities that occur under
                your account. You agree to notify us immediately of any unauthorized use of your account or any other
                breach of security.
              </p>
              <p>
                We reserve the right to disable any user account at any time in our sole discretion for any or no
                reason, including if we believe that you have violated these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Blockchain Certificates and NFTs</h2>
              <p>
                DCA LMS issues blockchain-verified certificates as non-fungible tokens (NFTs) upon completion of certain
                courses. These certificates are subject to the following terms:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Certificates are issued on the blockchain network specified at the time of issuance.</li>
                <li>
                  You are responsible for maintaining access to the wallet address where your certificates are stored.
                </li>
                <li>
                  DCA LMS does not guarantee the value, transferability, or acceptance of these certificates by third
                  parties.
                </li>
                <li>
                  The blockchain network may charge transaction fees for the issuance or transfer of certificates, which
                  may be your responsibility.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. L-Tokens</h2>
              <p>
                L-Tokens are digital tokens that can be earned and used within the DCA LMS platform. L-Tokens are
                subject to the following terms:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>L-Tokens have no cash value and cannot be exchanged for real currency.</li>
                <li>
                  L-Tokens can only be earned through activities specified by DCA LMS, such as completing courses or
                  quizzes.
                </li>
                <li>
                  L-Tokens can only be used for purposes specified by DCA LMS, such as unlocking premium content or
                  obtaining certificates.
                </li>
                <li>
                  DCA LMS reserves the right to modify the L-Token system, including the ways tokens can be earned or
                  used, at any time.
                </li>
                <li>L-Tokens may expire after a period of account inactivity, as specified in our current policies.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
              <p>
                All content, features, and functionality of our Services, including but not limited to text, graphics,
                logos, icons, images, audio clips, digital downloads, data compilations, and software, are the exclusive
                property of DCA LMS or our licensors and are protected by copyright, trademark, and other intellectual
                property laws.
              </p>
              <p>
                You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly
                perform, republish, download, store, or transmit any of the material on our Services, except as follows:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Your computer may temporarily store copies of such materials in RAM incidental to your accessing and
                  viewing those materials.
                </li>
                <li>
                  You may store files that are automatically cached by your Web browser for display enhancement
                  purposes.
                </li>
                <li>
                  You may print or download one copy of a reasonable number of pages of the website for your own
                  personal, non-commercial use and not for further reproduction, publication, or distribution.
                </li>
              </ul>
            </section>

            <div className="mt-12 flex justify-center">
              <Link href="/">
                <Button>Return to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
