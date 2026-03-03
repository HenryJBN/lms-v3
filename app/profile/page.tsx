"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Calendar, MapPin, Briefcase, Award, BookOpen, Trophy, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/contexts/auth-context"
import { usersService } from "@/lib/services/users"
import { enrollmentsService, type Enrollment } from "@/lib/services/enrollments"
import { milestonesService, type UserMilestone } from "@/lib/services/milestones"
import { format, isValid } from "date-fns"
import { MilestoneBadgeDisplay } from "@/components/milestone-celebration-modal"

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser, tokenBalance } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Form states
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [bio, setBio] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [occupation, setOccupation] = useState("")

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "")
      setLastName(user.last_name || "")
      setEmail(user.email || "")
      setBio(user.bio || "")
      setPhone(user.phone || "")
      setLocation(user.location || "")
      setOccupation(user.occupation || "")
    }
  }, [user])

  // Fetch enrollments with useQuery
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["myEnrollments"],
    queryFn: () => enrollmentsService.getUserEnrollments(),
    enabled: !!user,
  })

  // Fetch user milestones
  const { data: milestonesData, isLoading: milestonesLoading } = useQuery({
    queryKey: ["myMilestones"],
    queryFn: () => milestonesService.getMyMilestones(undefined, 1, 20),
    enabled: !!user,
  })

  const userMilestones = milestonesData?.items || []

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { first_name: string; last_name: string; bio: string; phone: string; location: string; occupation: string }) =>
      usersService.updateProfile(data),
    onSuccess: async (response) => {
      if (response.success) {
        await refreshUser()
        setMessage({ type: "success", text: "Profile updated successfully!" })
      } else {
        setMessage({ type: "error", text: response.error || "Failed to update profile" })
      }
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Failed to update profile" })
    },
  })

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    updateProfileMutation.mutate({ first_name: firstName, last_name: lastName, bio, phone, location, occupation })
  }

  const getUserInitials = () => {
    if (!user) return "U"
    const firstInitial = user.first_name?.[0] || ""
    const lastInitial = user.last_name?.[0] || ""
    return `${firstInitial}${lastInitial}`.toUpperCase() || "U"
  }

  const calculateProfileCompletion = () => {
    if (!user) return 0
    const fields = [
      user.first_name,
      user.last_name,
      user.bio,
      user.phone,
      user.location,
      user.occupation,
    ]
    const filledFields = fields.filter((field) => field && field.trim() !== "").length
    return Math.round((filledFields / fields.length) * 100)
  }

  // Safe date formatting helper
  const formatDate = (dateString: string | undefined | null, formatStr: string, fallback = "N/A") => {
    if (!dateString) return fallback
    const date = new Date(dateString)
    return isValid(date) ? format(date, formatStr) : fallback
  }

  if (authLoading || enrollmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>Please log in to view your profile.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const profileCompletion = calculateProfileCompletion()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatar_url || ""} alt={user.email} />
                <AvatarFallback className="text-2xl">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div>
                  <h1 className="text-3xl font-bold">
                    {user.first_name} {user.last_name}
                  </h1>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {user.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  {user.occupation && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{user.occupation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined{" "}
                      {formatDate(user.created_at, "MMMM yyyy", "Recently")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Profile Completion</span>
                    <span className="font-semibold">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant="secondary" className="justify-center">
                  {user.role}
                </Badge>
                {tokenBalance && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Token Balance</p>
                    <p className="text-2xl font-bold">{tokenBalance.balance}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {enrollments.filter((e) => e.progress_percentage === 100).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificates</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {enrollments.filter((e) => e.completion_date).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones Achievement Section */}
        {userMilestones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievements
              </CardTitle>
              <CardDescription>
                Milestones you've reached during your learning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {userMilestones.slice(0, 8).map((userMilestone) => (
                  userMilestone.milestone && (
                    <MilestoneBadgeDisplay
                      key={userMilestone.id}
                      milestone={userMilestone.milestone}
                      achievedAt={userMilestone.achieved_at}
                      size="large"
                    />
                  )
                ))}
              </div>
              {userMilestones.length > 8 && (
                <p className="text-sm text-muted-foreground mt-4">
                  +{userMilestones.length - 8} more achievements
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs Section */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Edit Profile</TabsTrigger>
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {message && (
                    <Alert variant={message.type === "error" ? "destructive" : "default"}>
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} disabled />
                    <p className="text-sm text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                      className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="Your current role or profession"
                    />
                  </div>

                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No courses enrolled yet</h3>
                    <p className="text-muted-foreground mt-2">
                      Start learning by enrolling in a course
                    </p>
                    <Button className="mt-4" asChild>
                      <a href="/courses">Browse Courses</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {enrollments.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{enrollment.course?.title || "Course"}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Enrolled on{" "}
                            {formatDate(enrollment.enrollment_date, "MMM dd, yyyy")}
                          </p>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span className="font-semibold">
                                {enrollment.progress_percentage}%
                              </span>
                            </div>
                            <Progress value={enrollment.progress_percentage} className="h-2" />
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {enrollment.completion_date && (
                            <Badge variant="secondary">
                              <Award className="h-3 w-3 mr-1" />
                              Certified
                            </Badge>
                          )}
                          <Button size="sm" asChild>
                            <a href={`/learn/${enrollment.course_id}`}>Continue</a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            {userMilestones.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Award className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No milestones achieved yet</h3>
                    <p className="text-muted-foreground mt-2">
                      Complete courses to earn milestone badges
                    </p>
                    <Button className="mt-4" asChild>
                      <a href="/courses">Start Learning</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {userMilestones.map((userMilestone) => (
                  <Card key={userMilestone.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        {userMilestone.milestone && (
                          <MilestoneBadgeDisplay
                            milestone={userMilestone.milestone}
                            achievedAt={userMilestone.achieved_at}
                            showDate={false}
                            size="large"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {userMilestone.milestone?.name || "Milestone"}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {userMilestone.milestone?.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="secondary">
                              {milestonesService.getRewardDescription(userMilestone.milestone!)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Achieved on {formatDate(userMilestone.achieved_at, "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {userMilestone.reward_claimed ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Reward Claimed
                            </Badge>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={async () => {
                                try {
                                  await milestonesService.claimMilestoneReward(userMilestone.milestone_id)
                                  // Refetch milestones
                                } catch (error) {
                                  console.error("Failed to claim reward:", error)
                                }
                              }}
                            >
                              Claim Reward
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Progress: {userMilestone.progress_at_achievement}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

