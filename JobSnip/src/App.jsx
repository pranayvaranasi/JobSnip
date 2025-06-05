import React, { useState } from 'react';
import './index.css';  

function JobSnip() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' }); // For inline messages

  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const resetMessage = () => setMessage({ type: '', text: '' });

  const handleFileChange = (e) => {
    resetMessage();
    const file = e.target.files[0];
    if (file) {
      if (validTypes.includes(file.type)) {
        setResumeFile(file);
      } else {
        setMessage({ type: 'error', text: 'Unsupported file type. Please upload PDF or Word documents.' });
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
        setMessage({ type: 'error', text: 'Unsupported file type. Please upload PDF or Word documents.' });
        setResumeFile(null);
      }
    }
  };

  const handleAnalyze = async () => {
    resetMessage();
    if (!resumeFile || !jobDescription.trim()) {
      setMessage({ type: 'error', text: 'Please upload a resume and enter a job description.' });
      return;
    }

    setIsAnalyzing(true);
    // Simulate analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setMessage({
        type: 'success',
        text: `Analysis complete! Resume: ${resumeFile.name}, Job description length: ${jobDescription.length} characters.`,
      });
    }, 2000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #1e293b 100%)',
      }}
    >
      <div className="w-full max-w-2xl">
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

        {/* Main Card Container */}
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
              aria-label="Drop your resume file here or click to browse"
            >
              <input
                type="file"
                id="resume"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx"
                disabled={isAnalyzing}
                aria-label="Upload your resume file"
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
                  <p className="text-xs">Supports PDF, DOC, DOCX files</p>
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
            <div className="relative">
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
                aria-label="Job description input"
              />
              <div className="absolute bottom-2 right-3 text-xs text-gray-400">{jobDescription.length} characters</div>
            </div>
          </div>

          {/* Inline Message */}
          {message.text && (
            <div
              className={`mb-4 text-center font-semibold ${
                message.type === 'error' ? 'text-red-400' : 'text-green-400'
              }`}
              role="alert"
              aria-live="assertive"
            >
              {message.text}
            </div>
          )}

          {/* Analyze Button */}
          <div className="text-center mb-6">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform ${
                isAnalyzing ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 hover:shadow-lg'
              }`}
              style={
                !isAnalyzing
                  ? {
                      background: 'linear-gradient(to right, #2563eb, #7c3aed)',
                    }
                  : {
                      background: '#4b5563',
                    }
              }
              aria-live="polite"
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

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm text-blue-300" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
              ⚡ AI-Powered
            </span>
            <span className="px-3 py-1 rounded-full text-sm text-purple-300" style={{ background: 'rgba(147, 51, 234, 0.2)' }}>
              🎯 Smart Matching
            </span>
            <span className="px-3 py-1 rounded-full text-sm text-green-300" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
              📊 Detailed Analysis
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-gray-400 text-sm">
          Upload your resume and job description to get personalized insights
        </div>
      </div>
    </div>
  );
}

export default JobSnip;
