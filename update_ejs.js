import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'views/Syllabus/syllabusSubmissionFaculty.ejs');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change <title>
content = content.replace('<title>Endorse Syllabus — Program Chair</title>', '<title>Faculty Submission</title>');

// 2. Remove Section Feedback buttons
content = content.replace(/<div class="ad-section-feedback-btn">[\s\S]*?<\/div>/g, '');

// 3. Update right sidebar
const sidebarRegex = /<aside class="ad-sidebar-panel">[\s\S]*?<\/aside>/;

const newSidebar = `<aside class="ad-sidebar-panel">
                <h2 class="ad-sidebar-title">Faculty Submission</h2>

                <!-- ─── Signature Box ─── -->
                <div class="ad-sidebar-section" id="signature-section">
                    <label class="ad-sidebar-label">Signatory Name</label>
                    <input type="text" id="signatory-name-input" class="ad-comments-box" value="<%= locals.pcSignatoryName || (locals.user ? locals.user.firstName + ' ' + locals.user.lastName : '') %>" placeholder="e.g. Dr. Juan dela Cruz" style="margin-bottom: 15px; padding: 10px 12px; height: 40px; box-sizing: border-box;">

                    <label class="ad-sidebar-label">E-Signature</label>

                    <!-- Signature Tab Switcher -->
                    <div class="ad-sig-tabs">
                        <button type="button" class="ad-sig-tab active" data-tab="upload">Upload</button>
                        <button type="button" class="ad-sig-tab" data-tab="draw">Draw</button>
                    </div>

                    <!-- Upload Tab -->
                    <div class="ad-sig-tab-content" id="sig-tab-upload">
                        <div class="ad-signature-wrapper">
                            <div class="ad-signature-box" id="signature-box">
                                <span class="ad-signature-placeholder">Click to upload signature</span>
                                <input type="file" id="signature-upload" accept="image/*" hidden>
                            </div>
                            <button type="button" class="ad-signature-remove-btn" id="signature-remove"
                                title="Remove signature" style="display: none;">
                                <span class="material-symbols-outlined">cancel</span>
                            </button>
                        </div>
                    </div>

                    <!-- Draw Tab -->
                    <div class="ad-sig-tab-content" id="sig-tab-draw" style="display: none;">
                        <canvas id="signature-canvas" class="ad-signature-canvas" width="220" height="80"></canvas>
                        <div class="ad-sig-draw-actions">
                            <button type="button" class="ad-sig-draw-btn ad-sig-clear-btn" id="sig-clear-canvas">Clear</button>
                            <button type="button" class="ad-sig-draw-btn ad-sig-use-btn" id="sig-use-drawn">Use This Signature</button>
                        </div>
                    </div>
                </div>

                <!-- ─── Action Buttons ─── -->
                <div class="ad-sidebar-actions" style="flex-direction: column; gap: 10px;">
                    <button type="button" class="ad-btn-action ad-btn-pdf" id="btn-save-pdf" style="width: 100%;">
                        <span class="material-symbols-outlined">picture_as_pdf</span>
                        Save as PDF
                    </button>
                    <button type="button" class="ad-btn-action ad-btn-submit" id="btn-submit" style="width: 100%;">
                        Final Submit
                    </button>
                    <a href="/faculty" class="ad-btn-action ad-btn-draft" style="width: 100%; text-align: center; text-decoration: none; color: #333; background: #e0e0e0; border: 1px solid #ccc;">
                        Back to Dashboard
                    </a>
                </div>
            </aside>`;

content = content.replace(sidebarRegex, newSidebar);

// Remove scripts at the bottom related to sectionComments
content = content.replace(/<script type="application\/json" id="section-comments-data">[\s\S]*?<\/script>/, '');
content = content.replace(/<script src="\/Syllabus\/js\/sectionComments\.js.*"><\/script>/, '');

fs.writeFileSync(filePath, content);
console.log('syllabusSubmissionFaculty.ejs updated.');
