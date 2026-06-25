/**
 * adminPeoSo.js — Admin PEO/SO Template Management
 *
 * Row HTML structure (pso-* classes to avoid collision with newSyllabus.css):
 *   .pso-row > .pso-row-num + .pso-row-text + .pso-row-checks + .pso-del-btn
 *
 * Globals injected by adminPeoSo.ejs:
 *   window.IS_READ_ONLY  — boolean
 *   window.INITIAL_PEOS  — { description: string[], rating: string[] } | null
 *   window.INITIAL_SOS   — { description: string[], rating: string[] } | null
 */

/* ── Renumber ─────────────────────────────────────────────────── */
function renumberPeoRows() {
    document.querySelectorAll('#peo-container .pso-row').forEach((r, i) => {
        r.querySelector('.pso-row-num').textContent = `${i + 1}.`;
    });
}
function renumberSoRows() {
    document.querySelectorAll('#so-container .pso-row').forEach((r, i) => {
        r.querySelector('.pso-row-num').textContent = `${String.fromCharCode(97 + i)}.`;
    });
}

/* ── Build a row element ──────────────────────────────────────── */
function buildRow(label, text, rating, deleteFn) {
    const isRO = window.IS_READ_ONLY;
    const row  = document.createElement('div');
    row.className = 'pso-row' + (isRO ? ' readonly' : '');

    // Number
    const num = document.createElement('span');
    num.className = 'pso-row-num';
    num.textContent = label;
    row.appendChild(num);

    // Editable text
    const txt = document.createElement('div');
    txt.className = 'pso-row-text';
    if (!isRO) txt.setAttribute('contenteditable', 'true');
    txt.setAttribute('data-placeholder', 'Enter text…');
    if (text) txt.innerText = text;
    row.appendChild(txt);

    // Checkboxes
    const checks = document.createElement('div');
    checks.className = 'pso-row-checks';
    for (let j = 0; j < 3; j++) {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.disabled = isRO;
        if (rating && rating[j] === '1') cb.checked = true;
        checks.appendChild(cb);
    }
    row.appendChild(checks);

    // Delete button (edit mode only)
    if (!isRO) {
        const del = document.createElement('button');
        del.className = 'pso-del-btn';
        del.type = 'button';
        del.title = 'Delete row';
        del.innerHTML = '<i class="fas fa-times"></i>';
        del.addEventListener('click', () => { row.remove(); deleteFn(); });
        row.appendChild(del);
    }

    return row;
}

/* ── Add PEO row ──────────────────────────────────────────────── */
function addPeoRow(text, rating) {
    const container = document.getElementById('peo-container');
    const num = container.querySelectorAll('.pso-row').length + 1;
    const row = buildRow(`${num}.`, text || '', rating || '000', renumberPeoRows);
    container.appendChild(row);
}

/* ── Add SO row ───────────────────────────────────────────────── */
function addSoRow(text, rating) {
    const container = document.getElementById('so-container');
    const letter = String.fromCharCode(97 + container.querySelectorAll('.pso-row').length);
    const row = buildRow(`${letter}.`, text || '', rating || '000', renumberSoRows);
    container.appendChild(row);
}

/* ── Load initial data from server ───────────────────────────── */
window.addEventListener('load', () => {
    const ip = window.INITIAL_PEOS;
    const is = window.INITIAL_SOS;

    if (ip && Array.isArray(ip.description)) {
        ip.description.forEach((desc, i) => addPeoRow(desc, ip.rating?.[i] || '000'));
    }
    if (is && Array.isArray(is.description)) {
        is.description.forEach((desc, i) => addSoRow(desc, is.rating?.[i] || '000'));
    }
});

/* ── Save template ────────────────────────────────────────────── */
async function saveTemplate() {
    if (window.IS_READ_ONLY) return;

    const btn = document.getElementById('btn-save-template');

    // Collect PEOs
    const peoRows = [...document.querySelectorAll('#peo-container .pso-row')];
    const programObjectives        = [];
    const programObjectivesRating  = [];
    for (let i = 0; i < peoRows.length; i++) {
        const text = peoRows[i].querySelector('.pso-row-text')?.innerText?.trim() || '';
        if (!text) { showToast(`PEO ${i + 1} is empty.`, 'error'); peoRows[i].querySelector('.pso-row-text')?.focus(); return; }
        const cbs = [...peoRows[i].querySelectorAll('input[type="checkbox"]')];
        programObjectives.push(text);
        programObjectivesRating.push(cbs.map(c => c.checked ? '1' : '0').join(''));
    }

    // Collect SOs
    const soRows = [...document.querySelectorAll('#so-container .pso-row')];
    const studentObjectives       = [];
    const studentObjectivesRating = [];
    for (let i = 0; i < soRows.length; i++) {
        const text = soRows[i].querySelector('.pso-row-text')?.innerText?.trim() || '';
        if (!text) { showToast(`SO "${String.fromCharCode(97+i)}" is empty.`, 'error'); soRows[i].querySelector('.pso-row-text')?.focus(); return; }
        const cbs = [...soRows[i].querySelectorAll('input[type="checkbox"]')];
        studentObjectives.push(text);
        studentObjectivesRating.push(cbs.map(c => c.checked ? '1' : '0').join(''));
    }

    if (!programObjectives.length) { showToast('Add at least one PEO before saving.', 'error'); return; }
    if (!studentObjectives.length)  { showToast('Add at least one SO before saving.',  'error'); return; }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving…'; }

    try {
        const res  = await fetch('/syllabus/hr/peo-so/save', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ programObjectives, programObjectivesRating, studentObjectives, studentObjectivesRating })
        });
        const data = await res.json();
        showToast(data.success ? 'Template saved successfully.' : (data.message || 'Save failed.'),
                  data.success ? 'success' : 'error');
    } catch {
        showToast('Network error. Please try again.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Template'; }
    }
}

/* ── Toast ────────────────────────────────────────────────────── */
let _tt = null;
function showToast(msg, type = 'success') {
    const el = document.getElementById('pso-toast');
    if (!el) return;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    el.innerHTML = `<i class="fas ${icon} pso-toast-icon"></i><span>${msg}</span>`;
    el.className = `pso-toast ${type}`;
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(_tt);
    _tt = setTimeout(() => el.classList.remove('show'), 3500);
}
