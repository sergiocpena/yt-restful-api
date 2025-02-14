"use strict";

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { DOMParser } = require('xmldom');
const express = require('express');
const app = express();

class YouTubeTranscriptAPI {
  static async getTranscript(videoId, lang = 'en') {
    try {
      // First get available captions
      const tracks = await this.getYoutubeTrackByAPI(videoId, lang);
      if (!tracks || !tracks.captionTracksMap) {
        throw new Error('No captions available for this video');
      }

      // Get transcript for requested language
      const track = tracks.captionTracksMap.get(lang) || 
                   tracks.captionTracksMap.get(lang + '__asr') ||
                   tracks.captionTracksMap.values().next().value; // fallback to first available

      if (!track) {
        throw new Error(`No captions available for language: ${lang}`);
      }

      // Fetch and parse the actual transcript
      const transcriptData = await this.fetchTranscript(track.baseUrl);
      return this.formatTranscript(transcriptData);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw error;
    }
  }

  static async getYoutubeTrackByAPI(videoId, lang) {
    try {
      const response = await fetch("https://www.youtube.com/youtubei/v1/player", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        body: JSON.stringify({
          videoId: videoId,
          context: {
            client: {
              clientName: "WEB_EMBEDDED_PLAYER",
              clientVersion: "1.20241009.01.00"
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const captionsRenderer = data?.captions?.playerCaptionsTracklistRenderer;

      if (!captionsRenderer) {
        return { videoInfo: data };
      }

      const { captionTracks, translationLanguages } = captionsRenderer;
      const captionTracksMap = new Map();

      for (const track of captionTracks) {
        const langKey = track.kind === "asr" 
          ? `${track.languageCode}__asr` 
          : track.languageCode;
          
        if (!langKey) continue;
        
        const baseLang = langKey.split("-")[0];
        
        if (!captionTracksMap.has(langKey)) {
          captionTracksMap.set(langKey, track);
        }
        if (!captionTracksMap.has(baseLang)) {
          captionTracksMap.set(baseLang, track);
        }
      }

      return {
        captionTracksMap,
        playerCaptionsTrackListSource: captionsRenderer
      };

    } catch (error) {
      console.error('Error fetching YouTube tracks:', error);
      throw error;
    }
  }

  static async fetchTranscript(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error fetching transcript data:', error);
      throw error;
    }
  }

  static formatTranscript(rawTranscript) {
    // Parse XML transcript data and convert to readable format
    const transcript = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawTranscript, "text/xml");
    const textElements = xmlDoc.getElementsByTagName("text");

    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i];
      transcript.push({
        text: element.textContent,
        start: parseFloat(element.getAttribute("start")),
        duration: parseFloat(element.getAttribute("dur")),
      });
    }

    return transcript;
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

module.exports = YouTubeTranscriptAPI; 