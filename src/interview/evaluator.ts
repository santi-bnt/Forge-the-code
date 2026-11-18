import type { RunResult, TestCase } from '../types';

export type PythonCase = { received?: string; error?: string };

export function equalOutput(received: string, expected: string): boolean {
  try {
    const compare = (actual: unknown, target: unknown): boolean => {
      if (actual === target) return true;
      if (Array.isArray(actual) && Array.isArray(target)) {
        return actual.length === target.length && actual.every((item, index) => compare(item, target[index]));
      }
      if (actual && target && typeof actual === 'object' && typeof target === 'object'
        && !Array.isArray(actual) && !Array.isArray(target)) {
        const actualObject = actual as Record<string, unknown>;
        const targetObject = target as Record<string, unknown>;
        return Object.keys(actualObject).length === Object.keys(targetObject).length
          && Object.keys(targetObject).every(key => Object.hasOwn(actualObject, key) && compare(actualObject[key], targetObject[key]));
      }
      return false;
    };
    return compare(JSON.parse(received), JSON.parse(expected));
  } catch {
    return false;
  }
}

export function interviewScript(code: string, tests: TestCase[]) {
  const inputs = JSON.stringify(tests.map(test => JSON.parse(test.input)));
  return `import json, traceback
_forge_cases = json.loads(${JSON.stringify(inputs)})
_forge_namespace = {"__name__": "__main__"}
exec(compile(${JSON.stringify(code)}, "main.py", "exec"), _forge_namespace)
_forge_solve = _forge_namespace.get("solve")
if not callable(_forge_solve):
    raise TypeError("Define a callable solve function in main.py.")
_forge_results = []
for _forge_args in _forge_cases:
    try:
        _forge_value = _forge_solve(*_forge_args)
        _forge_results.append({"received": json.dumps(_forge_value, allow_nan=False, separators=(",", ":"))[:4096]})
    except BaseException:
        _forge_results.append({"error": traceback.format_exc()[-3000:]})
json.dumps(_forge_results)
`;
}

export function compareCases(tests: TestCase[], values: PythonCase[]): RunResult['results'] {
  return tests.map(({ input, expected, hidden }, index) => {
    const { received, error } = values[index] ?? { error: 'Python returned no result for this case.' };
    return { input, expected, hidden, received: received ?? '', error, passed: !error && received !== undefined && equalOutput(received, expected) };
  });
}
