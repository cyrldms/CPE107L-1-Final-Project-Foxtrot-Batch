// ─── Requirement 11: Section Comments / Annotations ────────────────────────
(function initSectionComments() {
    const isReadOnly = typeof SYLLABUS_APPROVAL_DATA === 'undefined';

    // Helper to get current role string
    function getCurrentRole() {
        if (isReadOnly) return null;
        const rawRole = SYLLABUS_APPROVAL_DATA?.actionLabel;
        if (rawRole === 'Approval') return 'Dean';
        if (rawRole === 'Endorsement') return 'Program Chair';
        return 'Faculty';
    }

    // Load existing comments
    let comments = [];
    const commentsDataEl = document.getElementById('section-comments-data');
    if (commentsDataEl) {
        try {
            comments = JSON.parse(commentsDataEl.textContent);
        } catch(e) {}
    }
    
    // Add unique IDs to comments if they don't have one (for easy editing/deleting)
    comments = comments.map(c => {
        if (!c.id) c.id = 'cmt_' + Math.random().toString(36).substr(2, 9);
        return c;
    });
    window.currentSectionComments = comments;

    const sections = document.querySelectorAll('[data-section-key]');
    
    sections.forEach((header) => {
        const sectionKey = header.getAttribute('data-section-key');
        const sectionName = header.getAttribute('data-section-name') || header.innerText.trim();
        
        // Wrapper for header to align button
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.alignItems = 'center';
        wrapper.style.marginBottom = '15px';
        
        header.parentNode.insertBefore(wrapper, header);
        wrapper.appendChild(header);
        header.style.margin = '0'; // Remove default margin inside wrapper

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        
        function updateToggleButton() {
            const existingComments = window.currentSectionComments.filter(c => c.sectionKey === sectionKey);
            const countLabel = existingComments.length > 0 ? ` (${existingComments.length})` : '';

            toggleBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px; margin-right:4px;">chat</span> Feedback${countLabel}`;
            if (existingComments.length > 0) {
                toggleBtn.style.backgroundColor = '#e3f2fd';
                toggleBtn.style.color = '#0d47a1';
                toggleBtn.style.borderColor = '#90caf9';
            } else {
                toggleBtn.style.backgroundColor = '#f9f9f9';
                toggleBtn.style.color = '#555';
                toggleBtn.style.borderColor = '#ccc';
            }
        }

        toggleBtn.style.padding = '4px 8px';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.borderRadius = '4px';
        toggleBtn.style.borderWidth = '1px';
        toggleBtn.style.borderStyle = 'solid';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        
        updateToggleButton();

        // If read-only and no comments, hide button
        if (isReadOnly && window.currentSectionComments.filter(c => c.sectionKey === sectionKey).length === 0) {
            toggleBtn.style.display = 'none';
        }

        wrapper.appendChild(toggleBtn);

        // Comment container (Thread view)
        const commentContainer = document.createElement('div');
        commentContainer.className = 'section-comment-container';
        commentContainer.style.display = 'none';
        commentContainer.style.marginTop = '10px';
        commentContainer.style.marginBottom = '20px';
        commentContainer.style.padding = '15px';
        commentContainer.style.backgroundColor = '#f8f9fa';
        commentContainer.style.border = '1px solid #dee2e6';
        commentContainer.style.borderRadius = '6px';
        
        const threadDiv = document.createElement('div');
        threadDiv.className = 'comment-thread';
        
        // Render thread function
        function renderThread() {
            threadDiv.innerHTML = '';
            const sectionCmts = window.currentSectionComments.filter(c => c.sectionKey === sectionKey);
            
            if (sectionCmts.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.innerText = 'No feedback yet.';
                emptyMsg.style.fontSize = '13px';
                emptyMsg.style.color = '#6c757d';
                emptyMsg.style.fontStyle = 'italic';
                emptyMsg.style.margin = '0 0 10px 0';
                threadDiv.appendChild(emptyMsg);
            } else {
                sectionCmts.forEach(c => {
                    const cmtBox = document.createElement('div');
                    cmtBox.style.padding = '10px';
                    cmtBox.style.marginBottom = '10px';
                    cmtBox.style.backgroundColor = '#ffffff';
                    cmtBox.style.border = '1px solid #e9ecef';
                    cmtBox.style.borderRadius = '4px';
                    
                    const headerRow = document.createElement('div');
                    headerRow.style.display = 'flex';
                    headerRow.style.justifyContent = 'space-between';
                    headerRow.style.marginBottom = '6px';
                    
                    const metaInfo = document.createElement('div');
                    metaInfo.innerHTML = `<strong style="color:#495057; font-size:13px;">${c.reviewerName || c.reviewerRole}</strong> <span style="font-size:11px; color:#adb5bd; margin-left:5px;">(${c.reviewerRole})</span>`;
                    
                    headerRow.appendChild(metaInfo);
                    
                    // Edit/Delete buttons if current user
                    if (!isReadOnly && getCurrentRole() === c.reviewerRole) {
                        const actionsDiv = document.createElement('div');
                        
                        const editBtn = document.createElement('button');
                        editBtn.type = 'button';
                        editBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">edit</span>';
                        editBtn.style.border = 'none';
                        editBtn.style.background = 'none';
                        editBtn.style.cursor = 'pointer';
                        editBtn.style.color = '#007bff';
                        editBtn.title = "Edit";
                        
                        const deleteBtn = document.createElement('button');
                        deleteBtn.type = 'button';
                        deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">delete</span>';
                        deleteBtn.style.border = 'none';
                        deleteBtn.style.background = 'none';
                        deleteBtn.style.cursor = 'pointer';
                        deleteBtn.style.color = '#dc3545';
                        deleteBtn.style.marginLeft = '5px';
                        deleteBtn.title = "Delete";
                        
                        actionsDiv.appendChild(editBtn);
                        actionsDiv.appendChild(deleteBtn);
                        headerRow.appendChild(actionsDiv);
                        
                        // Edit logic
                        editBtn.addEventListener('click', () => {
                            textNode.style.display = 'none';
                            editContainer.style.display = 'block';
                            editTextarea.focus();
                        });
                        
                        // Delete logic
                        deleteBtn.addEventListener('click', () => {
                            if(confirm('Are you sure you want to delete this comment?')) {
                                window.currentSectionComments = window.currentSectionComments.filter(item => item.id !== c.id);
                                renderThread();
                                updateToggleButton();
                            }
                        });
                    }
                    
                    cmtBox.appendChild(headerRow);
                    
                    // Comment text
                    const textNode = document.createElement('p');
                    textNode.style.margin = '0';
                    textNode.style.fontSize = '13px';
                    textNode.style.color = '#212529';
                    textNode.style.whiteSpace = 'pre-wrap';
                    textNode.innerText = c.comment;
                    cmtBox.appendChild(textNode);
                    
                    // Edit container (hidden by default)
                    const editContainer = document.createElement('div');
                    editContainer.style.display = 'none';
                    editContainer.style.marginTop = '8px';
                    
                    const editTextarea = document.createElement('textarea');
                    editTextarea.style.width = '100%';
                    editTextarea.style.boxSizing = 'border-box';
                    editTextarea.style.padding = '8px';
                    editTextarea.style.border = '1px solid #80bdff';
                    editTextarea.style.borderRadius = '4px';
                    editTextarea.style.fontSize = '13px';
                    editTextarea.rows = 3;
                    editTextarea.value = c.comment;
                    
                    const editSaveBtn = document.createElement('button');
                    editSaveBtn.type = 'button';
                    editSaveBtn.innerText = 'Save';
                    editSaveBtn.style.marginTop = '6px';
                    editSaveBtn.style.padding = '4px 10px';
                    editSaveBtn.style.backgroundColor = '#007bff';
                    editSaveBtn.style.color = '#fff';
                    editSaveBtn.style.border = 'none';
                    editSaveBtn.style.borderRadius = '4px';
                    editSaveBtn.style.fontSize = '12px';
                    editSaveBtn.style.cursor = 'pointer';
                    
                    const editCancelBtn = document.createElement('button');
                    editCancelBtn.type = 'button';
                    editCancelBtn.innerText = 'Cancel';
                    editCancelBtn.style.marginTop = '6px';
                    editCancelBtn.style.marginLeft = '6px';
                    editCancelBtn.style.padding = '4px 10px';
                    editCancelBtn.style.backgroundColor = '#6c757d';
                    editCancelBtn.style.color = '#fff';
                    editCancelBtn.style.border = 'none';
                    editCancelBtn.style.borderRadius = '4px';
                    editCancelBtn.style.fontSize = '12px';
                    editCancelBtn.style.cursor = 'pointer';
                    
                    editSaveBtn.addEventListener('click', () => {
                        const newVal = editTextarea.value.trim();
                        if (newVal) {
                            const target = window.currentSectionComments.find(item => item.id === c.id);
                            if (target) target.comment = newVal;
                            renderThread();
                        }
                    });
                    
                    editCancelBtn.addEventListener('click', () => {
                        editContainer.style.display = 'none';
                        textNode.style.display = 'block';
                        editTextarea.value = c.comment; // reset
                    });
                    
                    editContainer.appendChild(editTextarea);
                    editContainer.appendChild(editSaveBtn);
                    editContainer.appendChild(editCancelBtn);
                    
                    cmtBox.appendChild(editContainer);
                    threadDiv.appendChild(cmtBox);
                });
            }
        }
        
        commentContainer.appendChild(threadDiv);

        // Add new comment UI
        if (!isReadOnly) {
            const addContainer = document.createElement('div');
            addContainer.style.marginTop = '15px';
            addContainer.style.borderTop = '1px dashed #dee2e6';
            addContainer.style.paddingTop = '15px';
            
            const textarea = document.createElement('textarea');
            textarea.placeholder = `Add feedback for ${sectionName}...`;
            textarea.style.width = '100%';
            textarea.style.boxSizing = 'border-box';
            textarea.style.padding = '10px';
            textarea.style.border = '1px solid #ced4da';
            textarea.style.borderRadius = '4px';
            textarea.style.fontSize = '13px';
            textarea.rows = 3;
            
            const postBtn = document.createElement('button');
            postBtn.type = 'button';
            postBtn.innerText = 'Post Feedback';
            postBtn.className = 'ad-section-save-btn';
            postBtn.style.marginTop = '8px';
            postBtn.style.padding = '6px 16px';
            postBtn.style.backgroundColor = '#28a745';
            postBtn.style.color = '#fff';
            postBtn.style.border = 'none';
            postBtn.style.borderRadius = '4px';
            postBtn.style.cursor = 'pointer';
            postBtn.style.fontSize = '13px';
            postBtn.style.fontWeight = 'bold';

            postBtn.addEventListener('click', () => {
                const val = textarea.value.trim();
                if (val) {
                    const role = getCurrentRole();
                    const nameInput = document.getElementById('signatory-name-input');
                    const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : role;
                    
                    window.currentSectionComments.push({
                        id: 'cmt_' + Math.random().toString(36).substr(2, 9),
                        sectionKey,
                        reviewerRole: role,
                        reviewerName: name,
                        comment: val,
                        createdAt: new Date()
                    });
                    
                    textarea.value = '';
                    renderThread();
                    updateToggleButton();
                }
            });

            addContainer.appendChild(textarea);
            addContainer.appendChild(postBtn);
            commentContainer.appendChild(addContainer);
        }

        renderThread();

        wrapper.parentNode.insertBefore(commentContainer, wrapper.nextSibling);

        toggleBtn.addEventListener('click', () => {
            if (commentContainer.style.display === 'none') {
                commentContainer.style.display = 'block';
                if (!isReadOnly) {
                    const ta = commentContainer.querySelector('textarea');
                    if (ta) ta.focus();
                }
            } else {
                commentContainer.style.display = 'none';
            }
        });
    });

    window.flushSectionComments = function() {
        // We no longer need to auto-save input on submit since we explicitly "Post Feedback",
        // but we can optionally save any non-empty textareas here if desired.
        // For now, doing nothing is safer to avoid accidental posts.
    };
})();
