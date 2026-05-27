import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    getDocs,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB03Qs1EQ9ALXtQ9am5wM7waZvtE_-tTRM",
  authDomain: "estadistica-lll.firebaseapp.com",
  projectId: "estadistica-lll",
  storageBucket: "estadistica-lll.firebasestorage.app",
  messagingSenderId: "390500850905",
  appId: "1:390500850905:web:faa43eb237e9f673e1f2c8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

    let lastEvaluations = [];
    let unsubscribeAdmin = null; // Para la escucha en tiempo real

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

        // Bloquear temporalmente
        slider.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Guardando en la nube...";

        const exactValue = slider.value;
        const timestamp = new Date().toLocaleString('es-CR');
        
        try {
            const evalData = {
                shotName: shotName,
                value: exactValue,
                timestamp: timestamp,
                createdAt: Date.now() // para ordenar
            };

            // Guardar en Firestore
            await addDoc(collection(db, "evaluaciones"), evalData);

            // Guardar en el estado local para la sugerencia del próximo shot
            lastEvaluations.push(evalData);
            
            // Mostrar éxito
            successMessage.classList.remove('hidden');

            // Resetear después de 2 segundos para la siguiente evaluación
            setTimeout(() => {
                successMessage.classList.add('hidden');
                resetSlider();
            }, 2000);

        } catch (error) {
            console.error("Error guardando en Firebase:", error);
            alert("Hubo un error al guardar los datos en la nube. Revisa tu conexión a internet.");
            submitBtn.disabled = false;
            slider.disabled = false;
            submitBtn.textContent = "Reintentar";
        }
    });

    // --- LÓGICA DE VISTA DE ADMINISTRADOR ---
    function initAdminListener() {
        resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sincronizando con Firebase en tiempo real...</td></tr>';
        noDataMsg.style.display = 'none';
        resultsTable.style.display = 'table';
        clearDataBtn.disabled = true;

        const q = query(collection(db, "evaluaciones"), orderBy("createdAt", "asc"));
        
        // onSnapshot escucha los cambios en tiempo real automáticamente
        unsubscribeAdmin = onSnapshot(q, (snapshot) => {
            clearDataBtn.disabled = false;
            
            if (snapshot.empty) {
                resultsBody.innerHTML = '';
                noDataMsg.textContent = "No hay evaluaciones registradas aún.";
                noDataMsg.style.display = 'block';
                resultsTable.style.display = 'none';
                return;
            }

            noDataMsg.style.display = 'none';
            resultsTable.style.display = 'table';
            resultsBody.innerHTML = '';

            let index = 1;
            snapshot.forEach((doc) => {
                const evalData = doc.data();
                const tr = document.createElement('tr');
                
                const tdIndex = document.createElement('td');
                tdIndex.textContent = index++;

                const tdShot = document.createElement('td');
                tdShot.textContent = evalData.shotName || "N/A";
                
                const tdTime = document.createElement('td');
                tdTime.textContent = evalData.timestamp;
                
                const tdValue = document.createElement('td');
                tdValue.innerHTML = `<strong>${evalData.value}</strong>`;
                
                tr.appendChild(tdIndex);
                tr.appendChild(tdShot);
                tr.appendChild(tdTime);
                tr.appendChild(tdValue);
                
                resultsBody.appendChild(tr);
            });
        }, (error) => {
            console.error("Error cargando de Firebase:", error);
            resultsBody.innerHTML = '';
            noDataMsg.textContent = "Error al cargar los datos. Esto podría ser por los permisos de la base de datos de Firebase.";
            noDataMsg.style.display = 'block';
            resultsTable.style.display = 'none';
        });
    }

    clearDataBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres borrar TODAS las evaluaciones de la nube? Esta acción no se puede deshacer.')) {
            clearDataBtn.disabled = true;
            clearDataBtn.textContent = "Borrando nube...";

            try {
                // Para borrar todo, obtenemos los documentos y borramos uno por uno (batch)
                const snapshot = await getDocs(collection(db, "evaluaciones"));
                const batch = writeBatch(db);
                
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                lastEvaluations = []; 
                // La tabla se vaciará sola gracias a onSnapshot
            } catch (error) {
                console.error("Error borrando:", error);
                alert("Error al intentar borrar los datos de Firebase.");
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
            adminView.style.display = 'flex';
            initAdminListener(); // Inicia la escucha en tiempo real
        } else if (password !== null) {
            alert("Contraseña incorrecta.");
        }
    });

    goToUserBtn.addEventListener('click', () => {
        adminView.style.display = 'none';
        userView.style.display = 'flex';
        // Apagamos el listener para no gastar lecturas cuando no estamos en la vista admin
        if (unsubscribeAdmin) {
            unsubscribeAdmin();
            unsubscribeAdmin = null;
        }
    });

    // Inicializar
    resetSlider();
