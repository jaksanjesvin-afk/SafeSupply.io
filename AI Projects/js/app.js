import { suppliers as baseSuppliers, riskAssessments as baseRiskAssessments } from "./db.js";

// --- State ---
let mergedData = [];
let riskChartInstance = null;
let riskAnalysisChartInstance = null;
let currentTheme = 'dark'; // Default

let supplierState = [];
let riskState = [];

// --- Persistence Helpers ---

function loadState() {
    try {
        const storedSuppliers = JSON.parse(localStorage.getItem("ss_suppliers"));
        const storedRisks = JSON.parse(localStorage.getItem("ss_risks"));
        supplierState = Array.isArray(storedSuppliers) && storedSuppliers.length ? storedSuppliers : [...baseSuppliers];
        riskState = Array.isArray(storedRisks) && storedRisks.length ? storedRisks : [...baseRiskAssessments];
    } catch (e) {
        supplierState = [...baseSuppliers];
        riskState = [...baseRiskAssessments];
    }
}

function persistState() {
    localStorage.setItem("ss_suppliers", JSON.stringify(supplierState));
    localStorage.setItem("ss_risks", JSON.stringify(riskState));
}

// --- Data Logic ---

function joinSuppliersWithRisk() {
    return supplierState.map(supplier => {
        const risk = riskState.find(r => r.supplier_id === supplier.supplier_id) || {
            overall_risk_score: null,
            risk_level: "Not scored"
        };
        return {
            ...supplier,
            ...risk
        };
    });
}

// --- Rendering Logic ---

function renderKPIs() {
    const totalSuppliers = mergedData.length;
    const highRiskSuppliers = mergedData.filter(s => s.risk_level === "High").length;

    document.getElementById("kpi-total-suppliers").textContent = totalSuppliers;
    document.getElementById("kpi-high-risk-suppliers").textContent = highRiskSuppliers;
}

function renderRiskChart() {
    const ctx = document.getElementById('riskChart').getContext('2d');

    const riskCounts = {
        Low: mergedData.filter(s => s.risk_level === "Low").length,
        Medium: mergedData.filter(s => s.risk_level === "Medium").length,
        High: mergedData.filter(s => s.risk_level === "High").length
    };

    // Theme-aware colors
    const isDark = document.body.classList.contains('theme-dark');
    const textColor = isDark ? '#9ca3af' : '#6b7280'; // Gray-400 vs Gray-500
    const borderColor = isDark ? '#1e293b' : '#ffffff'; // Slate-800 vs White

    if (riskChartInstance) {
        riskChartInstance.destroy();
    }

    riskChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Low Risk', 'Medium Risk', 'High Risk'],
            datasets: [{
                data: [riskCounts.Low, riskCounts.Medium, riskCounts.High],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)', // Green-500
                    'rgba(245, 158, 11, 0.8)', // Amber-500
                    'rgba(239, 68, 68, 0.8)'   // Red-500
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: {
                            family: 'Inter'
                        },
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            cutout: '70%'
        }
    });
}



function renderRiskAnalysis() {
    const canvas = document.getElementById('riskAnalysisBar');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const riskCounts = {
        Low: mergedData.filter(s => s.risk_level === "Low").length,
        Medium: mergedData.filter(s => s.risk_level === "Medium").length,
        High: mergedData.filter(s => s.risk_level === "High").length
    };

    const isDark = document.body.classList.contains('theme-dark');
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? 'rgba(55,65,81,0.6)' : 'rgba(209,213,219,0.7)';
    const axisColor = textColor;

    if (riskAnalysisChartInstance) {
        riskAnalysisChartInstance.destroy();
    }

    riskAnalysisChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Low', 'Medium', 'High'],
            datasets: [{
                data: [riskCounts.Low, riskCounts.Medium, riskCounts.High],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderRadius: 8,
                maxBarThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        color: axisColor,
                        font: { family: 'Inter' }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: axisColor,
                        font: { family: 'Inter' },
                        precision: 0
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}

function renderSupplierTable() {
    const tbody = document.getElementById("supplier-list-body");
    tbody.innerHTML = ""; // Clear existing

    mergedData.forEach(supplier => {
        const tr = document.createElement("tr");
        tr.className = "transition-colors";

        let badgeClass = "";
        if (supplier.risk_level === "Low") badgeClass = "badge-low";
        else if (supplier.risk_level === "Medium") badgeClass = "badge-medium";
        else if (supplier.risk_level === "High") badgeClass = "badge-high";

        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-theme-primary">${supplier.supplier_id}</td>
            <td class="px-6 py-4 text-theme-secondary">${supplier.name}</td>
            <td class="px-6 py-4 text-theme-secondary">${supplier.country}</td>
            <td class="px-6 py-4">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                    ${supplier.risk_level}
                </span>
            </td>
            <td class="px-6 py-4 text-theme-secondary">${supplier.category}</td>
        `;
        tbody.appendChild(tr);
    });
}


// --- Add Supplier Modal Logic ---

function initAddSupplier() {
    const openBtn = document.getElementById("btn-add-supplier");
    const modal = document.getElementById("add-supplier-modal");
    if (!openBtn || !modal) return;

    const closeBtn = document.getElementById("close-add-supplier");
    const cancelBtn = document.getElementById("cancel-add-supplier");
    const form = document.getElementById("add-supplier-form");

    function openModal() {
        modal.classList.remove("hidden");
    }

    function closeModal() {
        modal.classList.add("hidden");
        if (form) form.reset();
    }

    openBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const nameInput = document.getElementById("new-supplier-name");
            const countryInput = document.getElementById("new-supplier-country");
            const categoryInput = document.getElementById("new-supplier-category");
            const riskSelect = document.getElementById("new-supplier-risk");

            const name = nameInput.value.trim();
            const country = countryInput.value.trim();
            const category = categoryInput.value.trim();
            const riskLevel = riskSelect.value;

            if (!name || !country || !category) return;

            const nextIndex = supplierState.length + 1;
            const supplierId = `SUP-${String(nextIndex).padStart(3, "0")}`;

            supplierState.push({
                supplier_id: supplierId,
                name,
                country,
                category
            });

            let score = 3.0;
            if (riskLevel === "Low") score = 2.0;
            if (riskLevel === "High") score = 4.0;

            riskState.push({
                supplier_id: supplierId,
                overall_risk_score: score,
                risk_level: riskLevel
            });

            persistState();
            mergedData = joinSuppliersWithRisk();

            renderKPIs();
            renderSupplierTable();
            renderRiskChart();
            renderRiskAnalysis();

            closeModal();
        });
    }
}

// --- Routing Logic ---

function initRouting() {
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute("data-page");
            showPage(targetPage);
        });
    });
}

function showPage(pageName) {
    const sections = document.querySelectorAll("[data-page-section]");
    const pageTitle = document.getElementById("page-title");
    const navLinks = document.querySelectorAll(".nav-link");

    // Hide all sections
    sections.forEach(section => {
        section.classList.add("hidden");
    });

    // Show target section
    const targetSection = document.getElementById(`page-${pageName}`);
    if (targetSection) {
        targetSection.classList.remove("hidden");
    }

    // Update Nav State
    navLinks.forEach(l => {
        l.classList.remove("active-nav-item");
        l.classList.add("text-theme-secondary");

        // Reset icon color (optional, handled by CSS mostly but good for safety)
        const icon = l.querySelector("svg");
        // if(icon) icon.classList.remove("text-blue-500"); 
    });

    // Find active link
    const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add("active-nav-item");
        activeLink.classList.remove("text-theme-secondary");

        // Update Title
        pageTitle.textContent = activeLink.textContent.trim();
    }
}


// --- Audit Engine Logic ---

function initAuditEngine() {
    const form = document.getElementById("audit-form");
    const supplierSelect = document.getElementById("audit-supplier");
    const scoreEl = document.getElementById("audit-score");
    const levelEl = document.getElementById("audit-risk-level");
    const badgeEl = document.getElementById("audit-result-badge");
    const recEl = document.getElementById("audit-recommendation");

    if (!form || !supplierSelect) return;

    // Populate supplier dropdown from current state
    function populateSuppliers() {
        supplierSelect.innerHTML = "";
        supplierState.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.supplier_id;
            opt.textContent = `${s.supplier_id} — ${s.name}`;
            supplierSelect.appendChild(opt);
        });
    }

    populateSuppliers();

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);

        const keys = ["receiving", "storage", "cleaning", "allergen"];
        let total = 0;
        keys.forEach((k) => {
            const value = data.get(`q_${k}`);
            if (value !== null) {
                total += Number(value);
            }
        });

        let level = "Low";
        let rec =
            "Solid controls in place. Maintain current practices and continue periodic verification audits.";

        if (total >= 3 && total <= 5) {
            level = "Medium";
            rec =
                "Some weaknesses detected. Plan corrective actions, assign owners, and schedule a focused follow-up audit.";
        } else if (total >= 6) {
            level = "High";
            rec =
                "Significant gaps identified. Consider blocking new orders until corrective actions are closed and verified.";
        }

        // Update right-hand panel
        scoreEl.textContent = String(total);
        levelEl.textContent = level;
        recEl.textContent = rec;

        badgeEl.textContent = level === "Low" ? "Compliant" : level === "Medium" ? "Monitor" : "High Risk";
        badgeEl.className =
            "px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-theme " +
            (level === "Low"
                ? "badge-low"
                : level === "Medium"
                ? "badge-medium"
                : "badge-high");

        // Also push this result into the supplier's risk profile so the rest of the app reacts
        const selectedSupplierId = supplierSelect.value;
        if (selectedSupplierId) {
            // Simple mapping from audit result to an overall risk score
            let mappedScore = 2.0;
            if (level === "Medium") mappedScore = 3.5;
            if (level === "High") mappedScore = 4.5;

            const riskEntry = riskState.find((r) => r.supplier_id === selectedSupplierId);
            if (riskEntry) {
                riskEntry.overall_risk_score = mappedScore;
                riskEntry.risk_level = level;
            } else {
                riskState.push({
                    supplier_id: selectedSupplierId,
                    overall_risk_score: mappedScore,
                    risk_level: level
                });
            }

            persistState();
            mergedData = joinSuppliersWithRisk();
            renderKPIs();
            renderSupplierTable();
            renderRiskChart();
            renderRiskAnalysis();
        }
    });
}



// --- Risk Analysis Upload / Ingestion Prototype ---

function initRiskAnalysisUpload() {
    const fileInput = document.getElementById("audit-file-input");
    const statusEl = document.getElementById("audit-upload-status");
    const detailsEl = document.getElementById("audit-upload-details");

    if (!fileInput || !statusEl || !detailsEl) return;

    function setStatus(msg) {
        statusEl.textContent = msg;
    }

    function setDetails(msg) {
        detailsEl.textContent = msg;
    }

    function parseExcelAudit(file) {
        if (typeof XLSX === "undefined") {
            setStatus("XLSX library not loaded. Please check your connection.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (!rows || rows.length < 2) {
                    setStatus("No data rows found in Excel file.");
                    return;
                }

                // Expect header row: SupplierID, Receiving, Storage, Cleaning, Allergen
                const bodyRows = rows.slice(1).filter(r => r && r.length >= 5);
                if (!bodyRows.length) {
                    setStatus("Could not detect expected columns. Using first 5 columns as scores.");
                    return;
                }

                let totalAudits = bodyRows.length;
                let low = 0, medium = 0, high = 0;

                bodyRows.forEach(r => {
                    const scores = [Number(r[1]) || 0, Number(r[2]) || 0, Number(r[3]) || 0, Number(r[4]) || 0];
                    const sum = scores.reduce((a, b) => a + b, 0);
                    if (sum <= 2) low++;
                    else if (sum <= 5) medium++;
                    else high++;
                });

                setStatus("Excel audit file imported successfully.");
                setDetails(
                    "Total audits: " + totalAudits +
                    "\nLow risk: " + low +
                    "\nMedium risk: " + medium +
                    "\nHigh risk: " + high +
                    "\n\nPrototype behaviour: this summary is shown for demonstration; in a full version, each row would be merged to the matching supplier and update their risk profile."
                );
            } catch (err) {
                console.error(err);
                setStatus("Error reading Excel file.");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function parseCsvAudit(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) {
                setStatus("CSV file does not contain any data rows.");
                return;
            }
            const body = lines.slice(1);
            let count = body.length;
            setStatus("CSV audit file imported (prototype).");
            setDetails(
                "Detected " + count + " data rows. In a full implementation these rows would be parsed into the same scoring model as Excel uploads."
            );
        };
        reader.readAsText(file);
    }

    function parseSpsSyntax(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const computeLine = text.split(/\r?\n/).find(line => line.toUpperCase().includes("COMPUTE"));
            setStatus(".sps syntax file loaded (prototype).");
            setDetails(
                "Example COMPUTE line detected:\n" +
                (computeLine ? computeLine.trim() : "[no COMPUTE statement found]") +
                "\n\nIn a full version, this syntax would be parsed and used to adjust the weights of the risk model directly from SPSS."
            );
        };
        reader.readAsText(file);
    }

    function handleFile(file) {
        if (!file) return;
        setDetails("");
        const name = file.name.toLowerCase();

        if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
            setStatus("Processing Excel audit file...");
            parseExcelAudit(file);
        } else if (name.endsWith(".csv")) {
            setStatus("Processing CSV audit file...");
            parseCsvAudit(file);
        } else if (name.endsWith(".sps")) {
            setStatus("Reading SPSS syntax file...");
            parseSpsSyntax(file);
        } else if (name.endsWith(".sav")) {
            setStatus(".sav data file selected (concept only).");
            setDetails(
                "Binary .sav files are typically processed server-side. In this front-end prototype we simply acknowledge the file. In a production system this would be sent to a secure API for statistical processing."
            );
        } else {
            setStatus("Unsupported file type. Please upload .xls, .xlsx, .csv, .sav or .sps.");
        }
    }

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        handleFile(file);
    });
}

// --- Theme Logic ---

function initThemeToggle() {
    const toggleBtn = document.getElementById("theme-toggle");
    const iconSpan = document.getElementById("theme-toggle-icon");
    const labelSpan = document.getElementById("theme-toggle-label");
    const body = document.body;

    const moonIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
    const sunIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;

    function updateThemeUI() {
        if (body.classList.contains("theme-dark")) {
            iconSpan.innerHTML = moonIcon;
            labelSpan.textContent = "Dark";
        } else {
            iconSpan.innerHTML = sunIcon;
            labelSpan.textContent = "Light";
        }
        renderRiskChart(); // Re-render chart to update colors
        renderRiskAnalysis();
    }

    // Initial State
    updateThemeUI();

    toggleBtn.addEventListener("click", () => {
        if (body.classList.contains("theme-dark")) {
            body.classList.remove("theme-dark");
            body.classList.add("theme-light");
        } else {
            body.classList.remove("theme-light");
            body.classList.add("theme-dark");
        }
        updateThemeUI();
    });
}


// --- Mobile Sidebar Toggle ---

function initMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    if (!sidebar || !toggleBtn) return;

    // Open/close sidebar on mobile button click
    toggleBtn.addEventListener("click", () => {
        const isHidden = sidebar.classList.contains("hidden");
        if (isHidden) {
            sidebar.classList.remove("hidden");
            sidebar.classList.remove("-translate-x-full");
        } else {
            sidebar.classList.add("-translate-x-full");
            // Small delay to allow animation before hiding
            setTimeout(() => sidebar.classList.add("hidden"), 200);
        }
    });

    // Close sidebar when a nav-link is clicked on small screens
    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth < 768) {
                sidebar.classList.add("-translate-x-full");
                setTimeout(() => sidebar.classList.add("hidden"), 200);
            }
        });
    });

    // Ensure correct state on resize
    window.addEventListener("resize", () => {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove("hidden");
            sidebar.classList.remove("-translate-x-full");
        } else {
            sidebar.classList.add("hidden");
            sidebar.classList.add("-translate-x-full");
        }
    });
}

// --- Initialization ---

document.addEventListener("DOMContentLoaded", () => {
    loadState();
    mergedData = joinSuppliersWithRisk();

    renderKPIs();
    renderSupplierTable();
    initRouting();
    initThemeToggle();
    initMobileSidebar();
    initAddSupplier();
    initAuditEngine();
    initRiskAnalysisUpload();

    // Initial Chart Render (called by initThemeToggle too, but safe to call here)
    renderRiskChart();
    renderRiskAnalysis(); 
});
