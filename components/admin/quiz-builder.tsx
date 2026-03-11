"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  ChevronLeft, 
  Layout, 
  Settings, 
  ListChecks,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { QuizSchema, type Quiz, type QuizQuestion } from "@/lib/schemas/quiz"
import { quizService } from "@/lib/services/quiz"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Label } from "../ui/label"
import Link from "next/link"

interface QuizBuilderProps {
  lessonId: string
  initialQuiz?: any
  courseId?: string
}

export function QuizBuilder({ lessonId, initialQuiz, courseId }: QuizBuilderProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("settings")

  const form = useForm({
    resolver: zodResolver(QuizSchema),
    defaultValues: {
      title: initialQuiz?.title || "Lesson Quiz",
      description: initialQuiz?.description || "",
      instructions: initialQuiz?.instructions || "",
      time_limit: initialQuiz?.time_limit || 0,
      passing_score: initialQuiz?.passing_score || 70,
      max_attempts: initialQuiz?.max_attempts || 3,
      randomize_questions: initialQuiz?.randomize_questions || false,
      show_correct_answers: initialQuiz?.show_correct_answers || true,
      is_published: initialQuiz?.is_published || true,
    },
  })

  const [questions, setQuestions] = useState<any[]>(initialQuiz?.questions || [])

  const handleSaveSettings = async (values: any) => {
    setIsSaving(true)
    try {
      if (initialQuiz?.id) {
        await quizService.updateQuiz(lessonId, initialQuiz.id, values)
        toast({ title: "Settings Saved", description: "Quiz settings updated successfully." })
      } else {
        const newQuiz = await quizService.createQuiz(lessonId, values)
        toast({ title: "Quiz Created", description: "Quiz created successfully." })
        window.location.reload()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save quiz settings.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddQuestion = () => {
    const newQuestion = {
      question: "",
      type: "multiple_choice",
      options: { choices: ["Option 1", "Option 2"] },
      correct_answer: "Option 1",
      explanation: "",
      points: 1,
      sort_order: questions.length,
    }
    setQuestions([...questions, newQuestion])
  }

  const handleUpdateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setQuestions(newQuestions)
  }

  const handleUpdateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions]
    const choices = [...newQuestions[qIndex].options.choices]
    const oldVal = choices[oIndex]
    choices[oIndex] = value
    newQuestions[qIndex].options = { ...newQuestions[qIndex].options, choices }
    if (newQuestions[qIndex].correct_answer === oldVal) {
      newQuestions[qIndex].correct_answer = value
    }
    setQuestions(newQuestions)
  }

  const handleAddOption = (qIndex: number) => {
    const newQuestions = [...questions]
    const choices = [...newQuestions[qIndex].options.choices, `Option ${newQuestions[qIndex].options.choices.length + 1}`]
    newQuestions[qIndex].options = { ...newQuestions[qIndex].options, choices }
    setQuestions(newQuestions)
  }

  const handleRemoveOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions]
    const choices = newQuestions[qIndex].options.choices.filter((_: any, i: number) => i !== oIndex)
    newQuestions[qIndex].options = { ...newQuestions[qIndex].options, choices }
    setQuestions(newQuestions)
  }

  const handleSaveQuestions = async () => {
    if (!initialQuiz?.id) {
      toast({ title: "Action Required", description: "Please save settings first to create the quiz.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      for (const question of questions) {
        if (question.id) {
          await quizService.updateQuestion(lessonId, initialQuiz.id, question.id, question)
        } else {
          await quizService.createQuestion(lessonId, initialQuiz.id, question)
        }
      }
      toast({ title: "Questions Saved", description: "Quiz questions synchronized successfully." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save questions.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuestion = async (index: number) => {
    const question = questions[index]
    if (question.id) {
      if (!confirm("Are you sure you want to delete this question?")) return
      try {
        await quizService.deleteQuestion(lessonId, initialQuiz.id, question.id)
        toast({ title: "Question Removed" })
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete question.", variant: "destructive" })
        return
      }
    }
    setQuestions(questions.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <Link href={"/admin/courses/lessons"} className="text-sm text-primary flex items-center hover:underline mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Lessons
          </Link>
          <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-lg">
                <Layout className="h-6 w-6 text-primary" />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight">Quiz Management</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Design interactive assessments to validate student learning progress and award rewards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={activeTab === "settings" ? form.handleSubmit(handleSaveSettings) : handleSaveQuestions} disabled={isSaving} className="shadow-lg shadow-primary/20 px-6">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {activeTab === "settings" ? "Save Settings" : "Save All Questions"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-8 py-2.5">
            <Settings className="h-4 w-4 mr-2" />
            General Settings
          </TabsTrigger>
          <TabsTrigger value="questions" disabled={!initialQuiz?.id} className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-8 py-2.5">
            <ListChecks className="h-4 w-4 mr-2" />
            Quiz Questions
            {questions.length > 0 && <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">{questions.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="border-none shadow-xl bg-gradient-to-br from-background to-muted/30">
            <CardHeader>
              <CardTitle>Core Configuration</CardTitle>
              <CardDescription>Setup the fundamental rules and metadata for your assessment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Quiz Title</FormLabel>
                          <FormControl>
                            <Input placeholder="E.g. Final Module Assessment" className="h-12 text-lg focus-visible:ring-primary/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passing_score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Passing Threshold (%)</FormLabel>
                          <FormControl>
                            <Input type="number" className="h-12 focus-visible:ring-primary/30" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormDescription>Minimum percentage required to consider the lesson completed.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Instructions for Students</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Explain what students should focus on or any rules for this quiz..." className="min-h-[120px] resize-none focus-visible:ring-primary/30" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-6 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="max_attempts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold flex items-center">
                            Maximum Attempts
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>How many times a student can retake the quiz.</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input type="number" className="h-11 border-muted-foreground/20" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time_limit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Time Limit (mins)</FormLabel>
                          <FormControl>
                            <Input type="number" className="h-11 border-muted-foreground/20" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormDescription>Set to 0 for unlimited time.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_published"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 border-primary/5 bg-primary/5 px-4 py-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-bold text-primary">Live Status</FormLabel>
                            <FormDescription className="text-primary/70">Visible to students</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="randomize_questions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-semibold">Randomize Order</FormLabel>
                            <FormDescription>Shuffle questions for each student.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="show_correct_answers"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-semibold">Instant Feedback</FormLabel>
                            <FormDescription>Show correct answers after submission.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          {questions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
              <div className="bg-background p-4 rounded-2xl shadow-sm mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">No questions yet</h3>
              <p className="text-muted-foreground mt-2 mb-6">Start by adding your first question to the quiz.</p>
              <Button onClick={handleAddQuestion} size="lg" className="rounded-full px-8">
                Add First Question
              </Button>
            </div>
          )}

          {questions.map((q, qIndex) => (
            <Card key={qIndex} className="group border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-r from-background to-muted/20">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20">
                    {qIndex + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Question Detail</CardTitle>
                    <CardDescription>Points: {q.points || 1}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteQuestion(qIndex)} title="Delete Question">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                   <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The Question</Label>
                   <Textarea
                    placeholder="Enter your question here..."
                    value={q.question}
                    onChange={e => handleUpdateQuestion(qIndex, "question", e.target.value)}
                    className="min-h-[100px] text-lg font-medium border-muted-foreground/20 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Options & Correct Answer</Label>
                    <span className="text-[10px] text-muted-foreground italic">Toggle circle to select correct answer</span>
                  </div>
                  <div className="grid gap-3">
                    {q.options.choices.map((opt: string, oIndex: number) => (
                      <div key={oIndex} className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`rounded-full transition-all ${q.correct_answer === opt && opt !== "" ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          onClick={() => handleUpdateQuestion(qIndex, "correct_answer", opt)}
                        >
                          {q.correct_answer === opt && opt !== "" ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                        </Button>
                        <Input
                          placeholder={`Enter option ${oIndex + 1}...`}
                          value={opt}
                          onChange={e => handleUpdateOption(qIndex, oIndex, e.target.value)}
                          className={`h-11 transition-colors ${q.correct_answer === opt && opt !== "" ? "border-green-300 ring-2 ring-green-100 bg-green-50/30" : "border-muted-foreground/20"}`}
                        />
                        <Button variant="ghost" size="icon" className="bg-muted/30 hover:bg-destructive/10 hover:text-destructive text-muted-foreground opacity-20 group-hover:opacity-100 transition-all rounded-lg h-11 w-11" onClick={() => handleRemoveOption(qIndex, oIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="mt-2 w-full border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 rounded-xl h-12" onClick={() => handleAddOption(qIndex)}>
                      <Plus className="mr-2 h-4 w-4" /> Add Another Option
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 pt-6 md:grid-cols-2 border-t border-muted-foreground/10">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Weight (Points)</Label>
                    <Input type="number" className="h-10 border-muted-foreground/20" value={q.points || 1} onChange={e => handleUpdateQuestion(qIndex, "points", parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Educational Explanation</Label>
                    <Input placeholder="Why is this the correct answer?" className="h-10 border-muted-foreground/20" value={q.explanation || ""} onChange={e => handleUpdateQuestion(qIndex, "explanation", e.target.value)} />
                    <p className="text-[10px] text-muted-foreground">Visible to students after they submit their answer.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {questions.length > 0 && (
            <div className="flex flex-col gap-4">
              <Button variant="outline" className="w-full h-20 border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-3xl group" onClick={handleAddQuestion}>
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-bold text-primary">Add Another Question</span>
                </div>
              </Button>
              
              <div className="bg-indigo-600/5 p-6 rounded-3xl border border-indigo-600/10 flex items-center justify-between mt-8">
                <div className="flex items-center gap-4">
                   <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-600/20">
                     <Save className="h-6 w-6" />
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-indigo-900">Synchronize Draft</h3>
                     <p className="text-sm text-indigo-600/80">Save all changes made to the questions.</p>
                   </div>
                </div>
                <Button onClick={handleSaveQuestions} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 px-10 h-12 rounded-2xl">
                   {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
