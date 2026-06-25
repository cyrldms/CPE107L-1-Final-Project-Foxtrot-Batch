// ─── Requirement 11: Section Comments / Annotations ────────────────────────
(function initSectionComments() {
    const isReadOnly = typeof SYLLABUS_APPROVAL_DATA === 'undefined';

    // Load existing comments
    let comments = [];
    const commentsDataEl = document.getElementById('section-comments-data');
    if (commentsDataEl) {
        try {
            comments = JSON.parse(commentsDataEl.textContent);
        } catch(e) {}
    }
    window.currentSectionComments = comments;

    // Find all elements designated as section targets
    const sections = document.querySelectorAll('[data-section-key]');
    
    sections.forEach((header) => {
        const sectionKey = header.getAttribute('data-section-key');
        const sectionName = header.getAttribute('data-section-name') || header.innerText.trim();
        
        // Wrapper for header to align button
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.alignItems = 'center';
        
        header.parentNode.insertBefore(wrapper, header);
        wrapper.appendChild(header);
        header.style.margin = '0'; // Remove default margin inside wrapper

        const btn = document.createElement('button');
        btn.type = 'button';
        
        const existingComments = window.currentSectionComments.filter(c => c.sectionKey === sectionKey);
        const countLabel = existingComments.length > 0 ? ` !` : '';

        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px; margin-right:4px;">edit_note</span> Section Feedback<strong style="color:red; margin-left:4px;">${countLabel}</strong>`;
        if (existingComments.length > 0) {
            btn.style.backgroundColor = '#ffeeba'; // highlight if there's a comment
            btn.style.borderColor = '#ffc107';
        } else {
            btn.style.backgroundColor = '#f9f9f9';
            btn.style.borderColor = '#ccc';
        }
        btn.style.padding = '4px 8px';
        btn.style.fontSize = '12px';
        btn.style.borderRadius = '4px';
        btn.style.borderWidth = '1px';
        btn.style.borderStyle = 'solid';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        if (isReadOnly && existingComments.length === 0) {
            return; // Faculty shouldn't see the button if there's no feedback
        }

        wrapper.appendChild(btn);

        // Comment container
        const commentContainer = document.createElement('div');
        commentContainer.className = 'section-comment-container';
        commentContainer.style.display = 'none';
        commentContainer.style.marginTop = '10px';
        commentContainer.style.marginBottom = '20px';
        commentContainer.style.padding = '10px';
        commentContainer.style.backgroundColor = '#fff3cd'; // Light yellow warning color for feedback
        commentContainer.style.border = '1px solid #ffeeba';
        commentContainer.style.borderRadius = '4px';
        
        // Group existing comments
        const pcComments = existingComments.filter(c => c.reviewerRole === 'Endorse Syllabus' || c.reviewerRole === 'Program Chair');
        const deanComments = existingComments.filter(c => c.reviewerRole === 'Approval' || c.reviewerRole === 'Dean' || c.reviewerRole === 'Approve Syllabus');
        const otherComments = existingComments.filter(c => !['Endorse Syllabus', 'Program Chair', 'Approval', 'Dean', 'Approve Syllabus'].includes(c.reviewerRole));

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.marginBottom = '10px';
        buttonsContainer.style.flexWrap = 'wrap';

        const contentContainer = document.createElement('div');

        function createToggleView(btnText, commentsArray) {
            if (commentsArray.length === 0) return null;
            
            const tBtn = document.createElement('button');
            tBtn.type = 'button';
            tBtn.innerText = btnText;
            tBtn.style.padding = '6px 12px';
            tBtn.style.fontSize = '12px';
            tBtn.style.cursor = 'pointer';
            tBtn.style.borderRadius = '4px';
            tBtn.style.border = '1px solid #ccc';
            tBtn.style.backgroundColor = '#f9f9f9';
            
            const viewDiv = document.createElement('div');
            viewDiv.style.display = 'none';
            viewDiv.style.padding = '10px';
            viewDiv.style.backgroundColor = '#fff';
            viewDiv.style.border = '1px solid #eee';
            viewDiv.style.borderRadius = '4px';
            
            commentsArray.forEach(c => {
                const p = document.createElement('p');
                p.style.margin = '0 0 8px 0';
                p.style.fontSize = '13px';
                p.innerHTML = `<strong>${c.reviewerName}:</strong> ${c.comment}`;
                viewDiv.appendChild(p);
            });
            
            buttonsContainer.appendChild(tBtn);
            contentContainer.appendChild(viewDiv);
            
            tBtn.addEventListener('click', () => {
                const isShowing = viewDiv.style.display === 'block';
                Array.from(contentContainer.children).forEach(child => child.style.display = 'none');
                Array.from(buttonsContainer.children).forEach(b => {
                    if (b.innerText === 'Add Comment') {
                        b.style.backgroundColor = '#d4edda';
                        b.style.color = '#155724';
                        b.style.border = '1px solid #28a745';
                    } else {
                        b.style.backgroundColor = '#f9f9f9';
                        b.style.fontWeight = 'normal';
                    }
                });
                
                if (!isShowing) {
                    viewDiv.style.display = 'block';
                    tBtn.style.backgroundColor = '#e2e6ea';
                    tBtn.style.fontWeight = 'bold';
                }
            });
            
            return { btn: tBtn, viewDiv };
        }

        createToggleView('Comments from Program Chair', pcComments);
        createToggleView('Comments from Dean', deanComments);
        createToggleView('Other Comments', otherComments);

        if (!isReadOnly) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.innerText = 'Add Comment';
            addBtn.style.padding = '6px 12px';
            addBtn.style.fontSize = '12px';
            addBtn.style.cursor = 'pointer';
            addBtn.style.borderRadius = '4px';
            addBtn.style.border = '1px solid #28a745';
            addBtn.style.backgroundColor = '#d4edda';
            addBtn.style.color = '#155724';
            
            const addView = document.createElement('div');
            addView.style.display = 'none';
            
            const textarea = document.createElement('textarea');
            textarea.placeholder = `Add feedback for ${sectionName}...`;
            textarea.style.width = '100%';
            textarea.style.boxSizing = 'border-box';
            textarea.style.padding = '8px';
            textarea.style.border = '1px solid #ccc';
            textarea.style.borderRadius = '4px';
            textarea.style.fontSize = '13px';
            textarea.rows = 3;
            
            const currentRole = SYLLABUS_APPROVAL_DATA?.actionLabel || 'Faculty';
            const myDraft = existingComments.find(c => c.reviewerRole === currentRole);
            if (myDraft) {
                textarea.value = myDraft.comment;
            }

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'ad-section-save-btn';
            saveBtn.innerText = 'Save Comment';
            saveBtn.style.marginTop = '8px';
            saveBtn.style.padding = '6px 12px';
            saveBtn.style.backgroundColor = '#f9f9f9';
            saveBtn.style.color = '#333';
            saveBtn.style.border = '1px solid #ccc';
            saveBtn.style.borderRadius = '4px';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.fontSize = '12px';
            saveBtn.style.display = 'none';

            textarea.addEventListener('input', () => {
                saveBtn.style.display = 'inline-block';
            });
            textarea.addEventListener('focus', () => {
                saveBtn.style.display = 'inline-block';
            });

            saveBtn.addEventListener('click', () => {
                const val = textarea.value.trim();
                const role = SYLLABUS_APPROVAL_DATA?.actionLabel || 'Faculty';
                const name = document.getElementById('signatory-name-input')?.value || 'Reviewer';
                
                window.currentSectionComments = window.currentSectionComments.filter(
                    c => !(c.sectionKey === sectionKey && c.reviewerRole === role)
                );
                
                if (val) {
                    window.currentSectionComments.push({
                        sectionKey,
                        reviewerRole: role,
                        reviewerName: name,
                        comment: val,
                        createdAt: new Date()
                    });
                    
                    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px; margin-right:4px;">edit_note</span> Section Feedback<strong style="color:red; margin-left:4px;"> !</strong>`;
                    btn.style.backgroundColor = '#ffeeba';
                    btn.style.borderColor = '#ffc107';
                } else {
                    if (window.currentSectionComments.filter(c => c.sectionKey === sectionKey).length === 0) {
                        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px; margin-right:4px;">edit_note</span> Section Feedback`;
                        btn.style.backgroundColor = '#f9f9f9';
                        btn.style.borderColor = '#ccc';
                    }
                }
                saveBtn.style.display = 'none';
            });

            addView.appendChild(textarea);
            addView.appendChild(saveBtn);
            
            buttonsContainer.appendChild(addBtn);
            contentContainer.appendChild(addView);
            
            addBtn.addEventListener('click', () => {
                const isShowing = addView.style.display === 'block';
                Array.from(contentContainer.children).forEach(child => child.style.display = 'none');
                Array.from(buttonsContainer.children).forEach(b => {
                    if (b.innerText === 'Add Comment') {
                        b.style.backgroundColor = '#d4edda';
                        b.style.color = '#155724';
                        b.style.border = '1px solid #28a745';
                    } else {
                        b.style.backgroundColor = '#f9f9f9';
                        b.style.fontWeight = 'normal';
                    }
                });
                
                if (!isShowing) {
                    addView.style.display = 'block';
                    addBtn.style.backgroundColor = '#28a745';
                    addBtn.style.color = '#fff';
                    addBtn.style.fontWeight = 'bold';
                    textarea.focus();
                }
            });
        }

        if (buttonsContainer.children.length > 0) {
            commentContainer.appendChild(buttonsContainer);
            commentContainer.appendChild(contentContainer);
        } else {
            const p = document.createElement('p');
            p.innerText = 'No feedback yet.';
            p.style.fontSize = '13px';
            commentContainer.appendChild(p);
        }

        wrapper.parentNode.insertBefore(commentContainer, wrapper.nextSibling);

        btn.addEventListener('click', () => {
            commentContainer.style.display = commentContainer.style.display === 'none' ? 'block' : 'none';
            if (!isReadOnly && commentContainer.style.display === 'block') {
                const ta = commentContainer.querySelector('textarea');
                if (ta) ta.focus();
            }
        });
    });

    window.flushSectionComments = function() {
        document.querySelectorAll('.ad-section-save-btn').forEach(btn => {
            if (btn.style.display !== 'none') {
                btn.click();
            }
        });
    };
})();
