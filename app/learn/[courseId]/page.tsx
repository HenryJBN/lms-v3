"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle,
  Play,
  AlertCircle,
} from "lucide-react";
import VideoPlayer from "@/components/video-player";
import LessonQuiz from "@/components/lesson-quiz";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import {
  getCourseData,
  getUserProgress,
  markLessonAsCompleted,
  markQuizAsCompleted,
} from "@/lib/course-progress";

export default function CourseLessonPage({
  params,
}: {
  params: { courseId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.courseId;
  const lessonParam = searchParams.get("lesson");

  const [course, setCourse] = useState<any>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load course data and user progress
    const courseData = getCourseData(courseId);
    if (!courseData) {
      router.push("/learn");
      return;
    }

    const progress = getUserProgress(courseId);

    setCourse(courseData);
    setUserProgress(progress);

    // If there's a lesson ID in the URL, set the current lesson
    if (lessonParam) {
      const lessonIndex = courseData.lessons.findIndex(
        (lesson: any) => lesson.id === lessonParam
      );
      if (lessonIndex !== -1) {
        setCurrentLessonIndex(lessonIndex);
      }
    }

    setLoading(false);
  }, [courseId, lessonParam, router]);

  // Early return for loading state
  if (loading || !course || !userProgress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading course...
      </div>
    );
  }

  const currentLesson = course.lessons[currentLessonIndex];
  const nextLesson =
    currentLessonIndex < course.lessons.length - 1
      ? course.lessons[currentLessonIndex + 1]
      : null;
  const previousLesson =
    currentLessonIndex > 0 ? course.lessons[currentLessonIndex - 1] : null;

  const isLessonCompleted = userProgress.completedLessons.includes(
    currentLesson.id
  );
  const isQuizCompleted = currentLesson.hasQuiz
    ? userProgress.completedQuizzes.includes(currentLesson.id)
    : true;

  // Check if the current lesson is accessible (either no prerequisites or all prerequisites completed)
  const isLessonAccessible =
    !currentLesson.prerequisites ||
    currentLesson.prerequisites.every((prereqId: string) =>
      userProgress.completedLessons.includes(prereqId)
    );

  const handleVideoComplete = () => {
    setVideoCompleted(true);
    if (!isLessonCompleted) {
      const updatedProgress = markLessonAsCompleted(courseId, currentLesson.id);
      setUserProgress(updatedProgress);
    }

    // If the lesson has a quiz, show it after video completion
    if (currentLesson.hasQuiz && !isQuizCompleted) {
      setShowQuiz(true);
    }
  };

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      const updatedProgress = markQuizAsCompleted(courseId, currentLesson.id);
      setUserProgress(updatedProgress);
      setShowQuiz(false);
    }
  };

  const navigateToLesson = (index: number) => {
    // Check if the lesson is accessible
    const targetLesson = course.lessons[index];
    const isAccessible =
      !targetLesson.prerequisites ||
      targetLesson.prerequisites.every((prereqId: string) =>
        userProgress.completedLessons.includes(prereqId)
      );

    if (isAccessible) {
      setCurrentLessonIndex(index);
      setShowQuiz(false);
      setVideoCompleted(
        userProgress.completedLessons.includes(targetLesson.id)
      );
      router.push(`/learn/${courseId}?lesson=${targetLesson.id}`);
    }
  };

  const canNavigateToNext =
    nextLesson &&
    (!nextLesson.prerequisites ||
      nextLesson.prerequisites.every((prereqId: string) =>
        userProgress.completedLessons.includes(prereqId)
      ));

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <span>
              Lesson {currentLessonIndex + 1} of {course.lessons.length}
            </span>
            <Separator orientation="vertical" className="mx-2 h-4" />
            <span>
              {Math.round(
                (userProgress.completedLessons.length / course.lessons.length) *
                  100
              )}
              % Complete
            </span>
          </div>
          <Progress
            value={
              (userProgress.completedLessons.length / course.lessons.length) *
              100
            }
            className="h-2 mt-2"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-[3fr_1fr]">
          <div className="space-y-6">
            {!isLessonAccessible ? (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center text-destructive">
                    <Lock className="mr-2 h-5 w-5" />
                    Lesson Locked
                  </CardTitle>
                  <CardDescription>
                    You need to complete the prerequisite lessons before
                    accessing this content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h3 className="font-medium">Required Prerequisites:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {currentLesson.prerequisites?.map((prereqId: string) => {
                        const prereq = course.lessons.find(
                          (l: any) => l.id === prereqId
                        );
                        return (
                          <li key={prereqId} className="text-sm">
                            {prereq?.title}
                            {userProgress.completedLessons.includes(
                              prereqId
                            ) ? (
                              <CheckCircle className="inline ml-2 h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="inline ml-2 h-4 w-4 text-amber-500" />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : showQuiz ? (
              <LessonQuiz
                quiz={currentLesson.quiz}
                onComplete={handleQuizComplete}
              />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{currentLesson.title}</CardTitle>
                    <CardDescription>
                      {currentLesson.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoPlayer
                      videoUrl={currentLesson.videoUrl}
                      onComplete={handleVideoComplete}
                      isCompleted={isLessonCompleted}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => navigateToLesson(currentLessonIndex - 1)}
                      disabled={currentLessonIndex === 0}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous Lesson
                    </Button>

                    <Button
                      onClick={() => navigateToLesson(currentLessonIndex + 1)}
                      disabled={
                        !canNavigateToNext ||
                        (currentLesson.hasQuiz && !isQuizCompleted) ||
                        !videoCompleted
                      }
                    >
                      Next Lesson
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>

                {currentLesson.hasQuiz &&
                  !isQuizCompleted &&
                  videoCompleted && (
                    <Card className="border-red">
                      <CardHeader>
                        <CardTitle>Quiz Available</CardTitle>
                        <CardDescription>
                          You've completed the video lesson. Take the quiz to
                          test your knowledge.
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button onClick={() => setShowQuiz(true)}>
                          Start Quiz
                        </Button>
                      </CardFooter>
                    </Card>
                  )}
              </>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {course.lessons.map((lesson: any, index: number) => {
                    const isCompleted = userProgress.completedLessons.includes(
                      lesson.id
                    );
                    const hasCompletedQuiz = lesson.hasQuiz
                      ? userProgress.completedQuizzes.includes(lesson.id)
                      : true;
                    const isAccessible =
                      !lesson.prerequisites ||
                      lesson.prerequisites.every((prereqId: string) =>
                        userProgress.completedLessons.includes(prereqId)
                      );

                    return (
                      <div
                        key={lesson.id}
                        className={`p-2 rounded-md flex items-center cursor-pointer ${
                          currentLessonIndex === index ? "bg-muted" : ""
                        } ${!isAccessible ? "opacity-60" : ""}`}
                        onClick={() => isAccessible && navigateToLesson(index)}
                      >
                        <div className="mr-2 flex-shrink-0">
                          {isCompleted && hasCompletedQuiz ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : !isAccessible ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Play className="h-5 w-5 text-red" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.duration}{" "}
                            {lesson.hasQuiz && "• Includes Quiz"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
