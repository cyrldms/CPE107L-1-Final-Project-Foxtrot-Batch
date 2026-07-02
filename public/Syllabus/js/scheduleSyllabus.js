let isSelecting = false;
let startCell = null;
let currentRange = { minR: -1, maxR: -1, minC: -1, maxC: -1 };

function getAuthoritativeCourseOutcomes() {
    const key = `syllabusFormDraft_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    const draftStr = sessionStorage.getItem(key);
    if (draftStr) {
        try {
            const draft = JSON.parse(draftStr);
            if (draft.courseOutcomesEditor && draft.courseOutcomesEditor.length > 0) {
                return draft.courseOutcomesEditor.map(co => co.coNumber).filter(v => !!v);
            }
        } catch (e) {
            console.error("Error parsing syllabusFormDraft for COs", e);
        }
    }
    
    // Fallback to server data
    if (window.SERVER_SYLLABUS_DATA && window.SERVER_SYLLABUS_DATA.syl && window.SERVER_SYLLABUS_DATA.syl.CourseOutcomes) {
        // Not directly accessible if it's an ObjectId reference array, but `assessment` has the populated ones
    }
    if (window.SERVER_SYLLABUS_DATA && window.SERVER_SYLLABUS_DATA.assessment && window.SERVER_SYLLABUS_DATA.assessment.length > 0) {
        return window.SERVER_SYLLABUS_DATA.assessment.map(co => co.coNumber).filter(v => !!v);
    }
    return [];
}

function setCellData(cell, value, useHTML = false) {
    if (!cell) return;
    
    const strValue = (value === null || value === undefined) ? '' : String(value);
    
    const sel = cell.querySelector('select.co-dropdown');
    if (sel) {
        let valToSet = useHTML ? strValue.replace(/<[^>]*>?/gm, '').trim() : strValue.trim();
        let exists = Array.from(sel.options).some(opt => opt.value === valToSet);
        if (!exists && valToSet !== '') {
            const newOpt = document.createElement('option');
            newOpt.value = valToSet;
            newOpt.text = valToSet;
            sel.appendChild(newOpt);
        }
        sel.value = valToSet;
        sel.style.color = sel.value ? '#000' : '#888';
    } else {
        if (useHTML) cell.innerHTML = strValue;
        else cell.innerText = strValue;
    }
}

function addScheduleRow() {
    const tbody = document.getElementById('schedule-editor-body');
    addRow(tbody, 12);
}

function addEvaluationRow() {
    const tbody = document.getElementById('evaluation-editor-body');
    addRow(tbody, 7);
}

function addAssessmentRow() {
    const tbody = document.getElementById('assessment-editor-body');
    addRow(tbody, 3);
}

function addRow(tbody, colCount) {
    if (!tbody) return;
    const tr = document.createElement('tr');

    for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        // Center text for first 5 columns of schedule table, or first 2 of evaluation table
        if (tbody.id === 'schedule-editor-body' && i < 5) td.className = 'center-text';
        if (tbody.id === 'evaluation-editor-body' && i < 2) td.className = 'center-text';

        const div = document.createElement('div');
        div.className = 'editable-cell';
        
        const isTargetCOCol = (tbody.id === 'schedule-editor-body' && i === 1) ||
                              (tbody.id === 'evaluation-editor-body' && i === 1) ||
                              (tbody.id === 'assessment-editor-body' && i === 0);

        if (isTargetCOCol) {
            div.contentEditable = 'false';
            const select = document.createElement('select');
            select.className = 'co-dropdown';
            select.style.width = '100%';
            select.style.border = 'none';
            select.style.backgroundColor = 'transparent';
            select.style.outline = 'none';
            select.style.textAlign = 'center';
            select.style.fontFamily = 'inherit';
            select.style.fontSize = 'inherit';
            select.style.cursor = 'pointer';
            select.style.color = '#888'; // Initial gray color for placeholder
            
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            // For Evaluation table, use #. For others, use - Select -
            defaultOpt.text = (tbody.id === 'evaluation-editor-body') ? '#' : '- Select -';
            defaultOpt.style.color = '#888';
            select.appendChild(defaultOpt);

            const cos = getAuthoritativeCourseOutcomes();
            cos.forEach(co => {
                const opt = document.createElement('option');
                opt.value = co;
                opt.text = co;
                opt.style.color = '#000'; // Real options are black
                select.appendChild(opt);
            });
            
            if (window.SYLLABUS_STATUS === 'Archived') {
                select.disabled = true;
                select.title = 'Syllabus is finalized.';
            }

            select.addEventListener('mousedown', (e) => e.stopPropagation());
            select.addEventListener('change', (e) => {
                // Change color based on selection
                select.style.color = select.value ? '#000' : '#888';
                autoSaveSchedule();
            });
            div.appendChild(select);
        } else {
            // Req 7: Lock Date Covered if syllabus is NOT Archived, lock the rest if Archived
            if (window.SYLLABUS_STATUS === 'Archived') {
                if (tbody.id === 'schedule-editor-body' && i === 11) {
                    div.contentEditable = 'true';
                } else {
                    div.contentEditable = 'false';
                    div.style.backgroundColor = '#f4f4f4';
                    div.title = 'Syllabus is finalized.';
                }
            } else {
                if (tbody.id === 'schedule-editor-body' && i === 11) {
                    div.contentEditable = 'false';
                    div.style.backgroundColor = '#f4f4f4';
                    div.title = 'Date Covered can only be edited at the end of the term (Archived state).';
                } else {
                    div.contentEditable = 'true';
                }
            }
        }

        // Input Restrictions [cite: 173]
        div.addEventListener('keydown', (e) => {
            const tbodyId = tbody.id;
            const colIndex = parseInt(td.dataset.colIndex);

            // Allowed control keys for all restricted cells
            const controlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
            if (controlKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) return;

            // Evaluation Table: Weights (LT, PE, Modular, Final) should only be numbers
            if (tbodyId === 'evaluation-editor-body' && [3, 4, 5, 6].includes(colIndex)) {
                if (!/^[0-9.]$/.test(e.key)) {
                    e.preventDefault();
                } else if (e.key === '.' && div.innerText.includes('.')) {
                    e.preventDefault(); // Prevent double decimals
                }
            }

            // Assessment Table: MSP column should allow numbers, dots, and %
            if (tbodyId === 'assessment-editor-body' && colIndex === 2) {
                if (!/^[0-9.%]$/.test(e.key)) {
                    e.preventDefault();
                }
            }
        });

        // Prevention for Pasting
        div.addEventListener('paste', (e) => {
            const tbodyId = tbody.id;
            const colIndex = parseInt(td.dataset.colIndex);
            const text = (e.clipboardData || window.clipboardData).getData('text');

            if (tbodyId === 'evaluation-editor-body' && [3, 4, 5, 6].includes(colIndex)) {
                if (!/^[0-9.]*$/.test(text) || (text.includes('.') && div.innerText.includes('.'))) {
                    e.preventDefault();
                }
            }
            if (tbodyId === 'assessment-editor-body' && colIndex === 2) {
                if (!/^[0-9.%]*$/.test(text)) {
                    e.preventDefault();
                }
            }
        });

        td.appendChild(div);
        tr.appendChild(td);

        td.addEventListener('mousedown', (e) => {
            isSelecting = true;
            const box = document.getElementById('table-selection-box');
            if (box) {
                box.classList.add('dragging');
                // Move the box to the container of the current table
                const container = td.closest('.outcomes-table-container');
                if (container && box.parentElement !== container) {
                    container.appendChild(box);
                }
            }
            startCell = td;
            updateRange(td, td);
        });

        td.addEventListener('mouseenter', () => {
            if (isSelecting) {
                const startTable = startCell.closest('tbody');
                const targetTable = td.closest('tbody');
                if (startTable === targetTable) {
                    extendSelection(td);
                }
            }
        });
    }

    tbody.appendChild(tr);
    renumberRows(tbody);
}

function renumberRows(tbody) {
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach((tr, r) => {
        tr.dataset.rowIndex = r.toString();
        const tds = tr.querySelectorAll('td');
        tds.forEach((td, c) => {
            td.dataset.colIndex = c.toString();
        });
    });
}

function deleteScheduleRow() {
    const tbody = document.getElementById('schedule-editor-body');
    deleteRow(tbody);
}

function deleteEvaluationRow() {
    const tbody = document.getElementById('evaluation-editor-body');
    deleteRow(tbody);
}

function deleteAssessmentRow() {
    const tbody = document.getElementById('assessment-editor-body');
    deleteRow(tbody);
}

function deleteRow(tbody) {
    if (!tbody) return;
    const activeBody = startCell ? startCell.closest('tbody') : null;
    if (activeBody !== tbody) {
        // Fallback to last row if no active selection in this table
        if (tbody.rows.length > 0) tbody.deleteRow(-1);
        renumberRows(tbody);
        return;
    }

    if (currentRange.minR !== -1) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        for (let i = currentRange.maxR; i >= currentRange.minR; i--) {
            if (rows[i]) rows[i].remove();
        }
        hideSelectionBox();
    } else if (tbody.rows.length > 0) {
        tbody.deleteRow(-1);
    }
    renumberRows(tbody);
}

function execCmd(command, value = null) {
    const activeCell = document.querySelector('td.highlighted-cell .editable-cell');
    if (activeCell) activeCell.focus();
    document.execCommand(command, false, value);
}

// Selection Logic (Matching infoSyllabus.js)
function extendSelection(td) {
    if (!isSelecting) return;
    updateRange(startCell, td);
}

function updateRange(c1, c2) {
    if (!c1 || !c2) return;
    const r1 = parseInt(c1.closest('tr').dataset.rowIndex);
    const r2 = parseInt(c2.closest('tr').dataset.rowIndex);
    const col1 = parseInt(c1.dataset.colIndex);
    const col2 = parseInt(c2.dataset.colIndex);

    const range = {
        minR: Math.min(r1, r2),
        maxR: Math.max(r1, r2),
        minC: Math.min(col1, col2),
        maxC: Math.max(col1, col2)
    };

    const tbody = c1.closest('tbody');
    currentRange = expandRangeForMerges(tbody, range);
    renderSelection();
}

function expandRangeForMerges(tbody, range) {
    const expanded = { ...range };
    const rows = tbody.querySelectorAll('tr');
    let changed = true;

    while (changed) {
        changed = false;
        for (let r = expanded.minR; r <= expanded.maxR; r++) {
            const tr = rows[r];
            if (!tr) continue;
            const tds = tr.querySelectorAll('td');
            tds.forEach(td => {
                const c = parseInt(td.dataset.colIndex);
                const cs = td.colSpan || 1;
                const rs = td.rowSpan || 1;
                const cEnd = c + cs - 1;
                const rEnd = r + rs - 1;

                // If cell intersects with range, expand range to cover full cell
                if (cEnd >= expanded.minC && c <= expanded.maxC &&
                    rEnd >= expanded.minR && r <= expanded.maxR) {
                    if (c < expanded.minC) { expanded.minC = c; changed = true; }
                    if (cEnd > expanded.maxC) { expanded.maxC = cEnd; changed = true; }
                    if (r < expanded.minR) { expanded.minR = r; changed = true; }
                    if (rEnd > expanded.maxR) { expanded.maxR = rEnd; changed = true; }
                }
            });
        }
    }
    return expanded;
}

function renderSelection() {
    if (!startCell || currentRange.minR === -1) return;
    const tbody = startCell.closest('tbody');
    const container = tbody.closest('.outcomes-table-container');
    if (!tbody || !container) return;

    // Clear highlights from ALL tables
    document.querySelectorAll('td.highlighted-cell').forEach(td => td.classList.remove('highlighted-cell'));

    let minTop = Infinity, minLeft = Infinity, maxBottom = 0, maxRight = 0;
    let found = false;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach((tr, r) => {
        if (r >= currentRange.minR && r <= currentRange.maxR) {
            const tds = tr.querySelectorAll('td');
            tds.forEach((td, c) => {
                const colIndex = parseInt(td.dataset.colIndex);
                if (colIndex >= currentRange.minC && colIndex <= currentRange.maxC) {
                    if (td.style.display === 'none') return;
                    td.classList.add('highlighted-cell');
                    found = true;

                    const t = td.offsetTop;
                    const l = td.offsetLeft;
                    const w = td.offsetWidth;
                    const h = td.offsetHeight;

                    minTop = Math.min(minTop, t);
                    minLeft = Math.min(minLeft, l);
                    maxBottom = Math.max(maxBottom, t + h);
                    maxRight = Math.max(maxRight, l + w);
                }
            });
        }
    });

    const box = document.getElementById('table-selection-box');
    if (found && box) {
        box.style.display = 'block';
        box.style.top = (minTop - 1) + 'px';
        box.style.left = (minLeft - 1) + 'px';
        box.style.width = (maxRight - minLeft + 2) + 'px';
        box.style.height = (maxBottom - minTop + 2) + 'px';
    } else if (box) {
        box.style.display = 'none';
    }
}

function hideSelectionBox() {
    const box = document.getElementById('table-selection-box');
    if (box) box.style.display = 'none';
    document.querySelectorAll('td.highlighted-cell').forEach(td => td.classList.remove('highlighted-cell'));
    currentRange = { minR: -1, maxR: -1, minC: -1, maxC: -1 };
}

document.addEventListener('mouseup', () => {
    isSelecting = false;
    const box = document.getElementById('table-selection-box');
    if (box) box.classList.remove('dragging');
});

// Close palette if clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('color-palette-menu');
    if (menu && menu.classList.contains('active')) {
        const dropdowns = document.querySelectorAll('.color-picker-dropdown');
        let clickedInside = false;
        dropdowns.forEach(d => { if (d.contains(e.target)) clickedInside = true; });
        if (!clickedInside) menu.classList.remove('active');
    }
});

// Merge Function (Reference: infoSyllabus.js toggleMerge)
function toggleMerge() {
    if (currentRange.minR === -1 || !startCell) return;

    const tbody = startCell.closest('tbody');
    const rows = tbody.querySelectorAll('tr');
    let targetCell = null;
    let combinedHTML = '';
    const rowSpan = currentRange.maxR - currentRange.minR + 1;
    const colSpan = currentRange.maxC - currentRange.minC + 1;

    let isUnmerging = false;
    for (let r = currentRange.minR; r <= currentRange.maxR; r++) {
        const tr = rows[r];
        const tds = tr.querySelectorAll('td');
        tds.forEach(td => {
            const c = parseInt(td.dataset.colIndex);
            if (c >= currentRange.minC && c <= currentRange.maxC) {
                if (td && (td.rowSpan > 1 || td.colSpan > 1)) {
                    isUnmerging = true;
                    targetCell = td;
                }
            }
        });
        if (isUnmerging) break;
    }

    if (isUnmerging && targetCell) {
        const startR = parseInt(targetCell.closest('tr').dataset.rowIndex);
        const startC = parseInt(targetCell.dataset.colIndex);
        const rs = targetCell.rowSpan;
        const cs = targetCell.colSpan;
        for (let r = startR; r < startR + rs; r++) {
            const tr = rows[r];
            const tds = tr.querySelectorAll('td');
            tds.forEach(td => {
                const c = parseInt(td.dataset.colIndex);
                if (c >= startC && c < startC + cs) {
                    td.style.display = '';
                    td.rowSpan = 1;
                    td.colSpan = 1;
                }
            });
        }
    } else {
        for (let r = currentRange.minR; r <= currentRange.maxR; r++) {
            const tr = rows[r];
            const tds = tr.querySelectorAll('td');
            tds.forEach(td => {
                const c = parseInt(td.dataset.colIndex);
                if (c >= currentRange.minC && c <= currentRange.maxC) {
                    if (!td || td.style.display === 'none') return;
                    const div = td.querySelector('.editable-cell');
                    if (r === currentRange.minR && c === currentRange.minC) {
                        targetCell = td;
                        combinedHTML = div.innerHTML;
                    } else {
                        if (div.innerText.trim() !== '') combinedHTML += '<br>' + div.innerHTML;
                        td.style.display = 'none';
                    }
                }
            });
        }

        if (targetCell) {
            targetCell.rowSpan = rowSpan;
            targetCell.colSpan = colSpan;
            targetCell.style.display = '';
            targetCell.querySelector('.editable-cell').innerHTML = combinedHTML;
        }
    }

    renderSelection();
    renumberRows(tbody);
}

function fillCells() {
    if (currentRange.minR === -1 || !startCell) return;

    const tbody = startCell.closest('tbody');
    const rows = tbody.querySelectorAll('tr');

    // Get source cell
    const firstRow = rows[currentRange.minR];
    const tds = firstRow.querySelectorAll('td');
    // Find cell by colIndex since horizontal index might differ due to merge
    let sourceCell = null;
    tds.forEach(td => {
        if (parseInt(td.dataset.colIndex) === currentRange.minC) sourceCell = td;
    });

    if (!sourceCell) return;
    const sourceHTML = sourceCell.querySelector('.editable-cell').innerHTML;

    for (let r = currentRange.minR; r <= currentRange.maxR; r++) {
        const tr = rows[r];
        const tds = tr.querySelectorAll('td');
        tds.forEach(td => {
            const c = parseInt(td.dataset.colIndex);
            if (c >= currentRange.minC && c <= currentRange.maxC) {
                if ((r === currentRange.minR && c === currentRange.minC) || !td || td.style.display === 'none') return;
                const div = td.querySelector('.editable-cell');
                if (div) div.innerHTML = sourceHTML;
            }
        });
    }
    renderSelection();
}

let activeFillColor = '#FFFF00';

const themeColors = [
    '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
    '#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1de', '#e6e0ec', '#dbeef3', '#fdeada',
    '#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dee8', '#fbd5b5',
    '#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f',
    '#a5a5a5', '#262626', '#494429', '#17365d', '#365f91', '#953734', '#76923c', '#5f497a', '#31859b', '#e36c09',
    '#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244061', '#632423', '#4f6128', '#3f3151', '#205867', '#974806'
];

const standardColors = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];

function initColorPalette() {
    const themeGrid = document.getElementById('theme-colors-grid');
    const standardGrid = document.getElementById('standard-colors-grid');
    if (!themeGrid || !standardGrid) return;

    themeColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch';
        swatch.style.backgroundColor = color;
        swatch.onclick = (e) => { e.stopPropagation(); selectPaletteColor(color); };
        themeGrid.appendChild(swatch);
    });

    standardColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch';
        swatch.style.backgroundColor = color;
        swatch.onclick = (e) => { e.stopPropagation(); selectPaletteColor(color); };
        standardGrid.appendChild(swatch);
    });

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('color-palette-menu');
        if (menu && menu.classList.contains('active') && !e.target.closest('.color-picker-dropdown')) {
            menu.classList.remove('active');
        }
    });
}

function toggleColorPalette(e) {
    e.stopPropagation();
    const menu = document.getElementById('color-palette-menu');
    if (!menu) return;

    const dropdown = e.currentTarget.closest('.color-picker-dropdown');
    if (dropdown && menu.parentElement !== dropdown) {
        dropdown.appendChild(menu);
    }

    menu.classList.toggle('active');
}

function selectPaletteColor(color) {
    activeFillColor = color;
    updateActiveColorBar(color);
    applyActiveColor();
    const menu = document.getElementById('color-palette-menu');
    menu.classList.remove('active');
}

function updateActiveColorBar(color) {
    const bar = document.getElementById('active-color-bar');
    if (bar) bar.style.backgroundColor = color === 'transparent' ? '#ccc' : color;
}

function applyActiveColor() {
    if (currentRange.minR === -1 || !startCell) return;
    const tbody = startCell.closest('tbody');
    const rows = tbody.querySelectorAll('tr');
    for (let r = currentRange.minR; r <= currentRange.maxR; r++) {
        const tr = rows[r];
        if (!tr) continue;
        const tds = tr.querySelectorAll('td');
        tds.forEach(td => {
            const c = parseInt(td.dataset.colIndex);
            if (c >= currentRange.minC && c <= currentRange.maxC) {
                if (!td || td.style.display === 'none') return;
                td.style.setProperty('background-color', activeFillColor, 'important');
            }
        });
    }
    renderSelection();
}

function autoSaveSchedule() {
    const data = {
        schedule: Array.from(document.querySelectorAll('#schedule-editor-body tr')).map(row =>
            Array.from(row.querySelectorAll('.editable-cell')).map(cell => {
                const sel = cell.querySelector('select.co-dropdown');
                return sel ? sel.value : cell.innerHTML;
            })),
        evaluation: Array.from(document.querySelectorAll('#evaluation-editor-body tr')).map(row =>
            Array.from(row.querySelectorAll('.editable-cell')).map(cell => {
                const sel = cell.querySelector('select.co-dropdown');
                return sel ? sel.value : cell.innerHTML;
            })),
        assessment: Array.from(document.querySelectorAll('#assessment-editor-body tr')).map(row =>
            Array.from(row.querySelectorAll('.editable-cell')).map(cell => {
                const sel = cell.querySelector('select.co-dropdown');
                return sel ? sel.value : cell.innerHTML;
            }))
    };
    const key = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    sessionStorage.setItem(key, JSON.stringify(data));
}

function loadSchedule() {
    const key = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    const saved = sessionStorage.getItem(key);
    if (!saved) return;
    const data = JSON.parse(saved);

    const tables = [
        { id: 'schedule-editor-body', rows: data.schedule, func: addScheduleRow },
        { id: 'evaluation-editor-body', rows: data.evaluation, func: addEvaluationRow },
        { id: 'assessment-editor-body', rows: data.assessment, func: addAssessmentRow }
    ];

    tables.forEach(t => {
        const body = document.getElementById(t.id);
        if (body && t.rows) {
            body.innerHTML = ''; // Wipe defaults
            t.rows.forEach(rowContent => {
                t.func();
                const lastRow = body.lastElementChild;
                const cells = lastRow.querySelectorAll('.editable-cell');
                rowContent.forEach((html, i) => { 
                    if (cells[i]) setCellData(cells[i], html, true); 
                });
            });
        }
    });
}

// Wire it up
let finalSignatureBase64 = null;

window.addEventListener('load', () => {
    initColorPalette();
    initSignatureUI();

    const key = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    const savedSessionData = sessionStorage.getItem(key);
    const hasServerData = window.SERVER_SYLLABUS_DATA &&
        ((window.SERVER_SYLLABUS_DATA.schedules && window.SERVER_SYLLABUS_DATA.schedules.length > 0) ||
            (window.SERVER_SYLLABUS_DATA.evaluation && window.SERVER_SYLLABUS_DATA.evaluation.length > 0));

    if (hasServerData && !savedSessionData) {
        loadFromServer();
    } else if (savedSessionData) {
        loadFromSession();
    } else {
        // Initial defaults if nothing found
        const scheduleBody = document.getElementById('schedule-editor-body');
        if (scheduleBody) for (let i = 0; i < 5; i++) addScheduleRow();
        const evalBody = document.getElementById('evaluation-editor-body');
        if (evalBody) for (let i = 0; i < 3; i++) addEvaluationRow();
        const assessmentBody = document.getElementById('assessment-editor-body');
        if (assessmentBody) for (let i = 0; i < 3; i++) addAssessmentRow();
    }

    document.addEventListener('input', (e) => {
        if (e.target.closest('[contenteditable="true"]')) autoSaveSchedule();
    });
});

function initSignatureUI() {
    const role = (window.USER_ROLE || '').toLowerCase();
    
    // We don't show the overlay here; it is shown in submitSyllabus()
    const overlay = document.getElementById('submit-signature-modal-overlay');
    if (!overlay) return;

    // Close/Cancel Modal
    const hideModal = () => { overlay.style.display = 'none'; };
    document.getElementById('submit-signature-close').addEventListener('click', hideModal);
    document.getElementById('submit-signature-cancel').addEventListener('click', hideModal);

    // Confirm & Submit
    document.getElementById('submit-signature-confirm').addEventListener('click', () => {
        const sigNameInput = document.getElementById('submit-signatory-name');
        const sigName = sigNameInput ? sigNameInput.value.trim() : '';

        if (!sigName) {
            alert("Please enter the Signatory Name before submitting.");
            if (sigNameInput) sigNameInput.focus();
            return;
        }
        if (!finalSignatureBase64) {
            alert("Please upload or draw and save an E-Signature before submitting.");
            return;
        }

        if (window.currentSubmissionPayload) {
            window.currentSubmissionPayload.signatoryName = sigName;
            window.currentSubmissionPayload.signatureData = finalSignatureBase64;
            overlay.style.display = 'none';
            executeFinalSubmit(window.currentSubmissionPayload);
        }
    });

    const tabUpload = document.getElementById('submit-tab-upload');
    const tabDraw = document.getElementById('submit-tab-draw');
    const contentUpload = document.getElementById('submit-content-upload');
    const contentDraw = document.getElementById('submit-content-draw');

    // Tabs
    tabUpload.addEventListener('click', () => {
        tabUpload.style.background = '#a00100'; tabUpload.style.color = 'white';
        tabUpload.style.border = 'none';
        tabDraw.style.background = '#fff'; tabDraw.style.color = '#333';
        tabDraw.style.border = '1px solid #ccc';
        contentUpload.style.display = 'block'; contentDraw.style.display = 'none';
        finalSignatureBase64 = null; // Reset when switching
    });
    tabDraw.addEventListener('click', () => {
        tabDraw.style.background = '#a00100'; tabDraw.style.color = 'white';
        tabDraw.style.border = 'none';
        tabUpload.style.background = '#fff'; tabUpload.style.color = '#333';
        tabUpload.style.border = '1px solid #ccc';
        contentDraw.style.display = 'block'; contentUpload.style.display = 'none';
        finalSignatureBase64 = null;
        resizeCanvas();
    });

    // Upload Logic
    const box = document.getElementById('submit-signature-box');
    const input = document.getElementById('submit-signature-upload');
    const preview = document.getElementById('submit-signature-preview');
    const placeholder = document.getElementById('submit-signature-placeholder');
    const btnRemove = document.getElementById('submit-signature-remove');

    box.addEventListener('click', (e) => {
        if(e.target !== btnRemove) input.click();
    });

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            finalSignatureBase64 = ev.target.result;
            preview.src = finalSignatureBase64;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            btnRemove.style.display = 'flex';
            box.style.borderColor = '#28a745';
        };
        reader.readAsDataURL(file);
    });

    btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        finalSignatureBase64 = null;
        input.value = '';
        preview.src = '';
        preview.style.display = 'none';
        placeholder.style.display = 'block';
        btnRemove.style.display = 'none';
        box.style.borderColor = '#bbb';
    });

    // Draw Logic
    const canvas = document.getElementById('submit-signature-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;

    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.scale(ratio, ratio);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    const startDraw = (e) => {
        e.preventDefault();
        isDrawing = true;
        hasDrawn = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };
    const makeDraw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };
    const endDraw = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', makeDraw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseout', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', makeDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw);

    document.getElementById('submit-clear-canvas').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        finalSignatureBase64 = null;
    });

    document.getElementById('submit-use-drawn').addEventListener('click', () => {
        if (!hasDrawn) {
            alert('Please draw a signature first.');
            return;
        }
        finalSignatureBase64 = canvas.toDataURL('image/png');
        alert('Drawn signature saved for submission!');
    });
}

/* ── Final Submission Integration ── */
window.submitSyllabus = async function (actionType = 'submit') {
    try {
        // 1. Get step 1 data
        const key = `syllabusFormDraft_${window.CURRENT_SYLLABUS_ID || 'default'}`;
        const draftStr = sessionStorage.getItem(key);
        if (!draftStr) {
            alert('Missing data from Step 1. Please go back and fill out the previous form.');
            return;
        }
        const payload = JSON.parse(draftStr);

        if (!payload.syllabusId) {
            alert('CRITICAL ERROR: The Syllabus ID is missing from your session data. Please return to the Courses Dashboard and start again.');
            return;
        }

        // Roles checked later to show modal
        // 2. Course Schedule Table Validation
        const scheduleRows = document.querySelectorAll('#schedule-editor-body tr');
        if (scheduleRows.length === 0) {
            alert("All fields are required.");
            return;
        }

        payload.weeklySchedule = Array.from(scheduleRows)
            .filter(r => r.style.display !== 'none')
            .map(row => {
                const cells = row.querySelectorAll('.editable-cell');
                const coDropdown = cells[1]?.querySelector('select.co-dropdown');
                return {
                    week: cells[0]?.innerText.trim() || '',
                    coNumber: coDropdown ? coDropdown.value : (cells[1]?.innerText.trim() || ''),
                    moNumber: cells[2]?.innerText.trim() || '',
                    iloNumber: cells[3]?.innerText.trim() || '',
                    coverageDay: cells[4]?.innerText.trim() || '',
                    coverageTopic: cells[5]?.innerText.trim() || '',
                    tlaMode: cells[6]?.innerText.trim() || '',
                    tlaActivities: cells[7]?.innerText.trim() || '',
                    assessmentTaskMode: cells[8]?.innerText.trim() || '',
                    assessmentTaskTask: cells[9]?.innerText.trim() || '',
                    referenceNum: cells[10]?.innerText.trim() || '',
                    dateCovered: cells[11]?.innerText.trim() || ''
                };
            })
            .filter(data => 
                data.week || data.coNumber || data.moNumber || data.iloNumber || 
                data.coverageDay || data.coverageTopic || data.tlaMode || 
                data.tlaActivities || data.assessmentTaskMode || data.assessmentTaskTask || 
                data.referenceNum || data.dateCovered
            );

        if (payload.weeklySchedule.length === 0) {
            alert("All fields are required.");
            return;
        }

        // 3. Course Evaluation Table Validation
        const evalRows = document.querySelectorAll('#evaluation-editor-body tr');
        let evalFilled = false;
        payload.courseEvaluation = Array.from(evalRows)
            .filter(r => r.style.display !== 'none')
            .map(row => {
                const cells = row.querySelectorAll('.editable-cell');
                const coDropdown = cells[1]?.querySelector('select.co-dropdown');
                const rowData = {
                    moduleCode: cells[0]?.innerText.trim() || '',
                    coNumber: coDropdown ? coDropdown.value : (cells[1]?.innerText.trim() || ''),
                    mediatingOutcome: cells[2]?.innerText.trim() || '',
                    assessmentWeightLT: cells[3]?.innerText.trim() || '',
                    assessmentWeightPE: cells[4]?.innerText.trim() || '',
                    modularWeight: cells[5]?.innerText.trim() || '',
                    finalWeight: cells[6]?.innerText.trim() || ''
                };
                if (rowData.moduleCode || rowData.coNumber) evalFilled = true;
                return rowData;
            });

        if (!evalFilled) {
            alert("All fields are required.");
            return;
        }

        // 4. Assessment Tasks (CO Assessment) Table Validation
        const assessRows = document.querySelectorAll('#assessment-editor-body tr');
        if (assessRows.length === 0) {
            alert("All fields are required.");
            return;
        }

        let assessFilled = false;
        payload.courseOutcomesAssessment = Array.from(assessRows)
            .filter(r => r.style.display !== 'none')
            .map(row => {
                const cells = row.querySelectorAll('.editable-cell');
                const coDropdown = cells[0]?.querySelector('select.co-dropdown');
                const rowData = {
                    coNumber: coDropdown ? coDropdown.value : (cells[0]?.innerText.trim() || ''),
                    assessmentTasks: cells[1]?.innerText.trim() || '',
                    minSatisfactoryPerf: cells[2]?.innerText.trim() || ''
                };
                if (rowData.coNumber || rowData.assessmentTasks) assessFilled = true;
                return rowData;
            });

        if (!assessFilled) {
            alert("All fields are required.");
            return;
        }

        // 5. Finalize Submission or Show Modal
        payload.actionType = actionType;

        if (actionType === 'draft') {
            executeFinalSubmit(payload);
            return;
        }

        // Always skip modal and use dedicated signature page for submit action
        if (actionType === 'submit') {
            executeFinalSubmit(payload);
            return;
        }

        // Normal fallback for draft
        executeFinalSubmit(payload);

    } catch (error) {
        console.error("Submission failed:", error);
        alert("An error occurred during submission. Check console for details.");
    }
};

async function executeFinalSubmit(payload) {
    try {
        const fetchResponse = await fetch('/syllabus/schedule/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await fetchResponse.json();

        if (result.success) {
            const draftKey = `syllabusFormDraft_${window.CURRENT_SYLLABUS_ID || 'default'}`;
            const scheduleKey = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
            const infoKey = `syllabus_draft_info_${window.CURRENT_SYLLABUS_ID || 'default'}`;
            
            // Removed sessionStorage.removeItem so that if the user clicks BACK, 
            // the data is preserved and they won't encounter a "Missing data" error.
            // sessionStorage.removeItem(draftKey);
            // sessionStorage.removeItem(scheduleKey);
            // sessionStorage.removeItem(infoKey);
            
            if (payload.actionType === 'draft') {
                alert('Syllabus saved as a draft.');
            } else if (payload.actionType === 'submit') {
                alert('Syllabus saved. Awaiting Faculty Signature.');
            } else {
                alert('Syllabus successfully compiled and submitted for review!');
            }

            // Role-based redirection
            if (payload.actionType === 'submit') {
                window.location.href = `/faculty/submit/${window.CURRENT_SYLLABUS_ID}`;
                return;
            }

            const role = (window.USER_ROLE || '').toLowerCase();
            if (role === 'dean') {
                window.location.href = `/syllabus/${window.USER_ID}`;
            } else if (role === 'professor' || role === 'faculty') {
                window.location.href = '/faculty';
            } else if (role === 'program-chair' || role === 'program chair') {
                window.location.href = '/syllabus/prog-chair';
            } else {
                window.location.href = '/syllabus';
            }
        } else {
            alert('Error saving syllabus: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error("Submission backend call failed:", error);
        alert("An error occurred communicating with the server. Check console for details.");
    }
}

function loadFromServer() {
    if (!window.SERVER_SYLLABUS_DATA) return;
    const { schedules, evaluation, assessment } = window.SERVER_SYLLABUS_DATA;

    // Restore Weekly Schedule
    const scheduleBody = document.getElementById('schedule-editor-body');
    if (scheduleBody && schedules && schedules.length > 0) {
        scheduleBody.innerHTML = '';
        schedules.forEach(item => {
            addScheduleRow();
            const lastRow = scheduleBody.lastElementChild;
            const cells = lastRow.querySelectorAll('.editable-cell');
            if (cells.length >= 12) {
                setCellData(cells[0], item.week || "");
                setCellData(cells[1], item.outcomeCo || "");
                setCellData(cells[2], item.outcomeMo || "");
                setCellData(cells[3], item.outcomeIlo || "");
                setCellData(cells[4], item.coverageDay || "");
                setCellData(cells[5], item.coverageTopic || "");
                setCellData(cells[6], item.tlaMode || "");
                setCellData(cells[7], item.tlaActivities || "");
                setCellData(cells[8], item.assessmentTaskMode || "");
                setCellData(cells[9], item.assessmentTaskTask || "");
                setCellData(cells[10], item.referenceNum || "");
                setCellData(cells[11], item.dateCovered || "");
            }
        });
    }

    // Restore Course Evaluation
    const evalBody = document.getElementById('evaluation-editor-body');
    if (evalBody && evaluation && evaluation.length > 0) {
        evalBody.innerHTML = '';
        evaluation.forEach(item => {
            addEvaluationRow();
            const lastRow = evalBody.lastElementChild;
            const cells = lastRow.querySelectorAll('.editable-cell');
            if (cells.length >= 7) {
                setCellData(cells[0], item.moduleCode || "");
                setCellData(cells[1], item.coNumber || "");
                setCellData(cells[2], item.mediatingOutcome || "");
                setCellData(cells[3], item.onlineTaskWeight || "0");
                setCellData(cells[4], item.longExaminationWeight || "0");
                setCellData(cells[5], item.moduleWeight || "0");
                setCellData(cells[6], item.finalWeight || "0");
            }
        });
    }

    // Restore Course Outcomes Assessment Tasks
    const assessmentBody = document.getElementById('assessment-editor-body');
    if (assessmentBody && assessment && assessment.length > 0) {
        assessmentBody.innerHTML = '';
        assessment.forEach(item => {
            addAssessmentRow();
            const lastRow = assessmentBody.lastElementChild;
            const cells = lastRow.querySelectorAll('.editable-cell');
            if (cells.length >= 3) {
                setCellData(cells[0], item.coNumber || "");
                setCellData(cells[1], item.assessmentTasks || "");
                setCellData(cells[2], item.minSatisfactoryPerf || "0");
            }
        });
    }
}

function loadFromSession() {
    const key = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    const savedData = sessionStorage.getItem(key);
    if (!savedData) return;
    const data = JSON.parse(savedData);

    const scheduleBody = document.getElementById('schedule-editor-body');
    if (scheduleBody && data.schedule) {
        scheduleBody.innerHTML = '';
        data.schedule.forEach(rowCells => {
            addScheduleRow();
            const lastRow = scheduleBody.lastElementChild;
            const targetCells = lastRow.querySelectorAll('.editable-cell');
            rowCells.forEach((html, i) => { if (targetCells[i]) setCellData(targetCells[i], html, true); });
        });
    }

    const evalBody = document.getElementById('evaluation-editor-body');
    if (evalBody && data.evaluation) {
        evalBody.innerHTML = '';
        data.evaluation.forEach(rowCells => {
            addEvaluationRow();
            const lastRow = evalBody.lastElementChild;
            const targetCells = lastRow.querySelectorAll('.editable-cell');
            rowCells.forEach((html, i) => { if (targetCells[i]) setCellData(targetCells[i], html, true); });
        });
    }

    const assessmentBody = document.getElementById('assessment-editor-body');
    if (assessmentBody && data.assessment) {
        assessmentBody.innerHTML = '';
        data.assessment.forEach(rowCells => {
            addAssessmentRow();
            const lastRow = assessmentBody.lastElementChild;
            const targetCells = lastRow.querySelectorAll('.editable-cell');
            rowCells.forEach((html, i) => { if (targetCells[i]) setCellData(targetCells[i], html, true); });
        });
    }
}

// Req 7: Save only the Date Covered column
window.saveDateCoveredOnly = async function() {
    try {
        const scheduleRows = document.querySelectorAll('#schedule-editor-body tr');
        const dates = Array.from(scheduleRows)
            .filter(r => r.style.display !== 'none')
            .map(row => {
                const cells = row.querySelectorAll('.editable-cell');
                return cells[11] ? cells[11].innerHTML.trim() : "";
            });

        const fetchResponse = await fetch('/syllabus/schedule/update-date-covered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                syllabusID: window.CURRENT_SYLLABUS_ID,
                dates: dates
            })
        });

        const resData = await fetchResponse.json();
        if (!fetchResponse.ok || !resData.success) {
            throw new Error(resData.error || 'Server rejected the request.');
        }

        alert('Date Covered updated successfully!');
        window.location.href = '/syllabus';
    } catch (e) {
        console.error("Submit Error:", e);
        alert('Failed to save Date Covered. Check console for details.');
    }
};

// ==========================================
// RUN ON LOAD: Load Data into the HTML DOM!
// ==========================================
window.addEventListener('load', () => {
    const key = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    const savedSessionData = sessionStorage.getItem(key);
    const hasServerData = window.SERVER_SYLLABUS_DATA && 
                          ( (window.SERVER_SYLLABUS_DATA.schedules && window.SERVER_SYLLABUS_DATA.schedules.length > 0) || 
                            (window.SERVER_SYLLABUS_DATA.evaluation && window.SERVER_SYLLABUS_DATA.evaluation.length > 0) );

    if (hasServerData && !savedSessionData) {
        loadFromServer();
        if (result.success) {
            const draftKey = `syllabusFormDraft_${window.CURRENT_SYLLABUS_ID || 'default'}`;
            const scheduleKey = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
            const infoKey = `syllabus_draft_info_${window.CURRENT_SYLLABUS_ID || 'default'}`;
            
            // Removed sessionStorage.removeItem so that if the user clicks BACK, 
            // the data is preserved and they won't encounter a "Missing data" error.
            // sessionStorage.removeItem(draftKey);
            // sessionStorage.removeItem(scheduleKey);
            // sessionStorage.removeItem(infoKey);
            
            if (payload.actionType === 'draft') {
                alert('Syllabus saved as a draft.');
            } else if (payload.actionType === 'submit') {
                alert('Syllabus saved. Awaiting Faculty Signature.');
            } else {
                alert('Syllabus successfully compiled and submitted for review!');
            }

            // Role-based redirection
            if (payload.actionType === 'submit') {
                window.location.href = `/faculty/submit/${window.CURRENT_SYLLABUS_ID}`;
                return;
            }

            const role = (window.USER_ROLE || '').toLowerCase();
            if (role === 'dean') {
                window.location.href = `/syllabus/${window.USER_ID}`;
            } else if (role === 'professor' || role === 'faculty') {
                window.location.href = '/faculty';
            } else if (role === 'program-chair' || role === 'program chair') {
                window.location.href = '/syllabus/prog-chair';
            } else {
                window.location.href = '/syllabus';
            }
        } else {
            alert('Error saving syllabus: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error("Submission backend call failed:", error);
        alert("An error occurred communicating with the server. Check console for details.");
    }
}

function loadFromServer() {
    if (!window.SERVER_SYLLABUS_DATA) return;
    const { schedules, evaluation, assessment } = window.SERVER_SYLLABUS_DATA;

    // Restore Weekly Schedule
    const scheduleBody = document.getElementById('schedule-editor-body');
    if (scheduleBody && schedules && schedules.length > 0) {
        scheduleBody.innerHTML = '';
        schedules.forEach(item => {
            addScheduleRow();
            const lastRow = scheduleBody.lastElementChild;
            const cells = lastRow.querySelectorAll('.editable-cell');
            if (cells.length >= 12) {
                setCellData(cells[0], item.week || "");
                setCellData(cells[1], item.outcomeCo || "");
                setCellData(cells[2], item.outcomeMo || "");
                setCellData(cells[3], item.outcomeIlo || "");
                setCellData(cells[4], item.coverageDay || "");
                setCellData(cells[5], item.coverageTopic || "");
                setCellData(cells[6], item.tlaMode || "");
                setCellData(cells[7], item.tlaActivities || "");
                setCellData(cells[8], item.assessmentTaskMode || "");
                setCellData(cells[9], item.assessmentTaskTask || "");
                setCellData(cells[10], item.referenceNum || "");
                setCellData(cells[11], item.dateCovered || "");
            }
        });
    }

    // Restore Course Evaluation
    const evalBody = document.getElementById('evaluation-editor-body');
    if (evalBody && evaluation && evaluation.length > 0) {
        evalBody.innerHTML = '';
        evaluation.forEach(item => {
            addEvaluationRow();
            const lastRow = evalBody.lastElementChild;
            const cells = lastRow.querySelectorAll('.editable-cell');
            if (cells.length >= 7) {
                setCellData(cells[0], item.moduleCode || "");
                setCellData(cells[1], item.coNumber || "");
                setCellData(cells[2], item.mediatingOutcome || "");
                setCellData(cells[3], item.onlineTaskWeight || "0");
                setCellData(cells[4], item.longExaminationWeight || "0");
                setCellData(cells[5], item.moduleWeight || "0");
                setCellData(cells[6], item.finalWeight || "0");
            }
        });
    }

    // Restore Course Outcomes Assessment Tasks
    const assessmentBody = document.getElementById('assessment-editor-body');
    if (assessmentBody && assessment && assessment.length > 0) {
        assessmentBody.innerHTML = '';
        assessment.forEach(item => {
            addAssessmentRow();
            const lastRow = assessmentBody.lastElementChild;
            const cells = lastRow.querySelectorAll('.editable-cell');
            if (cells.length >= 3) {
                setCellData(cells[0], item.coNumber || "");
                setCellData(cells[1], item.assessmentTasks || "");
                setCellData(cells[2], item.minSatisfactoryPerf || "0");
            }
        });
    }
}

function loadFromSession() {
    const key = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    const savedData = sessionStorage.getItem(key);
    if (!savedData) return;
    const data = JSON.parse(savedData);

    const scheduleBody = document.getElementById('schedule-editor-body');
    if (scheduleBody && data.schedule) {
        scheduleBody.innerHTML = '';
        data.schedule.forEach(rowCells => {
            addScheduleRow();
            const lastRow = scheduleBody.lastElementChild;
            const targetCells = lastRow.querySelectorAll('.editable-cell');
            rowCells.forEach((html, i) => { if (targetCells[i]) setCellData(targetCells[i], html, true); });
        });
    }

    const evalBody = document.getElementById('evaluation-editor-body');
    if (evalBody && data.evaluation) {
        evalBody.innerHTML = '';
        data.evaluation.forEach(rowCells => {
            addEvaluationRow();
            const lastRow = evalBody.lastElementChild;
            const targetCells = lastRow.querySelectorAll('.editable-cell');
            rowCells.forEach((html, i) => { if (targetCells[i]) setCellData(targetCells[i], html, true); });
        });
    }

    const assessmentBody = document.getElementById('assessment-editor-body');
    if (assessmentBody && data.assessment) {
        assessmentBody.innerHTML = '';
        data.assessment.forEach(rowCells => {
            addAssessmentRow();
            const lastRow = assessmentBody.lastElementChild;
            const targetCells = lastRow.querySelectorAll('.editable-cell');
            rowCells.forEach((html, i) => { if (targetCells[i]) setCellData(targetCells[i], html, true); });
        });
    }
}

// Req 7: Save only the Date Covered column
window.saveDateCoveredOnly = async function() {
    try {
        const scheduleRows = document.querySelectorAll('#schedule-editor-body tr');
        const dates = Array.from(scheduleRows)
            .filter(r => r.style.display !== 'none')
            .map(row => {
                const cells = row.querySelectorAll('.editable-cell');
                return cells[11] ? cells[11].innerHTML.trim() : "";
            });

        const fetchResponse = await fetch('/syllabus/schedule/update-date-covered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                syllabusID: window.CURRENT_SYLLABUS_ID,
                dates: dates
            })
        });

        const resData = await fetchResponse.json();
        if (!fetchResponse.ok || !resData.success) {
            throw new Error(resData.error || 'Server rejected the request.');
        }

        alert('Date Covered updated successfully!');
        window.location.href = '/syllabus';
    } catch (e) {
        console.error("Submit Error:", e);
        alert('Failed to save Date Covered. Check console for details.');
    }
};

// ==========================================
// RUN ON LOAD: Load Data into the HTML DOM!
// ==========================================
window.addEventListener('load', () => {
    const key = `syllabus_draft_schedule_${window.CURRENT_SYLLABUS_ID || 'default'}`;
    const savedSessionData = sessionStorage.getItem(key);
    const hasServerData = window.SERVER_SYLLABUS_DATA && 
                          ( (window.SERVER_SYLLABUS_DATA.schedules && window.SERVER_SYLLABUS_DATA.schedules.length > 0) || 
                            (window.SERVER_SYLLABUS_DATA.evaluation && window.SERVER_SYLLABUS_DATA.evaluation.length > 0) );

    if (hasServerData && !savedSessionData) {
        loadFromServer();
    } else if (savedSessionData) {
        loadFromSession();
    }
});
