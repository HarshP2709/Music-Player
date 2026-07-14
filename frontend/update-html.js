const fs = require('fs');

const files = ['favorites.html', 'playlist.html', 'profile.html'];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // Use regex to replace the <script type="module"> till near the end
    content = content.replace(/<script type="module">[\s\S]*?<\/script>/, '<script type="module" src="js/app.js"></script>');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}
