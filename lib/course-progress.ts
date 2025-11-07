// This is a mock implementation using localStorage
// In a real application, this would be connected to a database

interface Lesson {
  id: string
  title: string
  description: string
  videoUrl: string
  duration: string
  hasQuiz: boolean
  quiz?: any
  prerequisites?: string[]
}

interface Course {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

interface UserProgress {
  courseId: string
  completedLessons: string[]
  completedQuizzes: string[]
  lastAccessedLessonId?: string
}

// Mock course data
const coursesData: Record<string, Course> = {
  "web-development": {
    id: "web-development",
    title: "Web Development Fundamentals",
    description: "Learn the basics of web development with HTML, CSS, and JavaScript",
    lessons: [
      {
        id: "intro-to-html",
        title: "Introduction to HTML",
        description: "Learn the basics of HTML structure, tags, and elements",
        videoUrl: "https://www.youtube.com/embed/qz0aGYrrlhU",
        duration: "15 min",
        hasQuiz: true,
        quiz: {
          title: "HTML Basics Quiz",
          description: "Test your knowledge of HTML fundamentals",
          questions: [
            {
              id: "html-q1",
              question: "What does HTML stand for?",
              options: [
                "Hyper Text Markup Language",
                "High Tech Modern Language",
                "Hyperlink and Text Markup Language",
                "Home Tool Markup Language",
              ],
              correctAnswer: 0,
              explanation:
                "HTML stands for Hyper Text Markup Language, which is the standard markup language for creating web pages.",
            },
            {
              id: "html-q2",
              question: "Which tag is used to create a paragraph in HTML?",
              options: ["<paragraph>", "<p>", "<para>", "<text>"],
              correctAnswer: 1,
              explanation: "The <p> tag defines a paragraph in HTML.",
            },
            {
              id: "html-q3",
              question: "Which HTML element is used to define the title of a document?",
              options: ["<head>", "<title>", "<header>", "<meta>"],
              correctAnswer: 1,
              explanation:
                "The <title> tag defines the title of the document, which appears in the browser's title bar or tab.",
            },
          ],
          passingScore: 70,
        },
      },
      {
        id: "css-basics",
        title: "CSS Basics",
        description: "Learn how to style your HTML with CSS",
        videoUrl: "https://www.youtube.com/embed/1PnVor36_40",
        duration: "20 min",
        hasQuiz: true,
        prerequisites: ["intro-to-html"],
        quiz: {
          title: "CSS Basics Quiz",
          description: "Test your knowledge of CSS fundamentals",
          questions: [
            {
              id: "css-q1",
              question: "What does CSS stand for?",
              options: [
                "Cascading Style Sheets",
                "Creative Style Sheets",
                "Computer Style Sheets",
                "Colorful Style Sheets",
              ],
              correctAnswer: 0,
              explanation:
                "CSS stands for Cascading Style Sheets, which is used to style HTML elements.",
            },
            {
              id: "css-q2",
              question: "Which property is used to change the background color?",
              options: ["color", "bgcolor", "background-color", "background"],
              correctAnswer: 2,
              explanation:
                "The background-color property is used to set the background color of an element.",
            },
          ],
          passingScore: 70,
        },
      },
      {
        id: "javascript-intro",
        title: "Introduction to JavaScript",
        description: "Learn the basics of JavaScript programming",
        videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk",
        duration: "25 min",
        hasQuiz: true,
        prerequisites: ["intro-to-html", "css-basics"],
        quiz: {
          title: "JavaScript Basics Quiz",
          description: "Test your knowledge of JavaScript fundamentals",
          questions: [
            {
              id: "js-q1",
              question:
                "Which of the following is a correct way to declare a variable in JavaScript?",
              options: ["var myVar = 5;", "variable myVar = 5;", "v myVar = 5;", "int myVar = 5;"],
              correctAnswer: 0,
              explanation:
                "In JavaScript, variables can be declared using var, let, or const keywords.",
            },
            {
              id: "js-q2",
              question: 'What will console.log(2 + "2") output?',
              options: ["4", '"22"', "22", "Error"],
              correctAnswer: 2,
              explanation:
                "In JavaScript, when you add a number and a string, the number is converted to a string and concatenated.",
            },
          ],
          passingScore: 70,
        },
      },
      {
        id: "responsive-design",
        title: "Responsive Web Design",
        description: "Learn how to make your websites responsive",
        videoUrl: "https://www.youtube.com/embed/srvUrASNj0s",
        duration: "30 min",
        hasQuiz: false,
        prerequisites: ["intro-to-html", "css-basics"],
      },
      {
        id: "javascript-dom",
        title: "JavaScript DOM Manipulation",
        description: "Learn how to manipulate the DOM with JavaScript",
        videoUrl: "https://www.youtube.com/embed/y17RuWkWdn8",
        duration: "35 min",
        hasQuiz: true,
        prerequisites: ["javascript-intro"],
        quiz: {
          title: "DOM Manipulation Quiz",
          description: "Test your knowledge of DOM manipulation with JavaScript",
          questions: [
            {
              id: "dom-q1",
              question: "Which method is used to select an element by its id?",
              options: [
                "document.querySelector()",
                "document.getElementById()",
                "document.getElementByName()",
                "document.selectElement()",
              ],
              correctAnswer: 1,
              explanation: "The getElementById() method returns the element with the specified ID.",
            },
            {
              id: "dom-q2",
              question: "What does DOM stand for?",
              options: [
                "Document Object Model",
                "Data Object Model",
                "Document Oriented Model",
                "Digital Object Model",
              ],
              correctAnswer: 0,
              explanation:
                "DOM stands for Document Object Model, which is a programming interface for web documents.",
            },
          ],
          passingScore: 70,
        },
      },
    ],
  },
  "data-science": {
    id: "data-science",
    title: "Introduction to Data Science",
    description: "Learn the fundamentals of data science and analysis",
    lessons: [
      {
        id: "data-science-intro",
        title: "Introduction to Data Science",
        description: "Overview of data science concepts and applications",
        videoUrl: "https://www.youtube.com/embed/X3paOmcrTjQ",
        duration: "20 min",
        hasQuiz: true,
        quiz: {
          title: "Data Science Intro Quiz",
          description: "Test your understanding of data science concepts",
          questions: [
            {
              id: "ds-q1",
              question: "What is data science?",
              options: [
                "The study of database systems",
                "A field that uses scientific methods, processes, algorithms and systems to extract knowledge from data",
                "The science of creating data visualizations",
                "A branch of computer science focused on data storage",
              ],
              correctAnswer: 1,
              explanation:
                "Data science is an interdisciplinary field that uses scientific methods, processes, algorithms and systems to extract knowledge and insights from structured and unstructured data.",
            },
          ],
          passingScore: 70,
        },
      },
      {
        id: "python-basics",
        title: "Python Basics for Data Science",
        description: "Learn the fundamentals of Python programming for data analysis",
        videoUrl: "https://www.youtube.com/embed/rfscVS0vtbw",
        duration: "30 min",
        hasQuiz: true,
        prerequisites: ["data-science-intro"],
        quiz: {
          title: "Python Basics Quiz",
          description: "Test your knowledge of Python fundamentals",
          questions: [
            {
              id: "py-q1",
              question: "Which of the following is a correct way to create a list in Python?",
              options: [
                "list = (1, 2, 3)",
                "list = [1, 2, 3]",
                "list = {1, 2, 3}",
                "list = <1, 2, 3>",
              ],
              correctAnswer: 1,
              explanation: "In Python, lists are created using square brackets [].",
            },
          ],
          passingScore: 70,
        },
      },
    ],
  },
}

// Get course data
export function getCourseData(courseId: string): Course | null {
  // In a real app, this would fetch from an API
  return coursesData[courseId] || null
}

// Get user progress
export function getUserProgress(courseId: string): UserProgress {
  // In a real app, this would fetch from an API or database
  if (typeof window === "undefined") {
    // Return default progress when running on the server
    return {
      courseId,
      completedLessons: [],
      completedQuizzes: [],
    }
  }

  const storageKey = `course_progress_${courseId}`
  const storedProgress = localStorage.getItem(storageKey)

  if (storedProgress) {
    return JSON.parse(storedProgress)
  }

  // Initialize empty progress if none exists
  const newProgress: UserProgress = {
    courseId,
    completedLessons: [],
    completedQuizzes: [],
  }

  localStorage.setItem(storageKey, JSON.stringify(newProgress))

  return newProgress
}

// Mark a lesson as completed
export function markLessonAsCompleted(courseId: string, lessonId: string): UserProgress {
  if (typeof window === "undefined") {
    // Return default progress when running on the server
    return {
      courseId,
      completedLessons: [lessonId],
      completedQuizzes: [],
    }
  }

  const progress = getUserProgress(courseId)

  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId)
    progress.lastAccessedLessonId = lessonId

    localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(progress))
  }

  return progress
}

// Mark a quiz as completed
export function markQuizAsCompleted(courseId: string, lessonId: string): UserProgress {
  if (typeof window === "undefined") {
    // Return default progress when running on the server
    return {
      courseId,
      completedLessons: [],
      completedQuizzes: [lessonId],
    }
  }

  const progress = getUserProgress(courseId)

  if (!progress.completedQuizzes.includes(lessonId)) {
    progress.completedQuizzes.push(lessonId)

    localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(progress))
  }

  return progress
}

// Reset user progress (for testing)
export function resetUserProgress(courseId: string): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(`course_progress_${courseId}`)
  }
}
