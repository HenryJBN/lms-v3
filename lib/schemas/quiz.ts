import { z } from "zod"

export const QuizQuestionTypeSchema = z.enum(["multiple_choice", "true_false", "short_answer"])

export const QuizQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().min(1, "Question text is required"),
  type: QuizQuestionTypeSchema.default("multiple_choice"),
  options: z.record(z.any()).optional().nullable(),
  correct_answer: z.string().min(1, "Correct answer is required"),
  explanation: z.string().optional().nullable(),
  points: z.number().int().min(1).default(1),
  sort_order: z.number().int().default(0),
})

export const QuizSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  time_limit: z.number().int().min(0).optional().nullable(),
  passing_score: z.number().int().min(0).max(100).default(70),
  max_attempts: z.number().int().min(1).default(3),
  randomize_questions: z.boolean().default(false),
  show_correct_answers: z.boolean().default(true),
  is_published: z.boolean().default(true),
})

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>
export type Quiz = z.infer<typeof QuizSchema>

export const QuizCreateSchema = QuizSchema.extend({
  questions: z.array(QuizQuestionSchema).optional(),
})

export const QuizUpdateSchema = QuizSchema.partial()

export const QuizQuestionCreateSchema = QuizQuestionSchema.omit({ id: true })
export const QuizQuestionUpdateSchema = QuizQuestionSchema.partial()
