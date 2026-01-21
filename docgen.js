// Current template data
let currentTemplate = null;

// Radar chart configuration
let radarLabels = ['Conception', 'Research', 'Drafting', 'Style', 'Proofing'];
let radarValues = [0.5, 0.5, 0.5, 0.5, 0.5];
const centerX = 160;
const centerY = 160;
const maxRadius = 110;
let draggingPoint = null;

// Load template from JSON file
async function loadTemplate(templateName) {
    try {
        const response = await fetch(`templates/${templateName}.json`);
        if (!response.ok) throw new Error('Template not found');
        currentTemplate = await response.json();
        renderTemplate();
    } catch (error) {
        console.error('Error loading template:', error);
        alert('Failed to load template: ' + templateName);
    }
}

// Render the template to the page
function renderTemplate() {
    if (!currentTemplate) return;

    // Render student fields
    const studentFieldsContainer = document.getElementById('studentFields');
    const today = new Date().toISOString().split('T')[0];
    studentFieldsContainer.innerHTML = currentTemplate.studentFields.map(field => {
        const inputType = field.type || 'text';
        const defaultValue = inputType === 'date' ? `value="${today}"` : '';
        return `
            <div class="form-group">
                <label for="${field.id}">${field.label}:</label>
                <input type="${inputType}" id="${field.id}" placeholder="${field.placeholder}" ${defaultValue}>
            </div>
        `;
    }).join('');

    // Update AI checkbox label
    document.getElementById('aiCheckboxLabel').textContent = currentTemplate.aiCheckboxLabel;

    // Update radar labels
    radarLabels = currentTemplate.radarLabels;
    radarValues = new Array(radarLabels.length).fill(0.5);
    initRadar();

    // Render reflection questions
    const questionsContainer = document.getElementById('reflectionQuestions');
    questionsContainer.innerHTML = currentTemplate.reflectionQuestions.map(q => `
        <div class="question-block">
            <div class="question-label">
                <span class="question-letter">${q.letter}</span>
                <span>${q.text}</span>
            </div>
            <textarea id="${q.id}" placeholder="${q.placeholder}" oninput="updateWordCount(this, 'count_${q.id}', ${q.wordLimit})"></textarea>
            <p class="word-count" id="count_${q.id}">0/${q.wordLimit} words</p>
        </div>
    `).join('');
}

// Initialize radar chart
function initRadar() {
    const svg = document.getElementById('radarChart');
    svg.innerHTML = '';

    const numPoints = radarLabels.length;

    // Draw grid lines (concentric pentagons)
    for (let level = 1; level <= 4; level++) {
        const radius = (maxRadius / 4) * level;
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (Math.PI * 2 * i / numPoints) - Math.PI / 2;
            points.push(`${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`);
        }
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.join(' '));
        polygon.setAttribute('class', 'grid-line');
        svg.appendChild(polygon);
    }

    // Draw axis lines
    for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 * i / numPoints) - Math.PI / 2;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', centerX);
        line.setAttribute('y1', centerY);
        line.setAttribute('x2', centerX + maxRadius * Math.cos(angle));
        line.setAttribute('y2', centerY + maxRadius * Math.sin(angle));
        line.setAttribute('class', 'axis-line');
        svg.appendChild(line);
    }

    // Draw labels
    for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 * i / numPoints) - Math.PI / 2;
        const x = centerX + (maxRadius + 25) * Math.cos(angle);
        const y = centerY + (maxRadius + 25) * Math.sin(angle);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('class', 'axis-label');
        text.textContent = radarLabels[i];
        svg.appendChild(text);
    }

    updateRadar();
}

// Update radar polygon and points
function updateRadar() {
    const svg = document.getElementById('radarChart');
    svg.querySelectorAll('.radar-polygon, .radar-point').forEach(el => el.remove());

    const numPoints = radarLabels.length;
    const dataPoints = [];
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 * i / numPoints) - Math.PI / 2;
        const radius = maxRadius * radarValues[i];
        dataPoints.push(`${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`);
    }
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', dataPoints.join(' '));
    polygon.setAttribute('class', 'radar-polygon');
    svg.appendChild(polygon);

    for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 * i / numPoints) - Math.PI / 2;
        const radius = maxRadius * radarValues[i];
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 10);
        circle.setAttribute('class', 'radar-point');
        circle.setAttribute('data-index', i);
        
        circle.addEventListener('mousedown', startDrag);
        circle.addEventListener('touchstart', startDrag, { passive: false });
        
        svg.appendChild(circle);
    }
}

// Drag handlers
function startDrag(e) {
    e.preventDefault();
    draggingPoint = parseInt(e.target.getAttribute('data-index'));
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', stopDrag);
}

function drag(e) {
    if (draggingPoint === null) return;
    e.preventDefault();

    const svg = document.getElementById('radarChart');
    const rect = svg.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const scaleX = 320 / rect.width;
    const scaleY = 320 / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const numPoints = radarLabels.length;
    const angle = (Math.PI * 2 * draggingPoint / numPoints) - Math.PI / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    
    const projection = dx * Math.cos(angle) + dy * Math.sin(angle);
    const value = Math.max(0.05, Math.min(1, projection / maxRadius));
    
    radarValues[draggingPoint] = value;
    updateRadar();
}

function stopDrag() {
    draggingPoint = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', stopDrag);
}

// Toggle AI questions visibility
function toggleAIQuestions() {
    const checkbox = document.getElementById('usedAI');
    const questions = document.getElementById('aiQuestions');
    
    if (checkbox.checked) {
        questions.classList.add('visible');
    } else {
        questions.classList.remove('visible');
    }
}

// Word count updater
function updateWordCount(textarea, countId, limit) {
    const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    const countEl = document.getElementById(countId);
    countEl.textContent = `${words}/${limit} words`;
    
    if (words > limit) {
        countEl.classList.add('warning');
    } else {
        countEl.classList.remove('warning');
    }
}

// Escape HTML for safe output
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate AI usage summary string
function generateUsageSummary() {
    return radarLabels.map((label, i) => {
        const pct = Math.round(radarValues[i] * 100);
        return `${pct}% ${label}`;
    }).join(' — ');
}

// Convert radar SVG to base64 PNG image
function svgToBase64Image() {
    return new Promise((resolve) => {
        const svg = document.getElementById('radarChart');
        
        // Clone SVG and add inline styles for proper rendering
        const clonedSvg = svg.cloneNode(true);
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clonedSvg.setAttribute('width', '320');
        clonedSvg.setAttribute('height', '320');
        
        // Add inline styles to elements
        clonedSvg.querySelectorAll('.grid-line').forEach(el => {
            el.setAttribute('fill', 'none');
            el.setAttribute('stroke', '#e0e0e0');
            el.setAttribute('stroke-width', '1');
        });
        clonedSvg.querySelectorAll('.axis-line').forEach(el => {
            el.setAttribute('stroke', '#ccc');
            el.setAttribute('stroke-width', '1');
        });
        clonedSvg.querySelectorAll('.axis-label').forEach(el => {
            el.setAttribute('font-family', 'Arial, sans-serif');
            el.setAttribute('font-weight', '700');
            el.setAttribute('font-size', '12px');
            el.setAttribute('fill', '#333');
        });
        clonedSvg.querySelectorAll('.radar-polygon').forEach(el => {
            el.setAttribute('fill', 'rgba(0, 102, 255, 0.15)');
            el.setAttribute('stroke', '#0066ff');
            el.setAttribute('stroke-width', '3');
        });
        clonedSvg.querySelectorAll('.radar-point').forEach(el => {
            el.setAttribute('fill', '#0066ff');
            el.setAttribute('stroke', '#fff');
            el.setAttribute('stroke-width', '3');
        });
        
        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
        const dataUrl = 'data:image/svg+xml;base64,' + svgBase64;
        
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 320;
            const ctx = canvas.getContext('2d');
            
            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 320, 320);
            
            // Draw SVG at correct size
            ctx.drawImage(img, 0, 0, 320, 320);
            
            // Return base64 PNG
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = function() {
            resolve(null);
        };
        img.src = dataUrl;
    });
}

// Generate DOCX using pure JavaScript
async function generateDocx() {
    if (!currentTemplate) {
        alert('No template loaded');
        return;
    }

    // Gather student field values
    const studentData = {};
    currentTemplate.studentFields.forEach(field => {
        studentData[field.id] = document.getElementById(field.id)?.value || 'N/A';
    });

    const usedAI = document.getElementById('usedAI').checked;
    
    // Get radar chart image if AI was used
    let radarImageData = null;
    if (usedAI) {
        radarImageData = await svgToBase64Image();
    }

    // Build HTML content for Word - compact single page
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:w="urn:schemas-microsoft-com:office:word" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <title>Qsheet</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 9pt; margin: 0; padding: 15pt; }
                .disclaimer { font-size: 7.5pt; color: #333; margin-bottom: 10pt; line-height: 1.4; }
                .disclaimer a { color: #0066ff; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 6pt; }
                td { border: 1pt solid #bbb; padding: 3pt 6pt; font-size: 9pt; }
                td:first-child { font-weight: bold; width: 28%; background: #f5f5f5; }
                .checkbox { font-size: 9pt; margin: 6pt 0; }
                .graph { text-align: center; margin: 8pt 0; }
                .caption { font-size: 8pt; color: #555; text-align: center; margin-top: 4pt; }
                .question { margin-bottom: 6pt; }
                .question-title { font-weight: bold; font-size: 9pt; margin-bottom: 2pt; }
                .question-answer { margin-left: 12pt; font-size: 9pt; }
            </style>
        </head>
        <body>
            <p class="disclaimer">By submitting this assignment, I confirm that: 1) I have read and understood the University's <a href="https://library.soton.ac.uk/sash/what-is-academic-responsibility">Academic Responsibility and Conduct Guidance</a> and that in the attached submission I have worked within the expectations of the <a href="https://www.southampton.ac.uk/about/governance/regulations-policies/student-regulations/academic-responsibility-conduct">Regulations Governing Academic Responsibility and Conduct</a>. 2) I am aware that failure to act in accordance with the <a href="https://www.southampton.ac.uk/about/governance/regulations-policies/student-regulations/academic-responsibility-conduct">Regulations Governing Academic Responsibility and Conduct</a> may lead to the imposition of penalties which, for the most serious cases, may include termination of programme. 3) I consent to the University copying and distributing any or all of my work in any form and using third parties (who may be based outside the EU/EEA) to verify whether my work contains plagiarised material, and for quality assurance purposes.</p>
            <table>
                ${currentTemplate.studentFields.map(field => 
                    `<tr><td>${escapeHtml(field.label)}</td><td>${escapeHtml(studentData[field.id])}</td></tr>`
                ).join('')}
            </table>
            <p class="checkbox">${usedAI ? '☑' : '☐'} ${escapeHtml(currentTemplate.aiCheckboxLabel)}</p>
    `;

    if (usedAI) {
        // Gather question answers
        const answers = {};
        currentTemplate.reflectionQuestions.forEach(q => {
            answers[q.id] = document.getElementById(q.id)?.value || 'No response provided';
        });

        // Add radar chart image with caption
        if (radarImageData) {
            html += `
                <div class="graph">
                    <img src="${radarImageData}" width="200" height="200" />
                    <p class="caption">${generateUsageSummary()}</p>
                </div>
            `;
        } else {
            html += `<p class="caption">${generateUsageSummary()}</p>`;
        }

        html += `
            ${currentTemplate.reflectionQuestions.map(q => `
                <div class="question">
                    <p class="question-title">${q.letter}) ${escapeHtml(q.text)}</p>
                    <p class="question-answer">${escapeHtml(answers[q.id])}</p>
                </div>
            `).join('')}
        `;
    }

    html += `
        </body>
        </html>
    `;

    // Create filename from student data
    const studentId = studentData.studentId || 'unknown';
    const moduleCode = studentData.moduleCode || currentTemplate.name;
    
    // Create blob and download
    const blob = new Blob([html], { type: 'application/msword' });
    const filename = `Qsheet_${studentId}_${moduleCode}.doc`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    loadTemplate('engl');
});
