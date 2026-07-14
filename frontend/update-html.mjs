import fs from 'fs';

const files = ['dashboard.html'];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<script type="module">[\s\S]*?<\/script>/, '<script type="module" src="js/app.js"></script>');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}
