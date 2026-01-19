/**
 * Global State
 */
let students = []; // Full JSON data
let selectedSkills = [];
let availableSkills = [];

/**
 * Initialization: Fetches data
 */
async function loadPortal() {
    try {
        const response = await fetch('students.json'); //
        students = await response.json(); 
        availableSkills = [...new Set(students.flatMap(s => s.skillsets || []))]; 
        render(students);
    } catch (e) {
        console.error("Critical Error: Unable to load student data.", e);
    }
}

/**
 * Render Grid: Updates UI cards
 */
function render(data) {
    const grid = document.getElementById('studentGrid');
    const countDisplay = document.getElementById('count');
    
    if (countDisplay) countDisplay.innerText = data.length;
    if (!grid) return;

    grid.innerHTML = data.map(s => {
        const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`;
        const imgPath = (s.links && s.links.image_url && s.links.image_url !== "image_link") ? s.links.image_url : fallback;

        return `
        <div class="profile-card" onclick="showDetail(${s.id})">
            <div class="card-header">
                <img src="${imgPath}" class="p-image" onerror="this.src='${fallback}'">
                <div>
                    <span class="p-domain">${s.education.undergraduate.bsc_degree || 'General'}</span>
                    <h2 class="p-name">${s.name}</h2>
                    <div class="card-email">${s.contact.email}</div>
                </div>
            </div>
            <p class="card-bio">${s.bio}</p>
            <div class="skill-container">
                ${(s.skillsets || []).slice(0, 3).map(sk => `<span class="skill-tag" title="${sk}">${sk}</span>`).join('')}
                ${s.skillsets.length > 3 ? `<span class="skill-tag count-pill">+${s.skillsets.length - 3}</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

/**
 * Filter Engine
 */
function filterAll() {
    const ugDegree = document.getElementById('ugDegreeFilter').value;
    const minUgCgpa = parseFloat(document.getElementById('ugCgpaFilter').value) || 0;
    const minPgCgpa = parseFloat(document.getElementById('pgCgpaFilter').value) || 0;
    const requirePg = document.getElementById('requirePg').checked;
    const minExp = parseInt(document.getElementById('expFilter').value);

    const filtered = students.filter(s => {
        const matchSkills = selectedSkills.length === 0 || 
                           selectedSkills.every(needed => s.skillsets.includes(needed));
        
        const studentUgDegree = s.education.undergraduate.bsc_degree || "";
        const matchUgDegree = ugDegree === 'all' || studentUgDegree.includes(ugDegree);
        
        const matchUgCGPA = (s.education.undergraduate.cgpa || 0) >= minUgCgpa;

        const hasPg = !!(s.education.postgraduate && s.education.postgraduate.bsc_degree);
        const matchPgRequirement = !requirePg || hasPg;
        const matchPgCGPA = !hasPg || (s.education.postgraduate.cgpa || 0) >= minPgCgpa;

        const matchExp = (s.experience ? s.experience.length : 0) >= minExp;
        
        return matchSkills && matchUgDegree && matchUgCGPA && matchPgRequirement && matchPgCGPA && matchExp;
    });

    render(filtered);
}

/**
 * Full JSON to CSV Export
 * Downloads the entire dataset regardless of current filters
 */
function downloadCSV() {
    if (students.length === 0) return;

    // Define columns based on full JSON structure
    const headers = [
        "ID", "Name", "Bio", "Email", "Mobile", 
        "UG Degree", "UG CGPA", "PG Degree", "PG CGPA", "Doctorate",
        "Skills", "Experience", "Certifications", "LinkedIn", "GitHub"
    ];

    const csvRows = students.map(s => {
        return [
            s.id,
            `"${s.name}"`,
            `"${s.contact.email}"`,
            `"${s.contact.mobile_no}"`,
            `"${s.education.undergraduate.bsc_degree}"`,
            s.education.undergraduate.cgpa || 0,
            `"${s.education.postgraduate.bsc_degree || ""}"`,
            s.education.postgraduate.cgpa || "N/A",
            `"${s.education.doctorate || ""}"`,
            `"${(s.skillsets || []).join(", ")}"`,
            `"${(s.experience || []).join("; ")}"`,
            `"${(s.licenses_and_certifications || []).join(", ")}"`,
            `"${s.links.linkedin}"`,
            `"${s.links.github}"`
        ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "all_candidates_database.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * UI Event Listeners
 */
document.getElementById('downloadCsvBtn').addEventListener('click', downloadCSV);
document.getElementById('ugCgpaFilter').addEventListener('input', filterAll);
document.getElementById('pgCgpaFilter').addEventListener('input', filterAll);
document.getElementById('requirePg').addEventListener('change', filterAll);
document.getElementById('ugDegreeFilter').addEventListener('change', filterAll);
document.getElementById('expFilter').addEventListener('change', filterAll);

const skillInput = document.getElementById('skillInput');
const suggestionBox = document.getElementById('suggestions');

if (skillInput) {
    skillInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        suggestionBox.innerHTML = '';
        if (val.length > 0) {
            const matches = availableSkills.filter(sk => 
                sk.toLowerCase().includes(val) && !selectedSkills.includes(sk)
            );
            if(matches.length > 0) {
                suggestionBox.style.display = 'block';
                matches.forEach(match => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerText = match;
                    div.onclick = () => {
                        selectedSkills.push(match);
                        updateSkillUI();
                        skillInput.value = '';
                        suggestionBox.style.display = 'none';
                        filterAll();
                    };
                    suggestionBox.appendChild(div);
                });
            }
        } else { suggestionBox.style.display = 'none'; }
    });
}

function updateSkillUI() {
    const container = document.getElementById('selectedSkills');
    if (container) {
        container.innerHTML = selectedSkills.map(s => `
            <div class="capsule">${s} <span onclick="removeSkill('${s}')" style="cursor:pointer">×</span></div>
        `).join('');
    }
}

window.removeSkill = (skill) => {
    selectedSkills = selectedSkills.filter(s => s !== skill);
    updateSkillUI();
    filterAll();
};

window.resetFilters = function() {
    selectedSkills = [];
    document.getElementById('ugCgpaFilter').value = 5.5;
    document.getElementById('pgCgpaFilter').value = 5.5;
    document.getElementById('requirePg').checked = false;
    document.getElementById('ugDegreeFilter').value = 'all';
    document.getElementById('expFilter').value = '0';
    updateSkillUI();
    filterAll();
};

/**
 * Modal View Logic
 */
function showDetail(id) {
    const s = students.find(item => item.id === id);
    const modal = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');

    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`;
    const imgPath = (s.links && s.links.image_url && s.links.image_url !== "image_link")
        ? s.links.image_url
        : fallback;

    const renderList = (title, items) => {
        if (!items || items.length === 0) return '';
        return `
            <h4 class="modal-section-title">${title}</h4>
            <ul class="modal-list">
                ${items.map(i => `<li>${i}</li>`).join('')}
            </ul>`;
    };

    const renderPublicationsBox = (pubs) => {
        if (!pubs || pubs.length === 0) return '';
        return `
            <div style="
                margin-top:15px;
                padding:15px;
                background:#f5f5f5;
                border-radius:12px;
                border:1px solid #e0e0e0;
            ">
                <h4 style="margin-bottom:10px;">Publications</h4>
                <ul style="list-style:none; padding-left:0;">
                    ${pubs.map(p => `
                        <li style="margin-bottom:8px;">
                            <a href="${p.url}" target="_blank" style="text-decoration:underline;">
                                ${p.title}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    };

    modalBody.innerHTML = `
        <div class="modal-header-row" style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="display:flex;gap:20px;align-items:center;">
                <img src="${imgPath}" class="p-image"
                     style="width:85px;height:85px;border-radius:50%;"
                     onerror="this.src='${fallback}'">
                <div>
                    <h2 class="modal-title">${s.name}</h2>
                    <div class="modal-meta-row">
                        <div>${s.contact.email}</div>
                        <div>${s.contact.mobile_no}</div>
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:10px;">
                ${s.links.github ? `<a href="${s.links.github}" target="_blank" class="premium-social-btn">GitHub</a>` : ''}
                ${s.links.linkedin ? `<a href="${s.links.linkedin}" target="_blank" class="premium-social-btn linkedin-variant">LinkedIn</a>` : ''}
                ${s.links.resume_link ? `<a href="${s.links.resume_link}" target="_blank" class="premium-social-btn" style="background:#333;color:white;">Resume</a>` : ''}
            </div>
        </div>

        <div class="modal-stats-box">
            <div>
                <small>Undergraduate</small><br>
                <strong>${s.education.undergraduate.bsc_degree}</strong>
                (${s.education.undergraduate.cgpa})
            </div>
            <div>
                <small>Postgraduate</small><br>
                <strong>${s.education.postgraduate.bsc_degree}</strong>
                (${s.education.postgraduate.cgpa})
            </div>
            <div>
                <small>Doctorate</small><br>
                <strong>${s.education.doctorate}</strong>
            </div>
        </div>

        <p class="modal-bio">"${s.bio}"</p>

        <h4 class="modal-section-title">Domains / Expertise</h4>
        <div class="modal-skills-row">
            ${s.skillsets.map(sk => `<span class="modal-skill-tag">${sk}</span>`).join('')}
        </div>

        ${renderList("Awards", s.awards)}
        ${renderList("Licenses & Certifications", s.licenses_and_certifications)}

        ${renderPublicationsBox(s.publications)}

        ${renderList("Experience", s.experience)}

        <div class="modal-footer-btns">
            <a href="mailto:${s.contact.email}"
               class="btn-base btn-primary"
               style="flex:1;text-align:center;background:#efefef;color:black;">
               Send Direct Message
            </a>
        </div>
    `;

    modal.style.display = 'flex';
}
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") closeModal();
});

loadPortal();