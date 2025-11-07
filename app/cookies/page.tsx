import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SiteFooter from "@/components/site-footer"
import SiteHeader from "@/components/site-header"

export default function CookiesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 container py-12 md:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-4xl font-bold tracking-tight text-center sm:text-5xl">
            Cookie Policy
          </h1>
          <p className="text-lg text-muted-foreground text-center">
            This Cookie Policy explains how DCA LMS ("Company," "we," "us," and "our") uses cookies
            and similar technologies to recognize you when you visit our websites at dcalms.com
            ("Websites"). It explains what these technologies are and why we use them, as well as
            your rights to control our use of them.
          </p>

          <Card>
            <CardHeader>
              <CardTitle>What are cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cookies are small data files that are placed on your computer or mobile device when
                you visit a website. Cookies are widely used by website owners in order to make
                their websites work, or to work more efficiently, as well as to provide reporting
                information.
              </p>
              <p className="mt-4 text-muted-foreground">
                Cookies set by the website owner (in this case, DCA LMS) are called "first-party
                cookies." Cookies set by parties other than the website owner are called
                "third-party cookies." Third-party cookies enable third-party features or
                functionality to be provided on or through the website (e.g., advertising,
                interactive content, and analytics). The parties that set these third-party cookies
                can recognize your computer both when it visits the website in question and also
                when it visits certain other websites.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why do we use cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We use first-party and third-party cookies for several reasons. Some cookies are
                required for our Websites to operate, and we refer to these as "essential" or
                "strictly necessary" cookies. Other cookies also enable us to track and target the
                interests of our users to enhance the experience on our Websites. Third parties
                serve cookies through our Websites for advertising, analytics, and other purposes.
                This is described in more detail below.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How can I control cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You have the right to decide whether to accept or reject cookies. You can exercise
                your cookie rights by setting your preferences in the Cookie Consent Manager. The
                Cookie Consent Manager allows you to select which categories of cookies you accept
                or reject. Essential cookies cannot be rejected as they are strictly necessary to
                provide you with services.
              </p>
              <p className="mt-4 text-muted-foreground">
                The Cookie Consent Manager can be found in the notification banner and on our
                website. If you choose to reject cookies, you may still use our website though your
                access to some functionality and areas of our website may be restricted. You may
                also set or amend your web browser controls to accept or refuse cookies.
              </p>
              <p className="mt-4 text-muted-foreground">
                The specific types of first and third-party cookies served through our Websites and
                the purposes they perform are described in the table below (please note that the
                specific cookies served may vary depending on the specific Online Properties you
                visit):
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What about other tracking technologies, like web beacons?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cookies are not the only way to recognize or track visitors to a website. We may use
                other, similar technologies from time to time, like web beacons (sometimes called
                "tracking pixels" or "clear gifs"). These are tiny graphics files that contain a
                unique identifier that enable us to recognize when someone has visited our Websites
                or opened an email including them. This allows us, for example, to monitor the
                traffic patterns of users from one page within our Websites to another, to deliver
                or communicate with cookies, to understand whether you have come to our Website from
                an online advertisement displayed on a third-party website, to improve site
                performance, and to measure the success of email marketing campaigns. In many
                instances, these technologies are reliant on cookies to function properly, and so
                declining cookies will impair their functioning.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Do we use Flash cookies or Local Shared Objects?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Websites may also use "Flash Cookies" (also known as Local Shared Objects or "LSOs")
                to, among other things, collect and store information about your use of our
                services, fraud prevention, and for other site operations.
              </p>
              <p className="mt-4 text-muted-foreground">
                If you do not want Flash Cookies stored on your computer, you can adjust the
                settings of your Flash player to block Flash Cookies storage using the tools
                contained in the Website Storage Settings Panel. You can also control Flash Cookies
                by going to the Global Storage Settings Panel and following the instructions (which
                may include instructions that explain, for example, how to delete existing Flash
                Cookies (referred to as "information" on the Macromedia site), how to prevent Flash
                LSOs from being placed on your computer without your being asked, and (for Flash
                Player 8 and later) how to block Flash Cookies that are not being delivered by the
                operator of the page you are on at the time).
              </p>
              <p className="mt-4 text-muted-foreground">
                Please note that setting the Flash Player to restrict or limit acceptance of Flash
                Cookies may reduce or impede the functionality of some Flash applications,
                including, potentially, Flash applications used in connection with our services or
                online content.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Do we serve targeted advertising?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Third parties may serve cookies on your computer or mobile device to serve
                advertising through our Websites. These companies may use information about your
                visits to this and other websites in order to provide relevant advertisements about
                goods and services that you may be interested in. They may also employ technology
                that is used to measure the effectiveness of advertisements. This can be
                accomplished by them using cookies or web beacons to collect information about your
                visits to this and other websites in order to provide relevant advertisements about
                goods and services of potential interest to you. The information collected through
                this process does not enable us or them to identify your name, contact details or
                other personally identifiable details unless you choose to provide these.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How often will we update this Cookie Policy?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We may update this Cookie Policy from time to time in order to reflect, for example,
                changes to the cookies we use or for other operational, legal or regulatory reasons.
                Please therefore re-visit this Cookie Policy regularly to stay informed about our
                use of cookies and related technologies.
              </p>
              <p className="mt-4 text-muted-foreground">
                The date at the top of this Cookie Policy indicates when it was last updated.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Where can I get further information?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                If you have any questions about our use of cookies or other technologies, please
                email us at{" "}
                <Link href="mailto:support@dcalms.com" className="text-primary hover:underline">
                  support@dcalms.com
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
