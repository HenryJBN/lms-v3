"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SiteHeader from "@/components/site-header";
import {
  Bell,
  Shield,
  Wallet,
  User,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState({
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    bio: "Blockchain developer and educator passionate about Web3 technologies and decentralized applications.",
    avatarUrl: "/images/testimonials/alex-johnson.png",
    timezone: "UTC-8",
    language: "English",
    country: "United States",
  });

  const [notifications, setNotifications] = useState({
    courseUpdates: true,
    newLessons: true,
    achievements: true,
    tokenRewards: true,
    certificates: true,
    marketing: false,
    weeklyDigest: true,
    mobileNotifications: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    showProgress: true,
    showCertificates: true,
    showAchievements: true,
    allowMessages: true,
    dataCollection: true,
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: "24",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [walletConnected, setWalletConnected] = useState(true);

  const handleSaveProfile = () => {
    // Handle profile save logic
    console.log("Profile saved:", user);
  };

  const handleSaveNotifications = () => {
    // Handle notifications save logic
    console.log("Notifications saved:", notifications);
  };

  const handleSavePrivacy = () => {
    // Handle privacy save logic
    console.log("Privacy settings saved:", privacy);
  };

  const handleSaveSecurity = () => {
    // Handle security save logic
    console.log("Security settings saved:", security);
  };

  return (
    <>
      <main className="container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={user.avatarUrl || "/placeholder.svg"}
                        alt={user.name}
                      />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button>Change Photo</Button>
                      <p className="text-sm text-muted-foreground">
                        JPG, GIF or PNG. 1MB max.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={user.name}
                        onChange={(e) =>
                          setUser({ ...user, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        onChange={(e) =>
                          setUser({ ...user, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={user.bio}
                      onChange={(e) =>
                        setUser({ ...user, bio: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={user.timezone}
                        onValueChange={(value) =>
                          setUser({ ...user, timezone: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC-12">UTC-12</SelectItem>
                          <SelectItem value="UTC-8">UTC-8 (PST)</SelectItem>
                          <SelectItem value="UTC-5">UTC-5 (EST)</SelectItem>
                          <SelectItem value="UTC+0">UTC+0 (GMT)</SelectItem>
                          <SelectItem value="UTC+1">UTC+1 (CET)</SelectItem>
                          <SelectItem value="UTC+8">UTC+8 (CST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={user.language}
                        onValueChange={(value) =>
                          setUser({ ...user, language: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="Chinese">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={user.country}
                        onValueChange={(value) =>
                          setUser({ ...user, country: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">
                            United States
                          </SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">
                            United Kingdom
                          </SelectItem>
                          <SelectItem value="Germany">Germany</SelectItem>
                          <SelectItem value="France">France</SelectItem>
                          <SelectItem value="Japan">Japan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile}>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Learning Notifications</h4>
                    <div className="space-y-4">
                      {[
                        {
                          key: "courseUpdates",
                          label: "Course updates and announcements",
                          description: "Get notified when courses are updated",
                        },
                        {
                          key: "newLessons",
                          label: "New lessons and content",
                          description:
                            "Be the first to know about new learning materials",
                        },
                        {
                          key: "achievements",
                          label: "Achievement notifications",
                          description: "Celebrate your learning milestones",
                        },
                        {
                          key: "tokenRewards",
                          label: "Token rewards",
                          description: "Get notified when you earn tokens",
                        },
                        {
                          key: "certificates",
                          label: "Certificate issuance",
                          description: "Know when your certificates are ready",
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <Label>{item.label}</Label>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <Switch
                            checked={
                              notifications[
                                item.key as keyof typeof notifications
                              ]
                            }
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                [item.key]: checked,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Communication</h4>
                    <div className="space-y-4">
                      {[
                        {
                          key: "marketing",
                          label: "Marketing emails",
                          description:
                            "Receive updates about new features and courses",
                        },
                        {
                          key: "weeklyDigest",
                          label: "Weekly digest",
                          description:
                            "Get a summary of your learning progress",
                        },
                        {
                          key: "mobileNotifications",
                          label: "Mobile push notifications",
                          description:
                            "Receive notifications on your mobile device",
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <Label>{item.label}</Label>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <Switch
                            checked={
                              notifications[
                                item.key as keyof typeof notifications
                              ]
                            }
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                [item.key]: checked,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotifications}>
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Profile Visibility</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Profile Visibility</Label>
                        <Select
                          value={privacy.profileVisibility}
                          onValueChange={(value) =>
                            setPrivacy({ ...privacy, profileVisibility: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              Public - Anyone can see your profile
                            </SelectItem>
                            <SelectItem value="students">
                              Students only - Only other students can see your
                              profile
                            </SelectItem>
                            <SelectItem value="private">
                              Private - Only you can see your profile
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {[
                        {
                          key: "showProgress",
                          label: "Show learning progress",
                          description:
                            "Display your course progress on your profile",
                        },
                        {
                          key: "showCertificates",
                          label: "Show certificates",
                          description:
                            "Display your earned certificates publicly",
                        },
                        {
                          key: "showAchievements",
                          label: "Show achievements",
                          description: "Display your achievements and badges",
                        },
                        {
                          key: "allowMessages",
                          label: "Allow messages",
                          description: "Let other users send you messages",
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <Label>{item.label}</Label>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <Switch
                            checked={privacy[item.key as keyof typeof privacy]}
                            onCheckedChange={(checked) =>
                              setPrivacy({ ...privacy, [item.key]: checked })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Data & Analytics</h4>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Data collection for improvement</Label>
                        <p className="text-sm text-muted-foreground">
                          Help us improve the platform by sharing anonymous
                          usage data
                        </p>
                      </div>
                      <Switch
                        checked={privacy.dataCollection}
                        onCheckedChange={(checked) =>
                          setPrivacy({ ...privacy, dataCollection: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSavePrivacy}>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Password</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter new password"
                        />
                      </div>
                    </div>
                    <Button>Update Password</Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable 2FA</Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Switch
                        checked={security.twoFactorEnabled}
                        onCheckedChange={(checked) =>
                          setSecurity({
                            ...security,
                            twoFactorEnabled: checked,
                          })
                        }
                      />
                    </div>
                    {security.twoFactorEnabled && (
                      <Alert>
                        <AlertDescription>
                          Two-factor authentication is enabled. You'll need your
                          authenticator app to sign in.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Login Security</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Login alerts</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when someone signs into your account
                          </p>
                        </div>
                        <Switch
                          checked={security.loginAlerts}
                          onCheckedChange={(checked) =>
                            setSecurity({ ...security, loginAlerts: checked })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Session timeout</Label>
                        <Select
                          value={security.sessionTimeout}
                          onValueChange={(value) =>
                            setSecurity({ ...security, sessionTimeout: value })
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="8">8 hours</SelectItem>
                            <SelectItem value="24">24 hours</SelectItem>
                            <SelectItem value="168">1 week</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSecurity}>
                      Save Security Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Settings */}
            <TabsContent value="wallet">
              <Card>
                <CardHeader>
                  <CardTitle>Wallet & Blockchain</CardTitle>
                  <CardDescription>
                    Manage your Web3 wallet connections and blockchain
                    preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Connected Wallets</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                            <Wallet className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium">MetaMask</p>
                            <p className="text-sm text-muted-foreground">
                              0x7a3b...f92e
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-green-600">
                            Connected
                          </Badge>
                          <Button variant="outline" size="sm">
                            Disconnect
                          </Button>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        Connect Another Wallet
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Blockchain Preferences</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Preferred Network</Label>
                        <Select defaultValue="ethereum">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ethereum">
                              Ethereum Mainnet
                            </SelectItem>
                            <SelectItem value="polygon">Polygon</SelectItem>
                            <SelectItem value="arbitrum">Arbitrum</SelectItem>
                            <SelectItem value="optimism">Optimism</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Gas Fee Preference</Label>
                        <Select defaultValue="standard">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">
                              Slow (Lower fees)
                            </SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="fast">
                              Fast (Higher fees)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Token Management</h4>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Learning Tokens (LRN)</p>
                          <p className="text-sm text-muted-foreground">
                            Your earned learning tokens
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">325</p>
                          <p className="text-sm text-muted-foreground">
                            ≈ $32.50
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Settings */}
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>Billing & Subscription</CardTitle>
                  <CardDescription>
                    Manage your subscription and payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Current Plan</h4>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Pro Plan</p>
                          <p className="text-sm text-muted-foreground">
                            Access to all courses and features
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">$29</p>
                          <p className="text-sm text-muted-foreground">
                            per month
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <Button variant="outline">Change Plan</Button>
                        <Button variant="outline">Cancel Subscription</Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Payment Methods</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">•••• •••• •••• 4242</p>
                            <p className="text-sm text-muted-foreground">
                              Expires 12/25
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Default</Badge>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        Add Payment Method
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Billing History</h4>
                    <div className="space-y-2">
                      {[
                        {
                          date: "Dec 1, 2023",
                          amount: "$29.00",
                          status: "Paid",
                        },
                        {
                          date: "Nov 1, 2023",
                          amount: "$29.00",
                          status: "Paid",
                        },
                        {
                          date: "Oct 1, 2023",
                          amount: "$29.00",
                          status: "Paid",
                        },
                      ].map((invoice, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <p className="font-medium">{invoice.date}</p>
                            <p className="text-sm text-muted-foreground">
                              Pro Plan
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <p className="font-medium">{invoice.amount}</p>
                            <Badge variant="outline" className="text-green-600">
                              {invoice.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
