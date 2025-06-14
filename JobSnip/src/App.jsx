import React, { useState } from 'react';
import './index.css';  
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
import mammoth from 'mammoth';

function JobSnip() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [analysisResult, setAnalysisResult] = useState(null);

  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  const resetMessage = () => {
    setMessage({ type: '', text: '' });
    setAnalysisResult(null);
  };

  const handleFileChange = (e) => {
    resetMessage();
    const file = e.target.files[0];
    if (file) {
      if (validTypes.includes(file.type)) {
        setResumeFile(file);
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Unsupported file type. Please upload PDF, Word documents, or plain text files.' 
        });
        setResumeFile(null);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    resetMessage();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validTypes.includes(file.type)) {
        setResumeFile(file);
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Unsupported file type. Please upload PDF, Word documents, or plain text files.' 
        });
        setResumeFile(null);
      }
    }
  };

  const readFileAsText = async (file) => {
  const type = file.type;

  if (type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (type === 'application/msword') {
    throw new Error('DOC (older Word format) is not supported. Please upload DOCX.');
  }

  // Plain text
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject('Failed to read file');
    reader.readAsText(file);
  });
};

  const handleAnalyze = async () => {
    resetMessage();
    
    if (!resumeFile || !jobDescription.trim()) {
      setMessage({ 
        type: 'error', 
        text: 'Please upload a resume and enter a job description.' 
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      let resumeText = await readFileAsText(resumeFile);
      if (!resumeText.trim()) {
        throw new Error('Resume text is empty after extraction.');
      }

      console.log('Sending analysis request...');
      console.log('Resume length:', resumeText.length);
      console.log('Job description length:', jobDescription.length);

      const requestBody = {
        resumeText: resumeText.trim(),
        jobDescription: jobDescription.trim()
      };

      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      const responseText = await res.text();
      console.log('Raw response:', responseText);

      if (!res.ok) {
        let errorMessage = 'Server responded with error';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('JSON parse error:', jsonErr);
        throw new Error('Invalid response format from server');
      }

      // Validate result structure
      if (!result || typeof result.matchScore === 'undefined') {
        throw new Error('Invalid analysis result structure');
      }

      setAnalysisResult(result);
      setMessage({
        type: 'success',
        text: 'Analysis completed successfully!'
      });

    } catch (err) {
      console.error('Analyze error:', err);
      setMessage({ 
        type: 'error', 
        text: err.message || 'An unexpected error occurred during analysis' 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #1e293b 100%)',
      }}
    >
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold mb-2"
            style={{
              background: 'linear-gradient(to right, #60a5fa, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            JobSnip
          </h1>
          <p className="text-gray-300 text-lg">AI-powered resume analysis for job matching</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div
            className="rounded-2xl border p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Resume Upload Section */}
            <div className="mb-6">
              <label className="flex items-center text-white font-semibold mb-3 text-lg" htmlFor="resume">
                <span className="mr-2">📄</span>
                Upload Resume
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                  dragActive
                    ? 'border-blue-400'
                    : resumeFile
                    ? 'border-green-400'
                    : 'border-gray-400 hover:border-blue-400'
                }`}
                style={{
                  backgroundColor: dragActive
                    ? 'rgba(59, 130, 246, 0.1)'
                    : resumeFile
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  position: 'relative', 
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="resume"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.txt"
                  disabled={isAnalyzing}
                />

                {resumeFile ? (
                  <div className="text-green-400">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="font-semibold text-sm">{resumeFile.name}</p>
                    <p className="text-xs text-gray-300 mt-1">Click to change file</p>
                  </div>
                ) : (
                  <div className="text-gray-300">
                    <div className="text-3xl mb-3">📁</div>
                    <p className="font-semibold mb-1 text-sm">Drop your resume here or click to browse</p>
                    <p className="text-xs">Supports PDF, DOC, DOCX, TXT files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description Section */}
            <div className="mb-6">
              <label className="flex items-center text-white font-semibold mb-3 text-lg" htmlFor="jobDescription">
                <span className="mr-2">💼</span>
                Job Description
              </label>
              <textarea
                id="jobDescription"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full h-32 rounded-xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
                disabled={isAnalyzing}
              />
              <div className="text-xs text-gray-400 mt-1">{jobDescription.length} characters</div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                isAnalyzing ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 hover:shadow-lg'
              }`}
              style={
                !isAnalyzing
                  ? { background: 'linear-gradient(to right, #2563eb, #7c3aed)' }
                  : { background: '#4b5563' }
              }
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>🔍</span>
                  <span>Analyze Match</span>
                </div>
              )}
            </button>
          </div>

          {/* Results Section */}
          <div
            className="rounded-2xl border p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h2 className="text-white font-semibold text-xl mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Analysis Results
            </h2>

            {message.text && (
              <div
                className={`mb-4 p-3 rounded-lg text-center font-semibold ${
                  message.type === 'error' 
                    ? 'text-red-400 bg-red-400/10' 
                    : 'text-green-400 bg-green-400/10'
                }`}
              >
                {message.text}
              </div>
            )}

            {analysisResult ? (
              <div className="space-y-6">
                {/* Match Score */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {analysisResult.matchScore}%
                  </div>
                  <div className="text-gray-300">Match Score</div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                    <div
                      className="h-3 rounded-full transition-all duration-1000"
                      style={{
                        width: `${analysisResult.matchScore}%`,
                        background: analysisResult.matchScore >= 70 
                          ? 'linear-gradient(to right, #10b981, #34d399)'
                          : analysisResult.matchScore >= 50
                          ? 'linear-gradient(to right, #f59e0b, #fbbf24)'
                          : 'linear-gradient(to right, #ef4444, #f87171)'
                      }}
                    />
                  </div>
                </div>

                {/* Missing Skills */}
                <div>
                  <h3 className="text-white font-semibold mb-2 flex items-center">
                    <span className="mr-2">🎯</span>
                    Missing Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.missingSkills?.length > 0 ? (
                      analysisResult.missingSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-full text-sm text-orange-300 bg-orange-400/20"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-green-400">No missing skills identified!</span>
                    )}
                  </div>
                </div>

                {/* Improvements */}
                <div>
                  <h3 className="text-white font-semibold mb-2 flex items-center">
                    <span className="mr-2">💡</span>
                    Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {analysisResult.improvements?.map((improvement, index) => (
                      <li key={index} className="text-gray-300 text-sm flex items-start">
                        <span className="mr-2 mt-1">•</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                Upload your resume and job description to see analysis results here.
              </div>
            )}
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <span className="px-3 py-1 rounded-full text-sm text-blue-300 bg-blue-400/20">
            ⚡ AI-Powered
          </span>
          <span className="px-3 py-1 rounded-full text-sm text-purple-300 bg-purple-400/20">
            🎯 Smart Matching
          </span>
          <span className="px-3 py-1 rounded-full text-sm text-green-300 bg-green-400/20">
            📊 Detailed Analysis
          </span>
        </div>
      </div>
    </div>
  );
}

export default JobSnip;