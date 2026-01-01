
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  FileUp, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Edit2, 
  Trash2, 
  X,
  Settings,
  Info,
  MoreVertical
} from 'lucide-react';
import { MessageSnippet, ViewMode } from './types';

// Declare XLSX for TypeScript since it's loaded via CDN
declare const XLSX: any;

const App: React.FC = () => {
  const [messages, setMessages] = useState<MessageSnippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingSnippet, setEditingSnippet] = useState<MessageSnippet | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('quickreply_messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading snippets:', e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('quickreply_messages', JSON.stringify(messages));
  }, [messages]);

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setExpandedCategories(next);
  };

  const toggleMessage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Don't trigger the copy action
    const next = new Set(expandedMessages);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedMessages(next);
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback(id);
      setTimeout(() => setCopyFeedback(null), 1000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const newSnippets: MessageSnippet[] = (data as any[][])
        .slice(1)
        .filter(row => row.length >= 3)
        .map(row => ({
          id: crypto.randomUUID(),
          category: String(row[0] || 'Sem Categoria').trim(),
          title: String(row[1] || 'Sem Título').trim(),
          content: String(row[2] || '').trim(),
        }));

      if (newSnippets.length > 0) {
        setMessages(prev => [...prev, ...newSnippets]);
        setShowConfig(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const addOrUpdateSnippet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const snippet: MessageSnippet = {
      id: editingSnippet?.id || crypto.randomUUID(),
      category: (formData.get('category') as string) || 'Geral',
      title: (formData.get('title') as string) || 'Sem Título',
      content: (formData.get('content') as string) || '',
    };

    if (viewMode === 'edit') {
      setMessages(prev => prev.map(m => m.id === snippet.id ? snippet : m));
    } else {
      setMessages(prev => [...prev, snippet]);
    }
    
    setViewMode('list');
    setEditingSnippet(null);
  };

  const deleteSnippet = (id: string) => {
    if (confirm('Excluir esta mensagem?')) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  // Grouping and Filtering logic
  const filteredMessages = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return messages.filter(m => 
      m.title.toLowerCase().includes(term) || 
      m.category.toLowerCase().includes(term) ||
      m.content.toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  const groupedMessages = useMemo(() => {
    const groups: Record<string, MessageSnippet[]> = {};
    filteredMessages.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [filteredMessages]);

  return (
    <div className="flex flex-col h-screen w-full max-w-[320px] mx-auto bg-white shadow-xl border-l relative overflow-hidden">
      {/* Ultra Compact Header */}
      <header className="px-3 py-2 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
          <h1 className="font-bold text-xs tracking-tight uppercase opacity-90">QuickReply</h1>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => setViewMode('add')}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Adicionar"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Configurar"
          >
            <Settings size={14} />
          </button>
        </div>
      </header>

      {/* Compact Search Bar */}
      <div className="px-2 py-2 bg-slate-50 border-b shrink-0">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={12} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 bg-white">
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-300 text-center px-4 space-y-2">
            <Info size={24} className="opacity-20" />
            <p className="text-[10px]">Sem mensagens.<br/>Use o botão + ou importe um arquivo.</p>
          </div>
        ) : (
          (Object.entries(groupedMessages) as [string, MessageSnippet[]][]).sort().map(([category, items]) => (
            <div key={category} className="mb-1">
              <button 
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded transition-colors group text-left"
              >
                <div className="text-slate-400">
                  {expandedCategories.has(category) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate flex-1">
                  {category}
                </span>
                <span className="text-[9px] text-slate-300 group-hover:text-indigo-400 transition-colors font-mono">
                  {items.length}
                </span>
              </button>

              {expandedCategories.has(category) && (
                <div className="mt-0.5 space-y-px pl-1 border-l border-slate-100 ml-2">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      className={`group relative border-b border-slate-50 last:border-0 transition-all duration-150 ${copyFeedback === item.id ? 'bg-green-50' : 'hover:bg-indigo-50/50'}`}
                    >
                      <div className="flex items-center min-h-[32px]">
                        {/* Title Click -> Copy Action */}
                        <button 
                          onClick={() => handleCopy(item.content, item.id)}
                          className="flex-1 text-left px-2 py-1.5 no-select"
                          title="Clique para copiar"
                        >
                          <div className={`text-[11px] font-medium leading-tight truncate transition-colors ${copyFeedback === item.id ? 'text-green-600' : 'text-slate-700'}`}>
                            {item.title}
                          </div>
                        </button>
                        
                        {/* Hidden Actions (Appear on Hover) */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-indigo-50/80 via-indigo-50/80 to-transparent pr-1 pl-4 h-full">
                          <button 
                            onClick={(e) => toggleMessage(e, item.id)}
                            className={`p-1 hover:text-indigo-600 rounded ${expandedMessages.has(item.id) ? 'text-indigo-600' : 'text-slate-400'}`}
                            title="Expandir conteúdo"
                          >
                            <Info size={12} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSnippet(item);
                              setViewMode('edit');
                            }}
                            className="p-1 text-slate-400 hover:text-blue-500 rounded"
                            title="Editar"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSnippet(item.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                            title="Excluir"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Visual Copy Feedback Icon */}
                        {copyFeedback === item.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 pointer-events-none">
                            <Check size={14} className="text-green-600" />
                          </div>
                        )}
                      </div>

                      {/* Expanded View for confirmation */}
                      {expandedMessages.has(item.id) && (
                        <div 
                          className="px-2 pb-2 text-[10px] text-slate-500 cursor-pointer animate-in slide-in-from-top-1 duration-200"
                          onClick={() => handleCopy(item.content, item.id)}
                        >
                          <div className="bg-white/60 p-2 rounded border border-indigo-100/50 italic leading-snug whitespace-pre-wrap">
                            {item.content}
                          </div>
                          <div className="mt-1 text-right text-[8px] font-semibold text-indigo-400 uppercase tracking-widest">
                            Copiar texto
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </main>

      {/* Config Overlay - Ultra Discreet */}
      {showConfig && (
        <div className="absolute inset-0 bg-white/98 z-50 flex flex-col p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Ferramentas</h2>
            <button onClick={() => setShowConfig(false)} className="p-1 hover:bg-slate-100 rounded-full">
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-6 flex-1 overflow-y-auto">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Importar Planilha</label>
              <div className="relative group border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center hover:border-indigo-300 transition-colors bg-slate-50">
                <FileUp size={24} className="text-slate-300 mb-2 group-hover:text-indigo-400" />
                <p className="text-[9px] text-slate-400 text-center leading-tight">
                  Arraste Excel ou CSV aqui<br/>
                  (A: Categoria | B: Título | C: Texto)
                </p>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
               <button 
                 className="w-full py-2 px-3 text-[10px] font-bold uppercase border border-slate-200 text-slate-600 hover:bg-slate-50 rounded transition-colors flex items-center justify-center gap-2"
                 onClick={() => {
                   const blob = new Blob([JSON.stringify(messages)], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = 'backup_mensagens.json';
                   a.click();
                 }}
               >
                 Exportar Dados
               </button>
               <button 
                  className="w-full py-2 px-3 text-[10px] font-bold uppercase border border-red-100 text-red-500 hover:bg-red-50 rounded transition-colors"
                  onClick={() => {
                    if (confirm('Deseja realmente limpar tudo?')) {
                      setMessages([]);
                      localStorage.removeItem('quickreply_messages');
                    }
                  }}
                >
                  Zerar Banco de Dados
                </button>
            </div>
          </div>
          <div className="mt-auto pt-4 text-center">
             <p className="text-[8px] text-slate-300 font-mono">Build: 2025.05.sidebar</p>
          </div>
        </div>
      )}

      {/* Editor Form Overlay */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-3 border-b flex justify-between items-center bg-slate-50">
            <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">
              {viewMode === 'add' ? 'Novo Snippet' : 'Editar Snippet'}
            </h2>
            <button 
              onClick={() => {
                setViewMode('list');
                setEditingSnippet(null);
              }} 
              className="p-1 hover:bg-slate-200 rounded-full"
            >
              <X size={14} />
            </button>
          </div>
          <form className="p-3 space-y-4 flex-1 overflow-y-auto" onSubmit={addOrUpdateSnippet}>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Categoria</label>
              <input 
                name="category"
                type="text" 
                defaultValue={editingSnippet?.category || ''}
                placeholder="Ex: Geral"
                className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Título</label>
              <input 
                name="title"
                type="text" 
                defaultValue={editingSnippet?.title || ''}
                placeholder="Título curto..."
                className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div className="flex-1 flex flex-col space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Mensagem</label>
              <textarea 
                name="content"
                defaultValue={editingSnippet?.content || ''}
                placeholder="O texto que será copiado..."
                className="w-full flex-1 px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none min-h-[150px]"
                required
              ></textarea>
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase rounded shadow active:scale-[0.98] transition-all"
            >
              {viewMode === 'add' ? 'Salvar' : 'Atualizar'}
            </button>
          </form>
        </div>
      )}

      {/* Footer Status - Minimal */}
      <footer className="px-2 py-1 border-t bg-slate-50 flex justify-between items-center shrink-0">
        <span className="text-[9px] text-slate-400 font-mono tracking-tighter">
          DB: {messages.length} SNIPPETS
        </span>
        <div className="flex items-center gap-1 opacity-50">
          <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></div>
          <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Pronto</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
