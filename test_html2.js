import http from 'http';

http.get(`http://localhost:3000/syllabus/dean/approve/6a3af0eab8d07e82873b31ee`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const selectMatch = data.match(/<select id="approval-status"[\s\S]*?<\/select>/);
        if (selectMatch) {
            console.log('Select HTML:', selectMatch[0]);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
