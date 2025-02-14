"use strict";

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { DOMParser } = require('xmldom');
const express = require('express');

// Create the express app
const app = express();

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// API endpoint
app.get('/youtube-transcript/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        
        // Get YouTube page
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await response.text();
        
        // Find caption tracks
        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (!match) throw new Error('No captions found for this video');
        
        const tracks = JSON.parse(match[1]);
        const langTrack = tracks.find(track => track.languageCode === 'en');
        if (!langTrack) throw new Error('No English captions found');
        
        // Get transcript
        const transcriptResponse = await fetch(langTrack.baseUrl);
        const xml = await transcriptResponse.text();
        
        // Parse XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const texts = doc.getElementsByTagName('text');
        
        // Format response
        const transcript = Array.from(texts).map(text => ({
            text: text.textContent,
            start: parseFloat(text.getAttribute('start')),
            duration: parseFloat(text.getAttribute('dur'))
        }));
        
        res.json({ transcript });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Only start the server if this file is run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the app for Vercel
module.exports = app; 