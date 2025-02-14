"use strict";

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { DOMParser } = require('xmldom');
const express = require('express');

// Create the express app
const app = express();

// Transcript functions
async function getTranscript(videoId, lang = 'en') {
    const url = await getYoutubeTrackByAPI(videoId, lang);
    const xml = await fetchTranscript(url);
    return formatTranscript(xml);
}

async function getYoutubeTrackByAPI(videoId, lang) {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    const match = html.match(/"captionTracks":(\[.*?\])/);
    if (!match) throw new Error('No captions found for this video');
    
    const tracks = JSON.parse(match[1]);
    const langTrack = tracks.find(track => track.languageCode === lang);
    if (!langTrack) throw new Error(`No captions found for language: ${lang}`);
    
    return langTrack.baseUrl;
}

async function fetchTranscript(url) {
    const response = await fetch(url);
    return await response.text();
}

function formatTranscript(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const texts = doc.getElementsByTagName('text');
    
    return Array.from(texts).map(text => ({
        text: text.textContent,
        start: parseFloat(text.getAttribute('start')),
        duration: parseFloat(text.getAttribute('dur'))
    }));
}

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
        const transcript = await getTranscript(req.params.videoId, 'en');
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