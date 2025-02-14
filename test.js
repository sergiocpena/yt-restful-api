const YouTubeTranscriptAPI = require('./api.js');

async function test() {
    try {
        // Let's test with a popular video - you can replace this ID with any YouTube video ID you want
        const videoId = 'jNQXAC9IVRw'; // This is "Me at the zoo", the first YouTube video ever
        console.log('Fetching transcript...');
        
        const transcript = await YouTubeTranscriptAPI.getTranscript(videoId, 'en');
        console.log('Transcript:', transcript);
    } catch (error) {
        console.error('Error:', error);
    }
}

test(); 