import { describe, expect, it } from 'vitest';
import { allExercises, lessons, tracks } from './lessons';
import { embeddedTasks, embeddedProjects, embeddedPrelude } from './embedded';

describe('local curriculum',()=>{
  it('seeds the requested track sizes with structured sections',()=>{
    const count=(id:string)=>tracks.find(track=>track.id===id)!.modules.flatMap(module=>module.lessons);
    expect(count('algorithms')).toHaveLength(10);
    expect(count('python')).toHaveLength(8);
    expect(count('c')).toHaveLength(8);
    expect(count('cpp')).toHaveLength(10);
    expect(count('embedded')).toHaveLength(10);
    for(const lesson of lessons){expect(lesson.sections.map(section=>section.type)).toContain('review');expect(lesson.sections.map(section=>section.type)).toContain('quiz');}
  });
  it('keeps lesson and exercise identifiers unique and executable tests present',()=>{
    expect(new Set(lessons.map(lesson=>lesson.id)).size).toBe(lessons.length);
    expect(new Set(allExercises.map(exercise=>exercise.id)).size).toBe(allExercises.length);
    for(const exercise of allExercises){expect(exercise.tests.length).toBeGreaterThanOrEqual(2);expect(exercise.tests.at(-1)?.hidden).toBe(true);expect(exercise.signature).toMatch(/array/);}
  });
  it('seeds ten embedded tasks and three mini projects with virtual I/O',()=>{
    expect(embeddedTasks).toHaveLength(10);expect(embeddedProjects).toHaveLength(3);
    expect(embeddedPrelude({button:true,pot:512,command:'STATUS'})).toContain('#define CB_POT 512');
    const button=embeddedTasks.find(task=>task.id==='button-led')!;
    expect(button.verify(['LED:13:1'],{button:true,pot:0,command:''})).toBe(true);
    expect(button.verify(['LED:13:0'],{button:true,pot:0,command:''})).toBe(false);
  });
});
