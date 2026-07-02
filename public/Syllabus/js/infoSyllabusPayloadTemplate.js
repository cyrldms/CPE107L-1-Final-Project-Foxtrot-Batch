// Append to infoSyllabus.js
function saveInfoToSession() {
    const payload = {};

    // 1. Basic Info
    const courseCode = document.querySelector('.course-info-container .info-item:nth-child(1) .course-editable-text')?.innerText.trim() || '';
    const courseTitle = document.querySelector('.course-info-container .info-item:nth-child(2) .course-editable-text')?.innerText.trim() || '';
    
    // The panel structure in the ejs separates fields into different .content-panel-transparent sections.
    // We will select by standard query since the layout is fixed.
    const preRequisite = document.querySelectorAll('.content-panel-transparent:nth-of-type(2) .course-editable-text')[0]?.innerText.trim() || '';
    const coRequisite = document.querySelectorAll('.content-panel-transparent:nth-of-type(2) .course-editable-text')[1]?.innerText.trim() || '';
    
    const units = document.querySelectorAll('.content-panel-transparent:nth-of-type(3) .course-editable-text')[0]?.innerText.trim() || '';
    const lectureHours = parseFloat(document.querySelectorAll('.content-panel-transparent:nth-of-type(3) .course-editable-text')[1]?.value || '0') || 0;
    const labHours = parseFloat(document.querySelectorAll('.content-panel-transparent:nth-of-type(3) .course-editable-text')[2]?.value || '0') || 0;
    
    const courseDesignEl = document.querySelectorAll('.content-panel-transparent:nth-of-type(3) .course-editable-text')[3];
    const courseDesign = courseDesignEl ? (courseDesignEl.tagName === 'SELECT' ? courseDesignEl.value : courseDesignEl.innerText.trim()) : '';
    
    const courseDescription = document.querySelector('.course-desc-box')?.innerText.trim() || '';
    
    const term = document.querySelectorAll('.content-panel-transparent:nth-of-type(5) .course-editable-text')[0]?.innerText.trim() || '';
    const schoolYear = document.querySelectorAll('.content-panel-transparent:nth-of-type(5) .course-editable-text')[1]?.innerText.trim() || '';
    const programPreparedFor = document.querySelectorAll('.content-panel-transparent:nth-of-type(5) .course-editable-text')[2]?.innerText.trim() || '';

    const textbook = document.querySelectorAll('.content-panel-transparent:last-of-type .course-editable-text')[0]?.innerText.trim() || '';
    const references = document.querySelectorAll('.content-panel-transparent:last-of-type .course-editable-text')[1]?.innerText.trim() || '';

    payload.basicInfo = {
        courseCode, courseTitle, preRequisite, coRequisite, units, lectureHours, labHours,
        courseDesign, courseDescription, term, schoolYear, programPreparedFor,
        textbook, references
    };

    // 2. Program Educational Objectives (PEOs)
    // Structure: checkboxes for POa, POb etc.
    const poCheckboxes = document.querySelectorAll('.po-checkbox:checked');
    payload.programObjectives = Array.from(poCheckboxes).map(cb => cb.value);

    // 3. Course Outcomes (COs) Main List
    const coRows = document.querySelectorAll('.outcomes-row');
    payload.courseOutcomesList = Array.from(coRows).map((row, index) => {
        const text = row.querySelector('.outcomes-statement .outcomes-editable-text')?.innerText.trim() || '';
        const skills = row.querySelector('.outcomes-skills-side .outcomes-skills-select')?.value || row.querySelector('.outcomes-skills-side .outcomes-editable-text')?.innerText.trim() || '';
        return {
            coNumber: `CO${index + 1}`,
            text,
            skills
        };
    });

    // 4. Course Mapping Table
    const configRows = document.querySelectorAll('#mapping-body tr');
    payload.courseMapping = Array.from(configRows).map(row => {
        const tds = row.querySelectorAll('td');
        // first col is CO identifier
        const coLabel = tds[0].innerText.trim();
        // Since the "Program" cell spans multiple rows, it only exists in the first row. 
        // We just collect the dropdown values.
        const dropdowns = row.querySelectorAll('.custom-dropdown-trigger');
        const alignments = Array.from(dropdowns).map(d => d.dataset.value || '');
        return {
            coNumber: coLabel,
            alignments
        };
    });

    // 5. Course Outcomes Editor Table (Description, Thinking Skills, Tasks)
    const editorRows = document.querySelectorAll('#outcomes-editor-body tr');
    payload.courseOutcomesEditor = Array.from(editorRows)
        .filter(r => r.style.display !== 'none')
        .slice(0, payload.courseOutcomesList ? payload.courseOutcomesList.length : 0)
        .map((row, index) => {
        const cells = row.querySelectorAll('.editable-cell');
        // Inject thinkingSkills from the Course Outcomes Grid dropdown (Req 6)
        const skillsFromGrid = payload.courseOutcomesList && payload.courseOutcomesList[index]
            ? payload.courseOutcomesList[index].skills
            : '';
        return {
            coNumber: cells[0]?.innerText.trim() || '',
            description: cells[1]?.innerText.trim() || '',
            thinkingSkills: skillsFromGrid || ''
        };
    });

    // Save concept map base64 if it has a src
    const conceptMapImg = document.getElementById('concept-map-preview');
    if (conceptMapImg && conceptMapImg.src && conceptMapImg.src.startsWith('data:')) {
        payload.conceptMap = conceptMapImg.src;
    }

    sessionStorage.setItem('syllabusFormDraft', JSON.stringify(payload));
    window.location.href = '/syllabus/schedule';
}
