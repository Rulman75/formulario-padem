document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('school-form');
    const toast = document.getElementById('toast');
    const submitBtn = document.getElementById('submit-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const autoSaveStatus = document.getElementById('auto-save-status');
    const autoSaveText = document.getElementById('auto-save-text');

    let autoSaveTimeout = null;

    // Load existing data on initialization
    try {
        const res = await fetch('/api/form-data');
        const result = await res.json();
        
        if (result.success) {
            // Set fixed fields
            if (result.data.school_name) document.getElementById('nombre_establecimiento').value = result.data.school_name;
            if (result.data.director_name) document.getElementById('nombre_director').value = result.data.director_name;
            if (result.data.username) document.getElementById('rbd').value = result.data.username;

            const data = result.data.formData;
            if (data && Object.keys(data).length > 0) {
                for (const key in data) {
                    const elements = form.elements[key];
                    if (elements) {
                        if (elements.type === 'radio') {
                            if (elements.length) {
                                for (let i = 0; i < elements.length; i++) {
                                    if (elements[i].value === data[key]) {
                                        elements[i].checked = true;
                                    }
                                }
                            } else {
                                if (elements.value === data[key]) elements.checked = true;
                            }
                        } else if (elements.type === 'checkbox') {
                            elements.checked = (data[key] === true || data[key] === 'on');
                        } else {
                            elements.value = data[key];
                        }
                    }
                }
                calcAverages(); // Recalculate formulas after load
            }
        }
    } catch (err) {
        console.error('Error loading previous data:', err);
    }

    // Funcionalidad de autocalculado de promedios para Sección 7
    function calcAverages() {
        const types = ['mat', 'asis', 'ret', 'reten'];
        types.forEach(type => {
            const inputs = document.querySelectorAll(`.s7_${type}`);
            let sum = 0, count = 0;
            inputs.forEach(input => {
                const val = parseFloat(input.value);
                if (!isNaN(val)) { sum += val; count++; }
            });
            const promInput = document.getElementById(`s7_${type}_prom`);
            if (promInput) promInput.value = count > 0 ? (sum / count).toFixed(2) : '';
        });
    }

    const section7Inputs = document.querySelectorAll('.s7_mat, .s7_asis, .s7_ret, .s7_reten');
    section7Inputs.forEach(input => input.addEventListener('input', calcAverages));

    // Get all form data as a plain object
    function getFormData() {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }

    // Save logic
    async function saveForm() {
        const data = getFormData();
        
        autoSaveStatus.className = 'auto-save-status saving';
        autoSaveText.textContent = 'Guardando...';

        try {
            const res = await fetch('/api/form-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                autoSaveStatus.className = 'auto-save-status saved';
                autoSaveText.textContent = 'Guardado';
                return true;
            }
        } catch (err) {
            console.error('Error saving data:', err);
            autoSaveStatus.className = 'auto-save-status';
            autoSaveText.textContent = 'Error de red';
            return false;
        }
    }

    // Auto-save handler (debounced)
    form.addEventListener('input', () => {
        autoSaveStatus.className = 'auto-save-status';
        autoSaveText.textContent = 'Escribiendo...';
        
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            saveForm();
        }, 1200); // Auto-save 1.2 seconds after typing stops
    });

    // Manual Save button
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalHtml = submitBtn.innerHTML;
        
        submitBtn.innerHTML = `<span>Guardando...</span>`;
        submitBtn.disabled = true;

        const success = await saveForm();

        if (success) {
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        submitBtn.innerHTML = originalHtml;
        submitBtn.disabled = false;
    });

    // Logout handler
    logoutBtn.addEventListener('click', async () => {
        logoutBtn.textContent = 'Saliendo...';
        await saveForm(); // Force save before logout
        const res = await fetch('/api/logout', { method: 'POST' });
        if (res.ok) {
            window.location.href = '/login';
        }
    });
});
