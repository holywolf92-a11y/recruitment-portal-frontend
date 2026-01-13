#!/usr/bin/env node

const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Backend URL from environment or default
// Prefer explicit env vars, but fall back to the known live API service.
// NOTE: The previously used gleaming-healing URL is a Redis service and will 404 for API routes.
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.API_BASE_URL ||
  'https://recruitment-portal-backend-production-d1f7.up.railway.app';

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Parse JSON
app.use(express.json());

// Proxy API requests to backend
app.use('/api', async (req, res) => {
  try {
    const apiUrl = `${BACKEND_URL}${req.originalUrl}`;
    const response = await axios({
      method: req.method,
      url: apiUrl,
      data: req.body,
      headers: {
        ...req.headers,
        'host': new URL(BACKEND_URL).host,
      },
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.message 
    });
  }
});

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Backend proxying to ${BACKEND_URL}`);
});
