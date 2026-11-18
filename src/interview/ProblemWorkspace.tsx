import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play, Send } from 'lucide-react';
import { CodeEditor } from '../components/CodeEditor';
import { runInWorker } from '../runner';
import type { RunResult } from '../types';
import type { InterviewProblem } from './problems';
import { draftKey, mockDeadline, type Attempt, type InterviewProgress, type Mock } from './progress';

export type UpdateInterview = (change: (value: InterviewProgress) => InterviewProgress) => void;

export function ProblemWorkspace({ problem, progress, update, dark, mock, onBack }: {
  problem: InterviewProblem; progress: InterviewProgress; update: UpdateInterview; dark: boolean; mock?: Mock; onBack: () => void;
}) {
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<RunResult>();
  const running = useRef<AbortController | null>(null);
  const updateRef = useRef(update);
  useEffect(() => { updateRef.current = update; }, [update]);
  const key = draftKey(problem.id, mock?.id);
  const code = progress.drafts[key]?.code ?? problem.starter;
  const latest = Object.values(progress.attempts).filter(attempt => attempt.problemId === problem.id && attempt.mockId === mock?.id)
    .reduce<Attempt | undefined>((best, attempt) => !best || best.at < attempt.at ? attempt : best, undefined);

  useEffect(() => {
    const deadline = mock ? mockDeadline(mock) : Infinity;
    const isVisible = () => document.visibilityState === 'visible' && document.hasFocus();
    let started = isVisible() ? Date.now() : undefined;
    function checkpoint() {
      const now = Math.min(Date.now(), deadline);
      if (started !== undefined && now > started) {
        const entry = { problemId: problem.id, ms: now - started };
        const id = crypto.randomUUID();
        updateRef.current(value => ({ ...value, study: { ...value.study, [id]: entry } }));
      }
      started = isVisible() && now < deadline ? now : undefined;
    }
    const timer = window.setInterval(checkpoint, 20_000);
    document.addEventListener('visibilitychange', checkpoint);
    window.addEventListener('focus', checkpoint);
    window.addEventListener('blur', checkpoint);
    window.addEventListener('pagehide', checkpoint);
    return () => {
      checkpoint();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkpoint);
      window.removeEventListener('focus', checkpoint);
      window.removeEventListener('blur', checkpoint);
      window.removeEventListener('pagehide', checkpoint);
      running.current?.abort();
    };
  }, [problem.id, mock]);

  async function execute(kind: Attempt['kind']) {
    if (running.current || (mock && Date.now() >= mockDeadline(mock))) return;
    const controller = new AbortController();
    running.current = controller;
    setStatus('Preparando Python…');
    const tests = problem.tests.filter(test => kind === 'submit' || !test.hidden);
    let outcome: RunResult;
    try {
      const response = await runInWorker({ kind: 'interview', code, tests }, setStatus, controller.signal);
      outcome = response.result ?? { results: [], stdout: '', durationMs: 0, error: response.error ?? 'El evaluador no devolvió un resultado.' };
    } catch (error) {
      outcome = { results: [], stdout: '', durationMs: 0, error: String(error) };
    }
    running.current = null;
    if (controller.signal.aborted) return;
    setStatus('');
    if (mock && Date.now() >= mockDeadline(mock)) return;
    setResult(outcome);
    const attempt: Attempt = {
      id: crypto.randomUUID(), problemId: problem.id, mockId: mock?.id, at: Date.now(), kind, result: outcome,
      success: !outcome.error && outcome.results.length === tests.length && outcome.results.every(test => test.passed),
    };
    update(value => {
      const currentMock = mock && value.mocks[mock.id];
      if (mock && (!currentMock || currentMock.finishedAt !== undefined || attempt.at >= mockDeadline(currentMock))) return value;
      return { ...value, attempts: { ...value.attempts, [attempt.id]: attempt } };
    });
  }

  return <section className="interview-workspace">
    {!mock && <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Biblioteca</button>}
    <div className="interview-split">
      <section className="panel interview-card">
        <span className="card-kicker">{problem.topic} · {problem.difficulty}</span>
        <h1>{problem.title}</h1>
        <p>{problem.description}</p>
        <h2>Ejemplos</h2>
        {problem.tests.filter(test => !test.hidden).map(test => <pre key={test.input}>{`solve(*${test.input})\n→ ${test.expected}`}</pre>)}
        <h2>Restricciones</h2>
        <p>{problem.constraints}</p>
        {!mock && <>
          <h2>Pistas</h2>
          {problem.hints.slice(0, hints).map((hint, index) => <p key={hint}><strong>Pista {index + 1}.</strong> {hint}</p>)}
          {hints < problem.hints.length && <button className="button secondary" onClick={() => setHints(hints + 1)}>Mostrar pista {hints + 1}</button>}
          <button className="button secondary" onClick={() => setShowSolution(!showSolution)} aria-expanded={showSolution}>{showSolution ? 'Ocultar solución' : 'Ver solución'}</button>
          {showSolution && <ReferenceSolution problem={problem}/>}
        </>}
      </section>
      <div className="interview-editor">
        <CodeEditor code={code} dark={dark} language="python" onChange={next => {
          const draft = { code: next, updatedAt: Date.now() };
          update(value => ({ ...value, drafts: { ...value.drafts, [key]: draft } }));
        }}/>
        <div className="interview-actions">
          {status && <button className="button secondary" onClick={() => { running.current?.abort(); setStatus(''); }}>Detener ejecución</button>}
          <button className="button secondary" disabled={Boolean(status)} onClick={() => void execute('run')}><Play size={16}/> Run Code</button>
          <button className="button primary" disabled={Boolean(status)} onClick={() => void execute('submit')}><Send size={16}/> Submit</button>
        </div>
        <div className="panel interview-card" aria-live="polite">
          <h2>Resultados</h2>
          {status ? <p role="status">{status}</p> : <ExecutionResults result={result ?? latest?.result}/>}
        </div>
      </div>
    </div>
  </section>;
}

export function ReferenceSolution({ problem }: { problem: InterviewProblem }) {
  return <div className="interview-reference">
    <pre><code>{problem.solution}</code></pre>
    <dl className="interview-analysis">
      <dt>Time Complexity</dt><dd>{problem.time}</dd>
      <dt>Space Complexity</dt><dd>{problem.space}</dd>
      <dt>Casos límite</dt><dd>{problem.edges}</dd>
      <dt>Optimización</dt><dd>{problem.optimization}</dd>
    </dl>
  </div>;
}

export function ExecutionResults({ result }: { result?: RunResult }) {
  if (!result) return <p>Run Code ejecuta los casos visibles. Submit añade los casos de validación.</p>;
  const publicTests = result.results.filter(test => !test.hidden);
  const validation = result.results.filter(test => test.hidden);
  const count = (tests: RunResult['results']) => `${tests.filter(test => test.passed).length}/${tests.length}`;
  return <>
    {result.error && <pre role="alert">{result.error}</pre>}
    {result.results.length > 0 && <p>Visibles {count(publicTests)} · {validation.length > 0 && `Validación ${count(validation)} · `}{result.durationMs} ms</p>}
    {publicTests.map((test, index) => <details key={index} open={!test.passed}>
      <summary>Caso {index + 1} · {test.passed ? 'Superado' : 'Fallido'}</summary>
      <pre>{`Argumentos: ${test.input}\nEsperado: ${test.expected}\n${test.error ?? `Recibido: ${test.received}`}`}</pre>
    </details>)}
    {validation.length > 0 && <ul className="interview-test-list">{validation.map((test, index) => <li key={index}>Validación {index + 1} · {test.passed ? 'Superado' : test.error ? 'Error de Python' : 'Fallido'}</li>)}</ul>}
    {result.stdout && <><h3>stdout</h3><pre>{result.stdout}</pre></>}
  </>;
}
