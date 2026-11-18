import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, Clock, ListChecks, Timer } from 'lucide-react';
import { problemById, problems, topics, type InterviewProblem } from './problems';
import {
  createMock, finishMock, mockAttempts, passedSubmission, remainingTime, summarize,
  type Attempt, type InterviewProgress, type Mock,
} from './progress';
import { ExecutionResults, ProblemWorkspace, ReferenceSolution, type UpdateInterview } from './ProblemWorkspace';
import './interview.css';

const sections = [
  ['dashboard', 'Dashboard'], ['plan', 'Plan de 4 días'], ['library', 'Biblioteca'], ['history', 'Historial'],
] as const;
type View = (typeof sections)[number][0] | 'problem' | 'mock';
const days = [
  { day: 1, title: 'Fundamentos', topics: 'Arrays, Strings, Hash Maps, Sets y Big O', focus: 'Antes de programar, estima cuántas veces recorrerás la entrada y cuánta memoria auxiliar necesitas.' },
  { day: 2, title: 'Búsqueda y ventanas', topics: 'Two Pointers, Sliding Window, Prefix Sums y Binary Search', focus: 'Escribe el invariante de tus punteros o de tu intervalo antes de actualizarlo.' },
  { day: 3, title: 'Estructuras y recorridos', topics: 'Matrices, Sorting, Stacks, Recursion y BFS/DFS', focus: 'Distingue los estados visitados de las posiciones y revisa el caso base de cada recorrido.' },
];
const duration = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function InterviewPrep({ progress, update, dark }: { progress: InterviewProgress; update: UpdateInterview; dark: boolean }) {
  const [view, setView] = useState<View>('dashboard');
  const [selected, setSelected] = useState('');
  const [selectedMock, setSelectedMock] = useState('');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [now, setNow] = useState(Date.now);
  const { attempts, attempted, solved, successRate, averageTime } = useMemo(() => summarize(progress), [progress]);
  const mocks = Object.values(progress.mocks).sort((a, b) => b.startedAt - a.startedAt);
  const openMock = mocks.find(mock => mock.finishedAt === undefined);
  const recentMock = mocks.find(mock => mock.finishedAt !== undefined);
  const planMock = openMock ?? recentMock ?? createMock('preview', 0, mocks.length);
  const planMockSolved = new Set(mockAttempts(planMock, attempts).filter(passedSubmission).map(attempt => attempt.problemId));
  const displayedMock = progress.mocks[selectedMock];
  const featured = problemById.get(progress.lastProblem?.id ?? '');
  const next = (featured && !solved.has(featured.id) ? featured : problems.find(problem => !solved.has(problem.id))) ?? featured ?? problems[0];
  const completedDays = days.filter(({ day }) => problems.filter(problem => problem.day === day).every(problem => solved.has(problem.id))).length
    + Number(mocks.some(mock => mock.reviewedAt !== undefined));
  const filtered = problems.filter(problem => (!topic || problem.topic === topic) && (!difficulty || problem.difficulty === difficulty)
    && `${problem.title} ${problem.description} ${problem.topic} ${problem.tags?.join(' ') ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  const openMockId = openMock?.id;
  const openMockStartedAt = openMock?.startedAt;
  useEffect(() => {
    if (!openMockId) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [openMockId]);

  useEffect(() => {
    if (!openMockId || openMockStartedAt === undefined) return;
    const mock = progress.mocks[openMockId];
    if (mock && remainingTime(mock, now) === 0) {
      update(value => {
        const current = value.mocks[openMockId];
        if (!current || current.finishedAt !== undefined) return value;
        return { ...value, mocks: { ...value.mocks, [openMockId]: finishMock(current, now) } };
      });
    }
  }, [openMockId, openMockStartedAt, now, progress.mocks, update]);

  function go(nextView: View) {
    setView(nextView);
    window.scrollTo(0, 0);
  }

  function openProblem(problem: InterviewProblem) {
    const lastProblem = { id: problem.id, at: Date.now() };
    update(value => ({ ...value, lastProblem }));
    setSelected(problem.id);
    go('problem');
  }

  function openAssessment(mock: Mock) {
    setNow(Date.now());
    setSelectedMock(mock.id);
    setSelected(mock.problemIds[0]);
    go('mock');
  }

  function startAssessment() {
    if (openMock) { openAssessment(openMock); return; }
    const mock = createMock(crypto.randomUUID(), Date.now(), mocks.length);
    update(value => ({ ...value, mocks: { ...value.mocks, [mock.id]: mock } }));
    openAssessment(mock);
  }

  function finishAssessment(mock: Mock) {
    const finished = finishMock(mock, Date.now());
    update(value => ({ ...value, mocks: { ...value.mocks, [mock.id]: finishMock(value.mocks[mock.id] ?? mock, finished.finishedAt!) } }));
  }

  const selectedProblem = problemById.get(selected);
  const remaining = displayedMock ? remainingTime(displayedMock, now) : 0;
  const currentMockAttempts = displayedMock ? mockAttempts(displayedMock, attempts) : [];
  const mockSolved = new Set(currentMockAttempts.filter(passedSubmission).map(attempt => attempt.problemId));

  return <div className="interview-prep">
    <nav className="interview-tabs" aria-label="Interview Prep">
      {sections.map(([id, label]) => <button className="button secondary" key={id} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}>{label}</button>)}
      {(openMock || view === 'mock') && <button className="button secondary" aria-current={view === 'mock' ? 'page' : undefined} onClick={() => view !== 'mock' && openMock && openAssessment(openMock)}><Timer size={16}/> Simulacro</button>}
    </nav>
    {view === 'dashboard' && <>
      <header className="welcome interview-hero">
        <div><h1>Interview Prep</h1><p>Cuatro días de práctica en Python para entrevistas de ingeniería de software.</p>
          <div className="interview-actions">
            <button className="button primary" onClick={() => openProblem(next)}><BookOpen size={17}/> Continue Practicing</button>
            <button className="button secondary" onClick={startAssessment}><Timer size={17}/> {openMock ? 'Resume Mock Assessment' : 'Start Mock Assessment'}</button>
          </div>
        </div><div className="welcome-icon"><ListChecks size={42} aria-hidden="true"/></div>
      </header>
      <div className="interview-metrics">
        <Metric label="Problemas resueltos" value={`${solved.size} / ${problems.length}`}/>
        <Metric label="Problemas intentados" value={String(attempted.size)}/>
        <Metric label="Envíos correctos" value={successRate === undefined ? '—' : `${successRate}%`}/>
        <Metric label="Tiempo activo promedio" value={averageTime === undefined ? '—' : duration(averageTime)} detail="Por problema abierto · min:seg"/>
      </div>
      <div className="interview-overview">
        <section className="panel interview-card">
          <h2>Plan intensivo</h2><p>{completedDays} de 4 días completados</p>
          <progress value={completedDays} max={4} aria-label="Días completados"/>
          <ul className="interview-summary">{days.map(({ day, title }) => {
            const assigned = problems.filter(problem => problem.day === day);
            return <li key={day}><span>Día {day} · {title}</span><strong>{assigned.filter(problem => solved.has(problem.id)).length}/{assigned.length}</strong></li>;
          })}<li><span>Día 4 · Simulacro y revisión</span><strong>{mocks.some(mock => mock.reviewedAt !== undefined) ? 'Completo' : 'Pendiente'}</strong></li></ul>
          <button className="button secondary" onClick={() => go('plan')}>Abrir plan <ArrowRight size={16}/></button>
        </section>
        <section className="panel interview-card"><h2>Dominio por tema</h2><p>Un tema se completa al resolver todos sus problemas.</p>
          <ul className="interview-summary">{topics.map(item => {
            const assigned = problems.filter(problem => problem.topic === item);
            const count = assigned.filter(problem => solved.has(problem.id)).length;
            return <li key={item}><span>{item}</span><strong>{count}/{assigned.length} · {count === assigned.length ? 'Dominado' : 'Pendiente'}</strong></li>;
          })}</ul>
        </section>
      </div>
    </>}
    {view === 'library' && <>
      <header className="page-heading"><div><h1>Biblioteca de problemas</h1><p>Ejercicios originales de algoritmos y estructuras de datos en Python.</p></div></header>
      <div className="interview-filters">
        <label>Buscar<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Título o tema"/></label>
        <label>Tema<select value={topic} onChange={event => setTopic(event.target.value)}><option value="">Todos</option>{topics.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Dificultad<select value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="">Todas</option>{['Easy', 'Medium', 'Hard'].map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
      <p role="status">{filtered.length} de {problems.length} problemas</p>
      {filtered.length ? <ProblemList items={filtered} solved={solved} attempted={attempted} onOpen={openProblem}/> : <p className="panel empty-state">No hay problemas con estos filtros.</p>}
    </>}
    {view === 'plan' && <>
      <header className="page-heading"><div><h1>Plan de cuatro días</h1><p>Abre cualquier día y marca tu avance resolviendo los problemas asignados.</p></div></header>
      {days.map(({ day, title, topics: dayTopics, focus }) => {
        const assigned = problems.filter(problem => problem.day === day);
        const done = assigned.filter(problem => solved.has(problem.id)).length;
        return <section className="panel interview-card interview-day" key={day}>
          <h2>Día {day} · {title}</h2><p>{dayTopics}</p><p>{focus}</p>
          <p>{done} completados · {assigned.length - done} pendientes · {assigned.length} asignados</p>
          <ProblemList items={assigned} solved={solved} attempted={attempted} onOpen={openProblem}/>
        </section>;
      })}
      <section className="panel interview-card interview-day"><h2>Día 4 · Simulacro y revisión</h2>
        <p>Completa cuatro problemas en 70 minutos. Después, revisa los envíos fallidos y compara tu enfoque con las soluciones.</p>
        <p>Simulacro {mocks.some(mock => mock.finishedAt !== undefined) ? 'completado' : 'pendiente'} · Revisión {mocks.some(mock => mock.reviewedAt !== undefined) ? 'completada' : 'pendiente'}</p>
        <p>{planMockSolved.size} completados · {planMock.problemIds.length - planMockSolved.size} pendientes · {planMock.problemIds.length} asignados</p>
        <ul className="interview-summary">{planMock.problemIds.map(id => <li key={id}>
          <span>{problemById.get(id)?.title}</span><strong>{planMockSolved.has(id) ? 'Completado' : 'Pendiente'}</strong>
        </li>)}</ul>
        <button className="button primary" onClick={startAssessment}>{openMock ? 'Continuar simulacro' : 'Iniciar simulacro'}</button>
        {recentMock && <button className="button secondary" onClick={() => openAssessment(recentMock)}>Revisar último simulacro</button>}
      </section>
    </>}
    {view === 'problem' && selectedProblem && <ProblemWorkspace key={selected} problem={selectedProblem} progress={progress} update={update} dark={dark} onBack={() => go('library')}/>}
    {view === 'history' && <>
      <header className="page-heading"><div><h1>Historial</h1><p>Resultados guardados de práctica y simulacros.</p></div></header>
      <section className="panel interview-card interview-day"><h2>Simulacros</h2>
        {mocks.length ? <ul className="path-list interview-list">{mocks.map(mock => <li key={mock.id}>
          <button className="path-card" onClick={() => openAssessment(mock)}><Clock size={16}/><span className="path-info"><strong>{new Date(mock.startedAt).toLocaleString()}</strong><small>{mock.finishedAt !== undefined ? `${new Set(mockAttempts(mock, attempts).filter(passedSubmission).map(attempt => attempt.problemId)).size}/4 resueltos` : 'En curso'}</small></span><ArrowRight size={16}/></button>
        </li>)}</ul> : <p>Aún no hay simulacros.</p>}
      </section>
      <section className="panel interview-card"><h2>Intentos</h2>
        {attempts.length ? attempts.map(attempt => <AttemptDetails key={attempt.id} attempt={attempt}/>) : <p>Aún no has ejecutado ni enviado código.</p>}
      </section>
    </>}
    {view === 'mock' && displayedMock && (remaining > 0 && selectedProblem ? <>
      <section className="panel interview-card interview-mock">
        <div className="interview-mock-head"><div><h1>Mock Assessment</h1><p>Práctica inspirada en el formato general de CodeSignal · {mockSolved.size}/4 resueltos</p></div>
          <div className="interview-timer" role="timer" aria-label="Tiempo restante"><Timer size={22}/> {duration(remaining)}</div>
          <button className="button secondary" onClick={() => finishAssessment(displayedMock)}>Finalizar simulacro</button></div>
        <nav className="interview-actions" aria-label="Problemas del simulacro">{displayedMock.problemIds.map((id, index) => <button key={id}
          className={id === selected ? 'button primary' : 'button secondary'} aria-current={id === selected ? 'step' : undefined} onClick={() => setSelected(id)}>
          {mockSolved.has(id) && <Check size={16} aria-label="Resuelto"/>}{index + 1}. {problemById.get(id)?.title}
        </button>)}</nav>
      </section>
      <ProblemWorkspace key={`${displayedMock.id}/${selected}`} problem={selectedProblem} progress={progress} update={update} dark={dark} mock={displayedMock} onBack={() => go('dashboard')}/>
    </> : <section className="panel interview-card">
      <h1>Resultados del simulacro</h1>
      <p>{mockSolved.size} de 4 problemas resueltos · {duration((displayedMock.finishedAt ?? finishMock(displayedMock, now).finishedAt!) - displayedMock.startedAt)} usados</p>
      {displayedMock.problemIds.map(id => {
        const problem = problemById.get(id);
        if (!problem) return null;
        const runs = currentMockAttempts.filter(attempt => attempt.problemId === id);
        const draft = progress.drafts[`${displayedMock.id}/${id}`];
        return <details className="interview-review" key={id}>
          <summary>{problem.title} · {mockSolved.has(id) ? 'Resuelto' : runs.length ? 'Pendiente de resolver' : 'Sin intento'}</summary>
          {runs.map(attempt => <AttemptDetails key={attempt.id} attempt={attempt}/>)}
          {draft && <><h3>Tu último borrador</h3><pre><code>{draft.code}</code></pre></>}
          <details><summary>Ver solución de referencia</summary><ReferenceSolution problem={problem}/></details>
          <button className="button secondary" onClick={() => openProblem(problem)}>Practicar este problema</button>
        </details>;
      })}
      <div className="interview-actions">
        <button className="button primary" disabled={displayedMock.reviewedAt !== undefined || displayedMock.finishedAt === undefined} onClick={() => {
          const reviewedAt = Date.now();
          update(value => ({ ...value, mocks: { ...value.mocks, [displayedMock.id]: { ...value.mocks[displayedMock.id], reviewedAt } } }));
        }}>{displayedMock.reviewedAt !== undefined ? 'Revisión completada' : 'Marcar revisión completada'}</button>
        <button className="button secondary" onClick={() => go('dashboard')}>Volver al dashboard</button>
      </div>
    </section>)}
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="panel metric"><span>{label}</span><strong>{value}</strong>{detail && <p>{detail}</p>}</div>;
}

function ProblemList({ items, solved, attempted, onOpen }: {
  items: InterviewProblem[]; solved: Set<string>; attempted: Set<string>; onOpen: (problem: InterviewProblem) => void;
}) {
  return <ul className="path-list interview-list">{items.map(problem => <li key={problem.id}>
    <button className="path-card" onClick={() => onOpen(problem)}>
      <span className="path-info"><strong>{problem.title}</strong><small>{problem.topic} · {problem.difficulty}</small></span>
      {solved.has(problem.id) ? <span className="interview-done"><Check size={16}/> Resuelto</span> : <span className="interview-state">{attempted.has(problem.id) ? 'Intentado' : 'Pendiente'}</span>}
      <ArrowRight size={16} aria-hidden="true"/>
    </button>
  </li>)}</ul>;
}

function AttemptDetails({ attempt }: { attempt: Attempt }) {
  return <details className="interview-attempt"><summary>{problemById.get(attempt.problemId)?.title} · {attempt.kind === 'submit' ? 'Submit' : 'Run Code'} · {attempt.success ? 'Correcto' : 'Fallido'} · {new Date(attempt.at).toLocaleString()}{attempt.mockId && ' · Simulacro'}</summary>
    <ExecutionResults result={attempt.result}/>
  </details>;
}
