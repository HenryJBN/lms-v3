"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { log } from "console";

// Make sure we're using consistent parameter names
export default function LessonPage({
  params,
}: {
  params: { courseId: string; lessonId: string };
}) {
  const router = useRouter();

  console.log("Course Params", params);
  const courseId = params.courseId;
  const lessonId = params.lessonId;

  useEffect(() => {
    // Redirect to the course page with the lesson ID in the URL
    router.replace(`/learn/${courseId}?lesson=${lessonId}`);
  }, [courseId, lessonId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      Loading lesson...
    </div>
  );
}
