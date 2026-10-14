import type { LearningTrack, Lesson, TrackId } from '../types';

const branches: Record<TrackId, TrackId[]> = {
  algorithms: ['python', 'cpp'],
  python: ['algorithms', 'c'],
  c: ['embedded', 'cpp'],
  cpp: ['algorithms', 'c'],
  embedded: ['c', 'cpp'],
};

export type LearningStep = { lesson: Lesson; track: LearningTrack; reason: string };

/** Suggests the next uncompleted lesson on this path, then adjacent learning branches. */
export function getNextLearningSteps(current: Lesson, completed: string[], tracks: LearningTrack[]): LearningStep[] {
  const done = new Set(completed);
  const currentTrack = tracks.find(track => track.id === current.track);
  const ordered = currentTrack?.modules.flatMap(module => module.lessons) ?? [];
  const currentIndex = ordered.findIndex(lesson => lesson.id === current.id);
  const nextOnPath = ordered.slice(currentIndex + 1).find(lesson => !done.has(lesson.id));
  const steps: LearningStep[] = [];

  if (nextOnPath && currentTrack) {
    const sameModule = nextOnPath.module === current.module;
    steps.push({ lesson: nextOnPath, track: currentTrack, reason: sameModule ? 'Siguiente lección de esta rama' : 'Siguiente módulo de esta rama' });
  }

  for (const trackId of branches[current.track]) {
    const track = tracks.find(item => item.id === trackId);
    const lesson = track?.modules.flatMap(module => module.lessons).find(item => !done.has(item.id));
    if (track && lesson) steps.push({ lesson, track, reason: `Explora la rama ${track.title}` });
  }

  if (steps.length === 0) {
    const track = tracks.find(item => item.modules.some(module => module.lessons.some(lesson => !done.has(lesson.id))));
    const lesson = track?.modules.flatMap(module => module.lessons).find(item => !done.has(item.id));
    if (track && lesson) steps.push({ lesson, track, reason: 'Empieza otra ruta' });
  }
  return steps.slice(0, 3);
}
