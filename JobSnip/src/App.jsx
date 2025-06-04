import React, { useState } from 'react';

function JobSnip() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');

  const handleFileChange = (e) => {
    setResumeFile(e.target.files[0]);
  };

  const handleAnalyze = () => {
    if (!resumeFile || !jobDescription.trim()) {
      alert('Please upload a resume and enter a job description.');
      return;
    }
    alert(`Analyzing resume: ${resumeFile.name}\nJob description length: ${jobDescription.length}`);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <div className="mb-6">
        <label htmlFor="resume" className="block font-semibold mb-2">Upload Resume</label>
        <input
          type="file"
          id="resume"
          onChange={handleFileChange}
          className="w-full border border-gray-300 rounded px-4 py-2"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="job-description" className="block font-semibold mb-2">Job Description</label>
        <textarea
          id="job-description"
          placeholder="Paste job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="w-full h-40 border border-gray-300 rounded px-4 py-2"
        />
      </div>

      <div className="text-right">
        <button
          onClick={handleAnalyze}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Analyze
        </button>
      </div>
    </div>
  );
}

export default JobSnip;
