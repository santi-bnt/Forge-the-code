export type Language = 'python' | 'c' | 'cpp';
export type TrackId = 'algorithms' | 'python' | 'c' | 'cpp' | 'embedded';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type TestCase = { input: string; expected: string; hidden?: boolean; timeout?: number };
export type Exercise = {
  id: string; title: string; difficulty: 'Easy' | 'Medium'; description: string;
  examples: string[]; constraints: string[]; starter: Record<Language, string>;
  solutions: Record<Language, string>; tests: TestCase[]; hints: string[];
  explanation: string; complexity: { time: string; space: string };
  signature?: 'array' | 'array-target';
};

export type LessonSection =
  | { type: 'text'; title: string; body: string }
  | { type: 'code'; title: string; code: Partial<Record<Language, string>> }
  | { type: 'visualization'; title: string; visual: 'binary-search' | 'stack' | 'queue' | 'linked-list' | 'tree' | 'memory' | 'binary-hex' | 'register' }
  | { type: 'quiz'; title: string; question: string; options: string[]; answer: number; explanation: string }
  | { type: 'tip' | 'warning'; title: string; body: string }
  | { type: 'review'; title: string; points: string[] };

export type Lesson = {
  id: string; track: TrackId; module: string; title: string; topic: string;
  difficulty: Difficulty; summary: string; sections: LessonSection[];
  exercises: Exercise[]; keywords: string[];
};
export type TrackModule = { id: string; title: string; lessons: Lesson[] };
export type LearningTrack = { id: TrackId; title: string; description: string; accent: string; modules: TrackModule[] };

export type TestResult = { passed: boolean; expected: string; received: string; input: string; hidden?: boolean; error?: string };
export type RunResult = { results: TestResult[]; stdout: string; error?: string; durationMs: number };
export type AttemptStats = { runs: number; submits: number; failedSubmits: number; hintsUsed: number; solutionViewed: boolean; lastAttempt?: string; solvedAt?: string };
export type Settings = { theme: 'dark' | 'light'; preferredLanguage: Language };
export type Progress = {
  completedLessons: string[]; solvedExercises: string[]; attempts: Record<string, AttemptStats>;
  drafts: Record<string, string>; bookmarks: string[]; notes: Record<string, string>;
  lastLesson?: string; lastTrack: TrackId; lastActivity?: string; streak: number;
  activeDays: string[]; language: Language; timeMinutes: number; settings: Settings;
};
export type Backup = { format: 'codebook-backup'; version: 2; exportedAt: string; data: Progress };
export type ImportMode = 'merge' | 'replace';
