import { describe, expect, it } from 'vitest';
import { allExercises } from '../content/lessons';
import { buildNativeSource, pythonTestScript } from './harness';

describe('exercise harness',()=>{
  it('wraps an array function in native C and C++ test calls',()=>{
    const exercise=allExercises.find(item=>item.id==='algorithms-array-sum')!;
    const c=buildNativeSource(exercise,exercise.starter.c,'c',exercise.tests.slice(0,1));
    const cpp=buildNativeSource(exercise,exercise.starter.cpp,'cpp',exercise.tests.slice(0,1));
    expect(c).toContain('#include <stdio.h>');expect(c).toContain('solve(a0,3)');
    expect(cpp).toContain('#include <iostream>');expect(cpp).toContain('solve(vector<int>{2,3,5})');
  });
  it('adapts array and target cases and serializes Python test inputs',()=>{
    const exercise=allExercises.find(item=>item.id==='algorithms-binary-find')!;
    expect(buildNativeSource(exercise,exercise.starter.c,'c',exercise.tests.slice(0,1))).toContain('solve(a0,4,5)');
    expect(pythonTestScript(exercise.starter.python,exercise.tests.slice(0,1))).toContain('[[1,3,5,7],5]');
  });
});
