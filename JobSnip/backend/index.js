import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.OPENROUTER_API_KEY,
    nodeVersion: process.version
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'JobSnip Backend Server',
    status: 'Running',
    endpoints: {
      health: '/health',
      analyze: '/analyze (POST)'
    }
  });
});

// Main analysis endpoint

app.post('/analyze', async (req, res) => {
  console.log('--- /analyze route hit ---');
  console.log('Request headers:', req.headers);
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  try {
    const { resumeText, jobDescription } = req.body;
    
    // Enhanced input validation
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          resumeText: !resumeText ? 'Resume text is required' : undefined,
          jobDescription: !jobDescription ? 'Job description is required' : undefined
        }
      });
    }

    if (typeof resumeText !== 'string' || typeof jobDescription !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input types',
        details: {
          resumeText: typeof resumeText !== 'string' ? `Expected string, got ${typeof resumeText}` : undefined,
          jobDescription: typeof jobDescription !== 'string' ? `Expected string, got ${typeof jobDescription}` : undefined
        }
      });
    }

    if (resumeText.length > 10000 || jobDescription.length > 5000) {
      return res.status(400).json({ 
        error: 'Input size exceeds limits',
        details: {
          resumeText: resumeText.length > 10000 ? 'Resume text exceeds 10000 character limit' : undefined,
          jobDescription: jobDescription.length > 5000 ? 'Job description exceeds 5000 character limit' : undefined
        }
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error: API key not configured.' 
      });
    }

    const prompt = `
You are an expert resume analyzer. Compare the following resume with the job description and provide analysis in VALID JSON format only.

RESUME:
${resumeText.substring(0, 3000)}${resumeText.length > 3000 ? '...[truncated]' : ''}

JOB DESCRIPTION:
${jobDescription.substring(0, 2000)}${jobDescription.length > 2000 ? '...[truncated]' : ''}

Respond with ONLY valid JSON in this exact format:
{
  "matchScore": number,
  "missingSkills": ["Skill1","Skill2","Skilln"],
  "improvements": ["point1", "point2", "pointn"]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'JobSnip Resume Analyzer',
        },
        body: JSON.stringify({
          model: 'qwen/qwen-2.5-72b-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errText = await response.text();
        let errorMessage;
        if (response.status === 401) {
          errorMessage = 'API authentication failed. Please contact support.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid request to AI service. Please check your inputs.';
        } else {
          errorMessage = 'AI service is temporarily unavailable.';
        }
        return res.status(response.status >= 500 ? 500 : 400).json({ 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? errText : undefined
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ 
          error: 'No response content from AI service.' 
        });
      }

      let structured;
      try {
        const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').replace(/^\s*[\r\n]/gm, '').trim();
        structured = JSON.parse(cleaned);
        
        if (typeof structured.matchScore !== 'number' || 
            !Array.isArray(structured.missingSkills) || 
            !Array.isArray(structured.improvements)) {
          throw new Error('Invalid response structure from AI');
        }
        
        structured.matchScore = Math.max(0, Math.min(100, Math.round(structured.matchScore)));
      } catch (parseError) {
        structured = {
          matchScore: 50,
          missingSkills: ["Analysis failed due to invalid AI response"],
          improvements: ["Please try again or contact support"]
        };
      }

      res.json(structured);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return res.status(408).json({ 
          error: 'Request timeout - the AI service took too long to respond.' 
        });
      }
      throw fetchError;
    }
  } catch (err) {
    res.status(500).json({ 
      error: 'Internal server error occurred while processing your request.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});



// 404 handler for unmatched routes
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    availableRoutes: ['GET /', 'GET /health', 'POST /analyze']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(port, () => {
  console.log(`JobSnip Backend Server`);
  console.log(` Server listening on port ${port}`);
  console.log(` Health check: http://localhost:${port}/health`);
  console.log(` Main endpoint: http://localhost:${port}/analyze`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` API Key configured: ${!!process.env.OPENROUTER_API_KEY ? 'yes' : 'no'}`);
  console.log(` Node.js version: ${process.version}`);
});