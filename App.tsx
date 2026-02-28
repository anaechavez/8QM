/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  ChevronRight, 
  ClipboardCheck, 
  AlertCircle, 
  BookOpen, 
  ArrowRight,
  Printer,
  RefreshCw
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateProblemStatement, generateSynthesis, type ProblemData } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum Phase {
  START = 'START',
  PHASE_1 = 'PHASE_1',
  PHASE_2 = 'PHASE_2',
  PHASE_3 = 'PHASE_3',
  PHASE_4_5 = 'PHASE_4_5',
  PHASE_6 = 'PHASE_6'
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(Phase.START);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [problemData, setProblemData] = useState<ProblemData>({
    affected: '',
    location: '',
    negativeSituation: '',
    causes: {
      branchA: { primary: '', levels: [] },
      branchB: { primary: '', levels: [] }
    },
    consequences: {
      branchA: { primary: '', levels: [] },
      branchB: { primary: '', levels: [] }
    }
  });

  const [step, setStep] = useState(0);
  const [problemStatement, setProblemStatement] = useState('');
  const [synthesisMarkdown, setSynthesisMarkdown] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const startProcess = () => {
    setPhase(Phase.PHASE_1);
    addMessage('assistant', 'Bienvenido al Asistente Académico de Metodología 8QM. Iniciemos con la Fase 1: Declaración del Problema.\n\n¿Quiénes son las personas afectadas?');
  };

  const handleInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    addMessage('user', userText);

    if (phase === Phase.PHASE_1) {
      handlePhase1(userText);
    } else if (phase === Phase.PHASE_2) {
      handlePhase2(userText);
    } else if (phase === Phase.PHASE_3) {
      handlePhase3(userText);
    }
  };

  const handlePhase1 = async (text: string) => {
    setIsLoading(true);
    const newData = { ...problemData };
    
    if (step === 0) {
      newData.affected = text;
      setProblemData(newData);
      addMessage('assistant', '¿Dónde ocurre la situación?');
      setStep(1);
    } else if (step === 1) {
      newData.location = text;
      setProblemData(newData);
      addMessage('assistant', '¿Qué situación negativa específica están viviendo?');
      setStep(2);
    } else if (step === 2) {
      newData.negativeSituation = text;
      setProblemData(newData);
      
      const statement = await generateProblemStatement(newData.affected, newData.location, text);
      setProblemStatement(statement || '');
      
      addMessage('assistant', `1. ENUNCIADO DEL PROBLEMA\n\n${statement}\n\nContinuemos con la Fase 2: Análisis de Causas.\n\nPor favor, indique la primera causa primaria (Rama A).`);
      setPhase(Phase.PHASE_2);
      setStep(0);
    }
    setIsLoading(false);
  };

  const handlePhase2 = (text: string) => {
    const newData = { ...problemData };
    
    // Step 0: Primary A
    // Step 1-4: Why A (4 levels)
    // Step 5: Primary B
    // Step 6-9: Why B (4 levels)

    if (step === 0) {
      newData.causes.branchA.primary = text;
      setProblemData(newData);
      addMessage('assistant', '¿Por qué ocurre esto? (Nivel 1 de la Rama A)');
      setStep(1);
    } else if (step >= 1 && step <= 4) {
      newData.causes.branchA.levels.push(text);
      setProblemData(newData);
      if (step < 4) {
        addMessage('assistant', `¿Por qué ocurre el nivel ${step}? (Nivel ${step + 1} de la Rama A)`);
        setStep(step + 1);
      } else {
        addMessage('assistant', 'Indique la segunda causa primaria (Rama B).');
        setStep(5);
      }
    } else if (step === 5) {
      newData.causes.branchB.primary = text;
      setProblemData(newData);
      addMessage('assistant', '¿Por qué ocurre esto? (Nivel 1 de la Rama B)');
      setStep(6);
    } else if (step >= 6 && step <= 9) {
      newData.causes.branchB.levels.push(text);
      setProblemData(newData);
      if (step < 9) {
        addMessage('assistant', `¿Por qué ocurre el nivel ${step - 5}? (Nivel ${step - 4} de la Rama B)`);
        setStep(step + 1);
      } else {
        // Show summary of Phase 2
        const summary = `2. ANÁLISIS DE CAUSAS (MEDIOS)

- Rama A: ${newData.causes.branchA.primary}
  - Nivel 1: ${newData.causes.branchA.levels[0]}
  - Nivel 2: ${newData.causes.branchA.levels[1]}
  - Nivel 3: ${newData.causes.branchA.levels[2]}
  - Nivel 4: ${newData.causes.branchA.levels[3]}

- Rama B: ${newData.causes.branchB.primary}
  - Nivel 1: ${newData.causes.branchB.levels[0]}
  - Nivel 2: ${newData.causes.branchB.levels[1]}
  - Nivel 3: ${newData.causes.branchB.levels[2]}
  - Nivel 4: ${newData.causes.branchB.levels[3]}`;

        addMessage('assistant', summary);
        addMessage('assistant', 'Iniciemos la Fase 3: Análisis de Consecuencias.\n\nIndique la primera consecuencia directa (Rama A).');
        setPhase(Phase.PHASE_3);
        setStep(0);
      }
    }
  };

  const handlePhase3 = async (text: string) => {
    const newData = { ...problemData };
    
    if (step === 0) {
      newData.consequences.branchA.primary = text;
      setProblemData(newData);
      addMessage('assistant', '¿Qué pasa después? (Nivel 1 de la Rama A)');
      setStep(1);
    } else if (step >= 1 && step <= 4) {
      newData.consequences.branchA.levels.push(text);
      setProblemData(newData);
      if (step < 4) {
        addMessage('assistant', `¿Qué pasa después del nivel ${step}? (Nivel ${step + 1} de la Rama A)`);
        setStep(step + 1);
      } else {
        addMessage('assistant', 'Indique la segunda consecuencia directa (Rama B).');
        setStep(5);
      }
    } else if (step === 5) {
      newData.consequences.branchB.primary = text;
      setProblemData(newData);
      addMessage('assistant', '¿Qué pasa después? (Nivel 1 de la Rama B)');
      setStep(6);
    } else if (step >= 6 && step <= 9) {
      newData.consequences.branchB.levels.push(text);
      setProblemData(newData);
      if (step < 9) {
        addMessage('assistant', `¿Qué pasa después del nivel ${step - 5}? (Nivel ${step - 4} de la Rama B)`);
        setStep(step + 1);
      } else {
        const summary = `3. ANÁLISIS DE CONSECUENCIAS (FINES)

- Rama A: ${newData.consequences.branchA.primary}
  - Nivel 1: ${newData.consequences.branchA.levels[0]}
  - Nivel 2: ${newData.consequences.branchA.levels[1]}
  - Nivel 3: ${newData.consequences.branchA.levels[2]}
  - Nivel 4: ${newData.consequences.branchA.levels[3]}

- Rama B: ${newData.consequences.branchB.primary}
  - Nivel 1: ${newData.consequences.branchB.levels[0]}
  - Nivel 2: ${newData.consequences.branchB.levels[1]}
  - Nivel 3: ${newData.consequences.branchB.levels[2]}
  - Nivel 4: ${newData.consequences.branchB.levels[3]}`;

        addMessage('assistant', summary);
        setPhase(Phase.PHASE_4_5);
        processSynthesis(newData);
      }
    }
  };

  const processSynthesis = async (data: ProblemData) => {
    setIsLoading(true);
    addMessage('assistant', 'Procesando síntesis de objetivos y estrategias...');
    try {
      const result = await generateSynthesis(data);
      setSynthesisMarkdown(result || '');
      addMessage('assistant', result || 'Error al generar la síntesis.');
      setPhase(Phase.PHASE_6);
    } catch (error) {
      addMessage('assistant', 'Ocurrió un error técnico al procesar la información.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateFinalReport = () => {
    const report = `# REPORTE ACADÉMICO: METODOLOGÍA 8QM

## 1. ENUNCIADO DEL PROBLEMA
- ${problemStatement}

## 2. ANÁLISIS DE CAUSAS (MEDIOS)
- Rama A: ${problemData.causes.branchA.primary}
  - Nivel 1: ${problemData.causes.branchA.levels[0]}
  - Nivel 2: ${problemData.causes.branchA.levels[1]}
  - Nivel 3: ${problemData.causes.branchA.levels[2]}
  - Nivel 4: ${problemData.causes.branchA.levels[3]}
- Rama B: ${problemData.causes.branchB.primary}
  - Nivel 1: ${problemData.causes.branchB.levels[0]}
  - Nivel 2: ${problemData.causes.branchB.levels[1]}
  - Nivel 3: ${problemData.causes.branchB.levels[2]}
  - Nivel 4: ${problemData.causes.branchB.levels[3]}

## 3. ANÁLISIS DE CONSECUENCIAS (FINES)
- Rama A: ${problemData.consequences.branchA.primary}
  - Nivel 1: ${problemData.consequences.branchA.levels[0]}
  - Nivel 2: ${problemData.consequences.branchA.levels[1]}
  - Nivel 3: ${problemData.consequences.branchA.levels[2]}
  - Nivel 4: ${problemData.consequences.branchA.levels[3]}
- Rama B: ${problemData.consequences.branchB.primary}
  - Nivel 1: ${problemData.consequences.branchB.levels[0]}
  - Nivel 2: ${problemData.consequences.branchB.levels[1]}
  - Nivel 3: ${problemData.consequences.branchB.levels[2]}
  - Nivel 4: ${problemData.consequences.branchB.levels[3]}

${synthesisMarkdown}

---
Su reporte académico está listo. Puede copiar el contenido o utilizar la función de impresión del navegador para guardarlo como PDF.`;

    return report;
  };

  const reset = () => {
    setPhase(Phase.START);
    setMessages([]);
    setStep(0);
    setProblemData({
      affected: '',
      location: '',
      negativeSituation: '',
      causes: {
        branchA: { primary: '', levels: [] },
        branchB: { primary: '', levels: [] }
      },
      consequences: {
        branchA: { primary: '', levels: [] },
        branchB: { primary: '', levels: [] }
      }
    });
    setProblemStatement('');
    setSynthesisMarkdown('');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 p-2 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900">8QM Academic Assistant</h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Metodología de Marco Lógico</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={reset}
              className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
              title="Reiniciar proceso"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        {phase === Phase.START ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md"
            >
              <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-zinc-100 rounded-full">
                <ClipboardCheck className="w-10 h-10 text-zinc-900" />
              </div>
              <h2 className="text-3xl font-bold text-zinc-900 mb-4">Guía Metodológica 8QM</h2>
              <p className="text-zinc-600 mb-8 leading-relaxed">
                Este asistente le guiará paso a paso en la construcción de su Árbol de Problemas y Árbol de Objetivos siguiendo el estándar académico formal.
              </p>
              <button 
                onClick={startProcess}
                className="w-full bg-zinc-900 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all group shadow-lg shadow-zinc-200"
              >
                Iniciar Asesoría Académica
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm md:text-base",
                      msg.role === 'user' 
                        ? "bg-zinc-900 text-white rounded-tr-none" 
                        : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-sm"
                    )}>
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-2 px-1">
                      {msg.role === 'assistant' ? 'Asistente' : 'Estudiante'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium animate-pulse">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full" />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full" />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full" />
                  <span>Procesando análisis...</span>
                </div>
              )}
            </div>

            {/* Input Area */}
            {phase !== Phase.PHASE_6 && (
              <div className="p-4 bg-white border-t border-zinc-200">
                <form onSubmit={handleInput} className="relative max-w-3xl mx-auto">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escriba su respuesta aquí..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 pl-6 pr-14 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", phase === Phase.PHASE_1 ? "bg-zinc-900" : "bg-zinc-200")} />
                    Problema
                  </div>
                  <ArrowRight className="w-3 h-3" />
                  <div className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", phase === Phase.PHASE_2 ? "bg-zinc-900" : "bg-zinc-200")} />
                    Causas
                  </div>
                  <ArrowRight className="w-3 h-3" />
                  <div className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", phase === Phase.PHASE_3 ? "bg-zinc-900" : "bg-zinc-200")} />
                    Consecuencias
                  </div>
                  <ArrowRight className="w-3 h-3" />
                  <div className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", (phase as string) === Phase.PHASE_6 ? "bg-zinc-900" : "bg-zinc-200")} />
                    Reporte
                  </div>
                </div>
              </div>
            )}

            {/* Final Actions */}
            {phase === Phase.PHASE_6 && (
              <div className="p-6 bg-white border-t border-zinc-200">
                <div className="max-w-md mx-auto space-y-3">
                  <button 
                    onClick={() => {
                      const report = generateFinalReport();
                      const blob = new Blob([report], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'Reporte_8QM.md';
                      a.click();
                    }}
                    className="w-full bg-zinc-900 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                  >
                    <Printer className="w-5 h-5" />
                    Descargar Reporte (.md)
                  </button>
                  <button 
                    onClick={reset}
                    className="w-full bg-white border border-zinc-200 text-zinc-600 py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Iniciar Nuevo Análisis
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-zinc-50 border-t border-zinc-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            <span>Uso Estrictamente Académico</span>
          </div>
          <div>Tec de Monterrey Style Framework</div>
        </div>
      </footer>
    </div>
  );
}
