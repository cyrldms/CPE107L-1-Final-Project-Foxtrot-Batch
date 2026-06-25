import http from 'http';

http.get(`http://localhost:3000/syllabus/dean/approve/6a3af0eab8d07e82873b31ee`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find approval status
        const statusMatch = data.match(/<span class="ad-status-indicator" id="status-indicator"><\/span>[\s\S]*?<select.*?id="approval-status"[\s\S]*?<option.*?selected>Approve<\/option>/);
        const hasApproval = data.includes('selected>Approve</option>');
        console.log(`Has Approve selected:`, hasApproval);
        
        // Find existingComment
        const commentMatch = data.match(/<textarea id="approval-comments" class="ad-comments-box".*?>([\s\S]*?)<\/textarea>/);
        if (commentMatch) {
            console.log('Approval Comments:', commentMatch[1]);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
