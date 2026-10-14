import { describe, expect, it } from 'vitest';
import { tracks } from './lessons';
import { getNextLearningSteps } from './progression';

describe('learning progression', () => {
  it('continues in the current branch before offering related routes', () => {
    const track = tracks.find(item => item.id === 'algorithms')!;
    const ordered = track.modules.flatMap(module => module.lessons);
    const current = ordered[0];
    const steps = getNextLearningSteps(current, [current.id], tracks);

    expect(steps[0]?.lesson.id).toBe(ordered[1].id);
    expect(steps.slice(1).every(step => step.track.id !== track.id)).toBe(true);
  });

  it('offers other branches when the current path is complete', () => {
    const track = tracks.find(item => item.id === 'algorithms')!;
    const ordered = track.modules.flatMap(module => module.lessons);
    const current = ordered.at(-1)!;
    const steps = getNextLearningSteps(current, ordered.map(lesson => lesson.id), tracks);

    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every(step => step.track.id !== track.id)).toBe(true);
  });

  it('never recommends completed lessons', () => {
    const track = tracks.find(item => item.id === 'python')!;
    const ordered = track.modules.flatMap(module => module.lessons);
    const current = ordered[0];
    const steps = getNextLearningSteps(current, ordered.map(lesson => lesson.id), tracks);

    expect(steps.every(step => !ordered.some(lesson => lesson.id === step.lesson.id))).toBe(true);
  });
});
