// ==========================================
// Dashboard CO Assessment Evaluation Logic
// ==========================================
window.openDashboardCoReport = async function(syllabusId, isReadOnly = false) {
    try {
        const res = await fetch(`/syllabus/schedule/api/co-report/${syllabusId}`);
        const data = await res.json();
        
        if (!data.success) {
            alert('Failed to load CO data.');
            return;
        }

        const evaluations = data.evaluation || [];
        const outcomes = data.outcomes || [];

        // Build Table Rows
        let rowsHtml = '';
        if (evaluations.length === 0) {
            rowsHtml = '<tr><td colspan="4" style="text-align:center; padding:20px;">No Course Outcomes found.</td></tr>';
        } else {
            rowsHtml = evaluations.map(ev => {
                let description = 'No description';
                const desc = outcomes.find(a => {
                    const aNum = (a.coNumber || '').replace(/\D/g, '');
                    const coNum = (ev.coNumber || '').replace(/\D/g, '');
                    if (aNum && coNum) return aNum === coNum;
                    return (a.coNumber || '').trim() === (ev.coNumber || '').trim();
                });
                
                if (desc && desc.description && desc.description.length > 0) {
                    description = desc.description[0];
                }

                const passed = ev.studentsPassed || 0;
                const failed = ev.studentsFailed || 0;
                const total = passed + failed;
                const passRate = total > 0 ? Math.round((passed / total) * 100) + '%' : '0%';
                
                const disabledAttr = isReadOnly ? 'disabled' : '';
                const textBg = isReadOnly ? '#f5f5f5' : '#fff';

                return `
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; padding: 15px; background: #fafafa;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                            <div style="flex: 1; padding-right: 15px;">
                                <strong style="color: #111; font-size: 15px;">${ev.coNumber || 'CO'}</strong>
                                <div style="font-size: 12px; color: #555; margin-top: 4px; line-height: 1.4;">${description}</div>
                            </div>
                            
                            <div style="display: flex; gap: 15px; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #ddd;">
                                <div style="text-align: center;">
                                    <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px;">PASSED</div>
                                    <input type="number" min="0" class="co-passed-input" data-id="${ev._id}" value="${passed}" ${disabledAttr} style="width: 60px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px; background: ${textBg};" oninput="calculatePassRate(this)" />
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px;">FAILED</div>
                                    <input type="number" min="0" class="co-failed-input" data-id="${ev._id}" value="${failed}" ${disabledAttr} style="width: 60px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px; background: ${textBg};" oninput="calculatePassRate(this)" />
                                </div>
                                <div style="text-align: center; display: flex; flex-direction: column; justify-content: center; min-width: 60px;">
                                    <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px;">RATE</div>
                                    <div class="co-pass-rate" style="font-weight: 700; color: #1976d2; font-size: 14px;">${passRate}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 6px;">Analysis & Remarks (Optional)</div>
                            <textarea class="co-analysis-input" placeholder="Enter detailed analysis, observations, or action plans for this Course Outcome..." ${disabledAttr} style="width: 100%; min-height: 70px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; font-size: 13px; resize: vertical; background: ${textBg};">${ev.analysis || ''}</textarea>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Build Modal matching the Draft Modal aesthetic
        const modalHtml = `
            <div id="dynamicCoReportModal" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; justify-content: center; align-items: center;">
                <div class="modal-content" style="width: 750px; text-align: left; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 90vh;">
                    
                    <div class="modal-header" style="justify-content: space-between; padding: 20px 25px; border-bottom: 1px solid #eee;">
                        <div class="modal-title-group" style="display: flex; align-items: center; gap: 15px;">
                            <div class="modal-icon" style="background: #1976d2; width: 40px; height: 40px; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: white;">
                                <i class="fas fa-clipboard-check" style="font-size: 20px;"></i>
                            </div>
                            <h2 style="font-size: 20px; margin: 0; color: #333;">CO Assessment Evaluation</h2>
                        </div>
                        <span class="close-modal" onclick="document.getElementById('dynamicCoReportModal').remove()" style="cursor: pointer; font-size: 24px; color: #888;">&times;</span>
                    </div>

                    <div style="padding: 20px 25px 0; font-size: 13px; color: #666; line-height: 1.5;">
                        <p style="margin: 0 0 15px;">
                            <i class="fas fa-info-circle" style="color: #1976d2; margin-right: 4px;"></i>
                            ${isReadOnly ? 'Review the detailed Course Outcome Assessment Evaluation for this syllabus.' : 'As the faculty, enter the final pass/fail metrics and provide your detailed analysis for each Course Outcome.'}
                        </p>
                    </div>

                    <div style="flex: 1; overflow-y: auto; padding: 0 25px 20px;">
                        ${rowsHtml}
                    </div>
                    
                    <div style="padding: 15px 25px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; background: #fdfdfd; border-radius: 0 0 12px 12px;">
                        <button type="button" class="submit-btn" onclick="document.getElementById('dynamicCoReportModal').remove()" style="background: #e5e7eb; color: #333; padding: 10px 24px; font-size: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                        ${isReadOnly ? '' : `<button type="button" class="submit-btn" onclick="submitDashboardCoReport('${syllabusId}')" style="background: #1976d2; color: white; padding: 10px 24px; font-size: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px;"><i class="fas fa-save"></i> Save Evaluation</button>`}
                    </div>
                </div>
            </div>
        `;

        // Inject and show
        const existing = document.getElementById('dynamicCoReportModal');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (err) {
        console.error('Error opening CO Assessment modal:', err);
        alert('Failed to fetch CO data.');
    }
};

window.calculatePassRate = function(inputEl) {
    const container = inputEl.closest('div').parentElement;
    const passed = parseInt(container.querySelector('.co-passed-input').value) || 0;
    const failed = parseInt(container.querySelector('.co-failed-input').value) || 0;
    const rateEl = container.querySelector('.co-pass-rate');
    
    const total = passed + failed;
    if (total === 0) {
        rateEl.textContent = '0%';
    } else {
        rateEl.textContent = Math.round((passed / total) * 100) + '%';
    }
};

window.submitDashboardCoReport = async function(syllabusId) {
    const items = document.querySelectorAll('#dynamicCoReportModal .co-passed-input');
    const failedInputs = document.querySelectorAll('#dynamicCoReportModal .co-failed-input');
    const analysisInputs = document.querySelectorAll('#dynamicCoReportModal .co-analysis-input');
    
    const payload = [];
    items.forEach((pInput, i) => {
        const id = pInput.dataset.id;
        const passed = parseInt(pInput.value) || 0;
        const failed = parseInt(failedInputs[i].value) || 0;
        const analysis = analysisInputs[i].value || '';
        payload.push({ id, passed, failed, analysis });
    });

    try {
        const res = await fetch('/syllabus/schedule/update-co-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                syllabusID: syllabusId,
                coData: payload
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('CO Assessment Evaluation successfully updated!');
            document.getElementById('dynamicCoReportModal').remove();
        } else {
            alert('Failed to save CO Assessment: ' + data.error);
        }
    } catch (err) {
        console.error('Error saving CO Assessment:', err);
        alert('An error occurred while saving the evaluation.');
    }
};
