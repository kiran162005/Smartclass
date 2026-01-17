import React, { useState } from 'react';
import { FileText, BookOpen, Lightbulb, HelpCircle, Download, Copy, Check } from 'lucide-react';
import axios from 'axios';

export default function TextGenerator() {
  const [activeTab, setActiveTab] = useState('essay');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('simple');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      let res;

      if (activeTab === 'essay') {
        res = await axios.post('http://localhost:5000/ai/essay', { topic });
        setResult({ topic, essay: res.data.essay, wordCount: res.data.wordCount });
      } 
      else if (activeTab === 'notes') {
        res = await axios.post('http://localhost:5000/ai/notes', { topic });
        setResult({ topic, notes: res.data.notes });
      } 
      else if (activeTab === 'explain') {
        res = await axios.post('http://localhost:5000/ai/explain', { topic, level });
        setResult({ topic, explanation: res.data.explanation });
      } 
      else if (activeTab === 'questions') {
        res = await axios.post('http://localhost:5000/ai/practice-questions', { topic, count });
        setResult({ topic, questions: res.data.questions });
      }

    } catch (err) {
      console.error('Error:', err);
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = result?.essay || result?.notes || result?.explanation ||
      result?.questions?.map((q, i) => `${i + 1}. ${q.question}`).join('\n') || '';
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const content = result?.essay || result?.notes || result?.explanation ||
      result?.questions?.map((q, i) => `${i + 1}. ${q.question}\nHint: ${q.hint}\n`).join('\n') || '';

    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.topic}-${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'essay', label: 'Generate Essay', icon: FileText },
    { id: 'notes', label: 'Study Notes', icon: BookOpen },
    { id: 'explain', label: 'Explain Topic', icon: Lightbulb },
    { id: 'questions', label: 'Practice Questions', icon: HelpCircle }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🤖 AI Text Generator</h2>
          <p className="text-gray-500">Generate essays, notes, explanations, and practice questions</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Topic / Subject</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, Quadratic Equations, JavaScript"
                className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {activeTab === 'explain' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Explanation Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="simple">Simple (Easy to understand)</option>
                  <option value="detailed">Detailed (In-depth)</option>
                </select>
              </div>
            )}

            {activeTab === 'questions' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Questions: {count}
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>Generate {tabs.find(t => t.id === activeTab)?.label}</>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white border-2 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Generated Content</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
              {result.essay && (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif">
                    {result.essay}
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    📊 Word count: {result.wordCount}
                  </div>
                </div>
              )}

              {result.notes && (
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif">
                  {result.notes}
                </div>
              )}

              {result.explanation && (
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif">
                  {result.explanation}
                </div>
              )}

              {result.questions && (
                <div className="space-y-4">
                  {result.questions.map((q, idx) => (
                    <div key={idx} className="border-2 rounded-lg p-4 bg-white hover:shadow-md transition">
                      <div className="font-semibold text-gray-800 mb-2 flex items-start gap-2">
                        <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">
                          {idx + 1}
                        </span>
                        <span>{q.question}</span>
                      </div>
                      <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded ml-8">
                        💡 <strong>Hint:</strong> {q.hint}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 ml-8">
                        📌 Type: {q.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}