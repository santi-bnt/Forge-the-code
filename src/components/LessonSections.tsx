import { useState } from 'react';
import type { Language, Lesson } from '../types';
import { Visualization } from './Visualizations';

export function LessonSections({lesson,language,bookmarks,onBookmark}:{lesson:Lesson;language:Language;bookmarks:string[];onBookmark:(id:string)=>void}) {
  const [quizAnswers,setQuizAnswers]=useState<Record<string,number>>({});
  return <div className="lesson-sections">{lesson.sections.map((section,index)=>{
    const key=`${lesson.id}-${index}`, bookmarkId=`explanation:${lesson.id}:${index}`, saved=bookmarks.includes(bookmarkId);const action=<button className={`section-bookmark ${saved?'saved':''}`} onClick={()=>onBookmark(bookmarkId)} aria-label={saved?'Remove saved explanation':'Save explanation'}>{saved?'Saved':'Save'}</button>;
    if(section.type==='text')return <section className="panel learning-card" key={key}>{action}<span className="eyebrow">{String(index+1).padStart(2,'0')} · {section.title}</span><p>{section.body}</p></section>;
    if(section.type==='code')return <section className="panel learning-card" key={key}>{action}<span className="eyebrow">EXAMPLE</span><h2>{section.title}</h2><pre className="lesson-code">{section.code[language]??section.code.python??''}</pre></section>;
    if(section.type==='visualization')return <section className="panel learning-card" key={key}>{action}<span className="eyebrow">VISUALIZE</span><h2>{section.title}</h2><Visualization kind={section.visual}/></section>;
    if(section.type==='quiz')return <section className="panel learning-card" key={key}>{action}<span className="eyebrow">QUICK CHECK</span><h2>{section.title}</h2><p>{section.question}</p><div className="quiz-options">{section.options.map((option,i)=><button className={quizAnswers[key]===i?(i===section.answer?'correct':'incorrect'):''} key={option} onClick={()=>setQuizAnswers({...quizAnswers,[key]:i})}>{option}</button>)}</div>{quizAnswers[key]!==undefined&&<p role="status" className="quiz-feedback">{quizAnswers[key]===section.answer?'Correct. ':'Try again. '}{section.explanation}</p>}</section>;
    if(section.type==='review')return <section className="panel learning-card" key={key}>{action}<span className="eyebrow">REVIEW</span><h2>{section.title}</h2><ul>{section.points.map(point=><li key={point}>{point}</li>)}</ul></section>;
    return <section className={`panel learning-card ${section.type}`} key={key}>{action}<span className="eyebrow">{section.type.toUpperCase()}</span><h2>{section.title}</h2><p>{section.body}</p></section>;
  })}</div>;
}
