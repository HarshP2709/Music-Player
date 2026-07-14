const https = require('https');

https.get('https://itunes.apple.com/search?term=bollywood&media=music&limit=5', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log(json.results.map(r => ({
            title: r.trackName,
            artist: r.artistName,
            cover: r.artworkUrl100.replace('100x100bb', '600x600bb'),
            audio: r.previewUrl
        })));
    });
});
