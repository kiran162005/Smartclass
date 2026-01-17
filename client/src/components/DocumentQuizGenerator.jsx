import React, { useState } from 'react';
import { Upload, FileText, Brain, CheckCircle, Download } from 'lucide-react';
import axios from 'axios';

export default function DocumentQuizGenerator({ user }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  // Fetch all quizzes
  React.useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/ai/quizzes');
      setQuizzes(res.data.quizzes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext)) {
        alert('Only PDF, DOCX, and TXT files are supported');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/ai/process-document', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

      setResult(res.data);
      setFile(null);
      fetchQuizzes();
      alert('✅ Document processed successfully!');
    } catch (err) {
      alert('❌ Error processing document: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const calculateScore = () => {
    if (!selectedQuiz) return 0;
    let correct = 0;
    selectedQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return (correct / selectedQuiz.questions.length) * 100;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Brain size={32} className="text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AI Document Processor</h2>
            <p className="text-gray-500">Upload documents to generate summaries & quizzes</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-indigo-50 mb-6">
          <Upload size={48} className="mx-auto mb-4 text-indigo-600" />
          <input
            type="file"
            id="doc-upload"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="doc-upload" className="cursor-pointer">
            <div className="text-lg font-semibold text-gray-800 mb-2">
              {file ? file.name : 'Click to upload document'}
            </div>
            <div className="text-sm text-gray-500">PDF, DOCX, or TXT (max 10MB)</div>
          </label>

          {file && (
            <button
              onClick={handleUpload}
              disabled={processing}
              className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold flex items-center gap-2 mx-auto"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Brain size={20} /> Process Document
                </>
              )}
            </button>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FileText size={24} className="text-green-600" />
                Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Key Points */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">📌 Key Points</h3>
              <ul className="space-y-2">
                {result.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Questions */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">❓ Generated Quiz ({result.questions.length} questions)</h3>
              <p className="text-gray-600 mb-4">Quiz saved! View it in the "All Quizzes" section below.</p>
            </div>
          </div>
        )}
      </div>

      {/* All Quizzes */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">📚 All Generated Quizzes ({quizzes.length})</h3>

        {quizzes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Brain size={48} className="mx-auto mb-4 opacity-20" />
            <p>No quizzes yet. Upload a document to generate one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div key={quiz._id} className="border-2 rounded-xl p-4 hover:border-indigo-300 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{quiz.documentName}</h4>
                    <p className="text-sm text-gray-500">
                      {quiz.questions.length} questions • {new Date(quiz.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedQuiz(quiz)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Take Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      {selectedQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{selectedQuiz.documentName}</h3>
              <button
                onClick={() => {
                  setSelectedQuiz(null);
                  setUserAnswers({});
                  setShowResults(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-gray-800 mb-2">📝 Summary:</h4>
              <p className="text-gray-700 text-sm">{selectedQuiz.summary}</p>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {selectedQuiz.questions.map((q, idx) => (
                <div key={idx} className="border-2 rounded-xl p-4">
                  <h4 className="font-bold text-gray-800 mb-3">
                    Q{idx + 1}. {q.question}
                  </h4>
                  <div className="space-y-2">
                    {q.options.map((option, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerSelect(idx, option)}
                        disabled={showResults}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                          userAnswers[idx] === option
                            ? showResults
                              ? option === q.correctAnswer
                                ? 'bg-green-100 border-green-500'
                                : 'bg-red-100 border-red-500'
                              : 'bg-indigo-100 border-indigo-500'
                            : showResults && option === q.correctAnswer
                            ? 'bg-green-100 border-green-500'
                            : 'border-gray-300 hover:border-indigo-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {showResults && (
                    <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-4">
              {!showResults ? (
                <button
                  onClick={() => setShowResults(true)}
                  disabled={Object.keys(userAnswers).length !== selectedQuiz.questions.length}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                >
                  Submit Quiz
                </button>
              ) : (
                <div className="flex-1 bg-indigo-100 border-2 border-indigo-300 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    {calculateScore().toFixed(0)}%
                  </div>
                  <div className="text-gray-700">
                    {Object.keys(userAnswers).filter((k) => userAnswers[k] === selectedQuiz.questions[k].correctAnswer).length} / {selectedQuiz.questions.length} correct
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}