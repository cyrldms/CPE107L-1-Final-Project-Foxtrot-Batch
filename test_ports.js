import http from 'http';

const ports = [3000, 8000, 8080, 8100, 8200, 8300, 8400, 8500];

function tryPort(port) {
    return new Promise((resolve) => {
        http.get(`http://localhost:${port}/syllabus/dean/approve/6a3af0eab8d07e82873b31ee`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const match = data.match(/<script type="application\/json" id="section-comments-data">([\s\S]*?)<\/script>/);
                if (match) {
                    console.log(`[Port ${port}] Found script tag:`, match[1].trim());
                } else {
                    console.log(`[Port ${port}] No script tag found`);
                }
                resolve();
            });
        }).on('error', (e) => {
            // console.log(`Port ${port} failed`);
            resolve();
        });
    });
}

async function run() {
    for (const port of ports) {
        await tryPort(port);
    }
}
run();
