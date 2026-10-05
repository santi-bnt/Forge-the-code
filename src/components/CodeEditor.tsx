import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import type { Language } from '../types';

export function CodeEditor({ code, onChange, language, dark }: { code: string; onChange: (code: string) => void; language: Language; dark: boolean }) {
  return <div className="editor-shell">
    <div className="editor-title"><span className="editor-dot"/>{language === 'python' ? 'main.py' : language === 'cpp' ? 'main.cpp' : 'main.c'}<span className="editor-hint">Tab = indent</span></div>
    <CodeMirror value={code} onChange={onChange} height="360px" theme={dark ? 'dark' : 'light'} basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, bracketMatching: true, closeBrackets: true }} extensions={[language === 'python' ? python() : cpp(), autocompletion(), keymap.of([indentWithTab])]} />
  </div>;
}
