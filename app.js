const APPS_SCRIPT_URL = "PEGA_AQUI_TU_URL"; // <-- Reemplaza esto con la URL de tu Web App de Google Apps Script

document.addEventListener('DOMContentLoaded', () => {
    // Referencias Vista Usuario
    const slider = document.getElementById('blindSlider');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const goToAdminBtn = document.getElementById('goToAdminBtn');
    const shotNameInput = document.getElementById('shotName');
    
    // Referencias Vista Admin
    const goToUserBtn = document.getElementById('goToUserBtn');
    const resultsBody = document.getElementById('resultsBody');
    const noDataMsg = document.getElementById('noDataMsg');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const resultsTable = document.getElementById('resultsTable');

    // Referencias Vistas
    const userView = document.getElementById('userView');
    const adminView = document.getElementById('adminView');

    // Estado local para sugerencias
    let lastEvaluations = [];

    // --- LÓGICA DE VISTA DE USUARIO ---
    function resetSlider() {
        slider.value = 5; 
        slider.disabled = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar Selección";
        
        // Autocompletado secuencial
        if (lastEvaluations.length > 0) {
            const lastShot = lastEvaluations[lastEvaluations.length - 1].shotName || "";
            const match = lastShot.match(/^(.*?)(\d+)$/);
            
            if (match) {
                const prefix = match[1];
                const number = parseInt(match[2], 10);
                shotNameInput.value = prefix + (number + 1);
            } else {
                shotNameInput.value = lastShot ? lastShot + " 2" : "Shot 1";
            }
        } else {
            shotNameInput.value = "Shot 1";
        }
    }

    submitBtn.addEventListener('click', async () => {
        const shotName = shotNameInput.value.trim();
        if (!shotName) {
            alert("Por favor, ingresa el Identificador / Shot antes de confirmar.");
            return;
        }

        if (APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL") {
            // FALLBACK A LOCALSTORAGE
            slider.disabled = true;
            submitBtn.disabled = true;
            submitBtn.textContent = "Guardando localmente...";
            
            const exactValue = slider.value;
            const timestamp = new Date().toLocaleString('es-CR');
            
            const newEvaluation = {
                id: Date.now(),
                shotName: shotName,
                value: exactValue,
                timestamp: timestamp
            };
            
            let evals = JSON.parse(localStorage.getItem('blind_evaluations') || '[]');
            evals.push(newEvaluation);
            localStorage.setItem('blind_evaluations', JSON.stringify(evals));
            
            lastEvaluations.push(newEvaluation);
            successMessage.classList.remove('hidden');
            setTimeout(() => {
                successMessage.classList.add('hidden');
                resetSlider();
            }, 2000);
            return;
        }

        // Bloquear temporalmente
        slider.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Guardando en la nube...";

        const exactValue = slider.value;
        const timestamp = new Date().toLocaleString('es-CR');
        
        const newEvaluation = {
            action: 'add',
            id: Date.now(),
            shotName: shotName,
            value: exactValue,
            timestamp: timestamp
        };

        try {
            // Enviar datos a Google Sheets
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                // No 'Content-Type': 'application/json' porque puede fallar con CORS en Apps Script simple
                // Text/plain evita preflight requests complicados
                body: JSON.stringify(newEvaluation),
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                // Guardar en el estado local para la sugerencia del próximo shot
                lastEvaluations.push(newEvaluation);
                
                // Mostrar éxito
                successMessage.classList.remove('hidden');

                // Resetear después de 2 segundos para la siguiente evaluación
                setTimeout(() => {
                    successMessage.classList.add('hidden');
                    resetSlider();
                }, 2000);
            } else {
                throw new Error("Error del servidor");
            }

        } catch (error) {
            console.error("Error guardando:", error);
            alert("Hubo un error al guardar los datos. Revisa tu conexión a internet.");
            submitBtn.disabled = false;
            slider.disabled = false;
            submitBtn.textContent = "Reintentar";
        }
    });

    // --- LÓGICA DE VISTA DE ADMINISTRADOR ---
    async function loadAdminData() {
        if (APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL") {
            // FALLBACK A LOCALSTORAGE
            const evals = JSON.parse(localStorage.getItem('blind_evaluations') || '[]');
            renderTable(evals);
            return;
        }

        resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando datos desde Google Sheets...</td></tr>';
        noDataMsg.style.display = 'none';
        resultsTable.style.display = 'table';
        clearDataBtn.disabled = true;

        try {
            const response = await fetch(APPS_SCRIPT_URL);
            const evaluations = await response.json();
            clearDataBtn.disabled = false;
            renderTable(evaluations);
        } catch (error) {
            console.error("Error cargando:", error);
            resultsBody.innerHTML = '';
            noDataMsg.textContent = "Error al cargar los datos de la nube. Revisa tu conexión a internet o la URL del script.";
            noDataMsg.style.display = 'block';
            resultsTable.style.display = 'none';
        }
    }

    function renderTable(evaluations) {
        resultsBody.innerHTML = '';
        if (!evaluations || evaluations.length === 0) {
            noDataMsg.textContent = "No hay evaluaciones registradas aún.";
            noDataMsg.style.display = 'block';
            resultsTable.style.display = 'none';
            return;
        }
        
        noDataMsg.style.display = 'none';
        resultsTable.style.display = 'table';

        evaluations.forEach((eval, index) => {
            const tr = document.createElement('tr');
            
            const tdIndex = document.createElement('td');
            tdIndex.textContent = index + 1;

            const tdShot = document.createElement('td');
            tdShot.textContent = eval.shotName || "N/A";
            
            const tdTime = document.createElement('td');
            tdTime.textContent = eval.timestamp;
            
            const tdValue = document.createElement('td');
            tdValue.innerHTML = `<strong>${eval.value}</strong>`;
            
            tr.appendChild(tdIndex);
            tr.appendChild(tdShot);
            tr.appendChild(tdTime);
            tr.appendChild(tdValue);
            
            resultsBody.appendChild(tr);
        });
    }

    clearDataBtn.addEventListener('click', async () => {
        const msg = APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL" 
            ? '¿Estás seguro de que quieres borrar TODAS las evaluaciones locales? Esta acción no se puede deshacer.'
            : '¿Estás seguro de que quieres borrar TODAS las evaluaciones de la nube? Esta acción no se puede deshacer.';
            
        if (confirm(msg)) {
            clearDataBtn.disabled = true;
            clearDataBtn.textContent = "Borrando...";

            if (APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL") {
                // FALLBACK
                localStorage.removeItem('blind_evaluations');
                lastEvaluations = [];
                loadAdminData();
                clearDataBtn.textContent = "Borrar Todos los Datos";
                clearDataBtn.disabled = false;
                return;
            }

            try {
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'clear' }),
                });

                const result = await response.json();
                
                if (result.status === 'success') {
                    lastEvaluations = []; // limpiar estado local también
                    loadAdminData();
                } else {
                    throw new Error("Error del servidor");
                }
            } catch (error) {
                console.error("Error borrando:", error);
                alert("Error al intentar borrar los datos.");
            } finally {
                clearDataBtn.textContent = "Borrar Todos los Datos";
                clearDataBtn.disabled = false;
            }
        }
    });

    // --- LÓGICA DE NAVEGACIÓN ---
    goToAdminBtn.addEventListener('click', () => {
        const password = prompt("Ingrese la contraseña de administrador:");
        if (password === "123456") {
            userView.style.display = 'none';
            adminView.style.display = 'flex'; // Ajustado al flex del CSS nuevo
            loadAdminData(); // Cargar datos al entrar al panel
        } else if (password !== null) {
            alert("Contraseña incorrecta.");
        }
    });

    goToUserBtn.addEventListener('click', () => {
        adminView.style.display = 'none';
        userView.style.display = 'flex'; // Ajustado al flex del CSS nuevo
    });

    // Inicializar
    resetSlider();
});
