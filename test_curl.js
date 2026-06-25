import http from 'http';

http.get('http://localhost:8300/syllabus/dean/approve/6a3af0eab8d07e82873b31ee', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const match = data.match(/<script type="application\/json" id="section-comments-data">([\s\S]*?)<\/script>/);
        if (match) {
            console.log('JSON Data:', match[1].trim());
        } else {
            console.log('Script tag not found!');
        }
    });
}).on('error', (e) => {
    console.error(e);
});
