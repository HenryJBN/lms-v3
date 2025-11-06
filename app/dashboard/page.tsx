"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BrainCircuit,
  ChevronRight,
  Clock,
  Gem,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Trophy,
  User,
} from "lucide-react";

import CourseCard from "@/components/course-card";
import TokenBalance from "@/components/token-balance";
import RecommendedCourses from "@/components/recommended-courses";
import LearningPathProgress from "@/components/learning-path-progress";
import { useAuth } from "@/lib/contexts/auth-context";
import { apiClient } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-config";

// Course type definition
interface Course {
  id: string;
  title: string;
  description: string;
  image?: string;
  progress: number;
  tokens: number;
  completed?: boolean;
}

export default function DashboardPage() {
  const { user, tokenBalance, isLoading } = useAuth();
  const [inProgressCourses, setInProgressCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<Course[]>([]);
  const [userProgress, setUserProgress] = useState<{
    lastAccessedLessonId?: string;
  }>({});

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [progressRes, inProgressRes, completedRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.userProgress),
        apiClient.get(API_ENDPOINTS.inProgressCourses),
        apiClient.get(API_ENDPOINTS.completedCourses),
      ]);

      setUserProgress(progressRes || {});
      setInProgressCourses(inProgressRes || []);
      setCompletedCourses(completedRes || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg font-semibold">You are not logged in.</p>
        <Link href="/login">
          <Button className="mt-4">Go to Login</Button>
        </Link>
      </div>
    );
  }

  const userProgressStats = {
    coursesCompleted: completedCourses.length,
    coursesInProgress: inProgressCourses.length,
    certificatesEarned: user?.certificates?.length || 0,
    tokensEarned: tokenBalance?.balance || 0,
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <GraduationCap className="h-6 w-6" />
            <span>DCA LMS</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-auto py-2 px-2 text-sm font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg bg-red/10 px-3 py-2 text-red transition-all"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/courses"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
          >
            <GraduationCap className="h-4 w-4" />
            My Courses
          </Link>
          <Link
            href="/certificates"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
          >
            <Trophy className="h-4 w-4" />
            Certificates
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>
        <div className="mt-auto p-4 border-t">
          <TokenBalance />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <TokenBalance />
            <Button variant="ghost" size="icon" className="rounded-full">
              <img
                src={user.avatar || "/placeholder.svg"}
                alt={user.first_name || "User"}
                className="rounded-full"
                width={32}
                height={32}
              />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <section className="grid flex-1 items-start gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 md:gap-8 md:p-6">
          <div className="grid auto-rows-max gap-4 lg:col-span-2">
            {/* Welcome Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>
                  Welcome back, {user.first_name || user.email}
                </CardTitle>
                <CardDescription>
                  Here's an overview of your learning progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard
                    icon={<GraduationCap className="h-6 w-6 text-red mb-1" />}
                    value={userProgressStats.coursesCompleted}
                    label="Completed"
                  />
                  <StatCard
                    icon={<Clock className="h-6 w-6 text-red mb-1" />}
                    value={userProgressStats.coursesInProgress}
                    label="In Progress"
                  />
                  <StatCard
                    icon={<Trophy className="h-6 w-6 text-red mb-1" />}
                    value={userProgressStats.certificatesEarned}
                    label="Certificates"
                  />
                  <StatCard
                    icon={<Gem className="h-6 w-6 text-red mb-1" />}
                    value={userProgressStats.tokensEarned}
                    label="L-Tokens"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full" asChild>
                  <Link
                    href={
                      userProgress.lastAccessedLessonId
                        ? `/learn/${
                            inProgressCourses[0]?.id || "default-course"
                          }?lesson=${userProgress.lastAccessedLessonId}`
                        : `/learn/${
                            inProgressCourses[0]?.id || "default-course"
                          }`
                    }
                  >
                    Continue Learning
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Courses Tabs */}
            <Tabs defaultValue="in-progress">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
                <Link
                  href="/courses"
                  className="text-sm text-red hover:underline"
                >
                  View All
                </Link>
              </div>

              <TabsContent value="in-progress" className="mt-4 space-y-4">
                {inProgressCourses.length > 0 ? (
                  inProgressCourses.map((course) => (
                    <CourseCard key={course.id} {...course} />
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No courses in progress.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-4 space-y-4">
                {completedCourses.length > 0 ? (
                  completedCourses.map((course) => (
                    <CourseCard key={course.id} {...course} completed />
                  ))
                ) : (
                  <p className="text-muted-foreground">No completed courses.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid auto-rows-max gap-4">
            {/* Learning Path */}
            <Card>
              <CardHeader>
                <CardTitle>Your Learning Path</CardTitle>
                <CardDescription>
                  Track your progress through your personalized path
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LearningPathProgress />
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full">
                  View Full Path
                </Button>
              </CardFooter>
            </Card>

            {/* Recommended Courses */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recommended For You</CardTitle>
                    <CardDescription>
                      Based on your learning history
                    </CardDescription>
                  </div>
                  <BrainCircuit className="h-4 w-4 text-red" />
                </div>
              </CardHeader>
              <CardContent>
                <RecommendedCourses />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-3">
      {icon}
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
