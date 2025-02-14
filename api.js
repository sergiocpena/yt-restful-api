"use strict";

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { DOMParser } = require('xmldom');
const express = require('express');
const app = express();

class YouTubeTranscriptAPI {
    constructor() {}  // Add empty constructor

    static async getTranscript(videoId, lang = 'en') {
        const url = await this.getYoutubeTrackByAPI(videoId, lang);
        const xml = await this.fetchTranscript(url);
        return this.formatTranscript(xml);
    }
    
    static async getYoutubeTrackByAPI(videoId, lang) {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await response.text();
        
        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (!match) throw new Error('No captions found for this video');
        
        const tracks = JSON.parse(match[1]);
        const langTrack = tracks.find(track => track.languageCode === lang);
        if (!langTrack) throw new Error(`No captions found for language: ${lang}`);
        
        return langTrack.baseUrl;
    }
    
    static async fetchTranscript(url) {
        const response = await fetch(url);
        return await response.text();
    }
    
    static formatTranscript(xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const texts = doc.getElementsByTagName('text');
        
        return Array.from(texts).map(text => ({
            text: text.textContent,
            start: parseFloat(text.getAttribute('start')),
            duration: parseFloat(text.getAttribute('dur'))
        }));
    }
}

// Add CORS headers for V0
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Update endpoint to use V0's convention
app.get('/youtube-transcript/:videoId', async (req, res) => {
    try {
        const transcript = await YouTubeTranscriptAPI.getTranscript(req.params.videoId, 'en');
        res.json({ transcript });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// V0 uses process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { YouTubeTranscriptAPI, app }; 