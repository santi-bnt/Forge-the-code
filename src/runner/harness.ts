import type { Exercise, Language, TestCase } from '../types';

function cArray(values: number[]) { return `{${values.length ? values.join(',') : '0'}}`; }
function caseCode(exercise: Exercise, test: TestCase, index: number, language: Language): string {
  const parsed = JSON.parse(test.input) as number[] | [number[], number];
  const pair = exercise.signature === 'array-target';
  const nums = (pair ? (parsed as [number[], number])[0] : parsed) as number[];
  const target = pair ? (parsed as [number[], number])[1] : 0;
  if (language === 'c') {
    if (exercise.id === 'two-sum') return `int a${index}[]=${cArray(nums)}; int out${index}[2]={-1,-1}; solve(a${index},${nums.length},${target},out${index}); printf("[%d,%d]\\n",out${index}[0],out${index}[1]);`;
    return `int a${index}[]=${cArray(nums)}; printf("%d\\n",solve(a${index},${nums.length}${pair ? `,${target}` : ''}));`;
  }
  if (exercise.id === 'two-sum') return `auto r${index}=solve(vector<int>${cArray(nums)},${target}); cout << "[" << (r${index}.size()>0?r${index}[0]:-1) << "," << (r${index}.size()>1?r${index}[1]:-1) << "]\\n";`;
  return `cout << solve(vector<int>${cArray(nums)}${pair ? `,${target}` : ''}) << "\\n";`;
}
export function buildNativeSource(exercise: Exercise, code: string, language: 'c' | 'cpp', tests: TestCase[]): string {
  const main = tests.map((test, index) => caseCode(exercise, test, index, language)).join('\n');
  const headers = language === 'c' ? '#include <stdio.h>\n' : '#include <iostream>\nusing namespace std;\n';
  return `${headers}${code}\nint main(void) {\n${main}\nreturn 0;\n}\n`;
}
export function pythonTestScript(code: string, tests: TestCase[]) {
  const cases = tests.map(test => test.input);
  return `import json, io, contextlib, traceback\n${code}\n__cb_cases = ${JSON.stringify(cases)}\n__cb_results = []\nfor __cb_case in __cb_cases:\n    try:\n        __cb_args = json.loads(__cb_case)\n        if not isinstance(__cb_args, list): __cb_args = [__cb_args]\n        if len(__cb_args) == 2 and isinstance(__cb_args[0], list):\n            __cb_value = solve(*__cb_args)\n        else:\n            __cb_value = solve(__cb_args)\n        __cb_results.append({'received': json.dumps(__cb_value, separators=(',', ':'))})\n    except BaseException:\n        __cb_results.append({'error': traceback.format_exc()})\njson.dumps(__cb_results)\n`;
}
