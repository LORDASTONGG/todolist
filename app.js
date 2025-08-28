// Admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "s2sonsilah";

// DOM Elements
const loginSection = document.getElementById('loginSection');
const todoSection = document.getElementById('todoSection');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const todoList = document.getElementById('todoList');
const newTaskInput = document.getElementById('newTask');
// Task array
let tasks = [];
let tasksCollection;

// Wait for Firebase to be ready
document.addEventListener('firebaseReady', () => {
    const { collection, onSnapshot, orderBy, query } = window.firebaseModules;
    tasksCollection = collection(window.db, 'todos');
    loadTasks();
});

// Login function
function login() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Successful login
        loginSection.style.display = 'none';
        todoSection.style.display = 'block';
        errorMessage.textContent = '';
        loadTasks();
    } else {
        // Failed login
        errorMessage.textContent = 'Hatalı kullanıcı adı veya şifre!';
    }
}

// Add new task
async function addTask() {
    const taskText = newTaskInput.value.trim();
    const taskUrl = document.getElementById('taskUrl').value.trim();
    const taskUrl2 = document.getElementById('taskUrl2').value.trim();
    const taskUrl3 = document.getElementById('taskUrl3').value.trim();
    const addButton = document.querySelector('button[onclick="addTask()"]');
    const originalButtonHTML = addButton.innerHTML;

    if (taskText === '') {
        showError('Lütfen bir görev yazın!');
        newTaskInput.focus();
        return;
    }

    // Butonu devre dışı bırak ve yükleme durumunu göster
    addButton.disabled = true;
    addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        console.log('Görev ekleniyor...', taskText);
        const { addDoc } = window.firebaseModules;
        
        const now = new Date();
        await addDoc(tasksCollection, {
            text: taskText,
            url: taskUrl,
            url2: taskUrl2,
            url3: taskUrl3,
            completed: false,
            timestamp: now.toISOString(),
            displayTime: now.toLocaleString('tr-TR')
        });
        
        // Clear URL inputs after adding task
        document.getElementById('taskUrl').value = '';
        document.getElementById('taskUrl2').value = '';
        document.getElementById('taskUrl3').value = '';
        
        // Başarılı mesajı göster ve input'u temizle
        newTaskInput.value = '';
        showError('Görev eklendi!', 'success');
        newTaskInput.focus();
        
        // Butonu eski haline getir
        addButton.disabled = false;
        addButton.innerHTML = originalButtonHTML;
    } catch (error) {
        console.error('Görev eklenirken hata oluştu:', error);
        showError('Görev eklenirken bir hata oluştu: ' + error.message);
        
        // Hata durumunda da butonu eski haline getir
        addButton.disabled = false;
        addButton.innerHTML = originalButtonHTML;
    }
}

// Delete task
async function deleteTask(id) {
    try {
        const { doc, deleteDoc } = window.firebaseModules;
        await deleteDoc(doc(window.db, 'todos', id));
    } catch (error) {
        console.error('Error deleting task: ', error);
        showError('Görev silinirken bir hata oluştu');
    }
}

// Toggle task completion
async function toggleTaskCompletion(id, currentStatus) {
    try {
        const { doc, updateDoc } = window.firebaseModules;
        await updateDoc(doc(window.db, 'todos', id), {
            completed: !currentStatus
        });
    } catch (error) {
        console.error('Error updating task: ', error);
        showError('Görev güncellenirken bir hata oluştu');
    }
}

// Load tasks from Firestore
function loadTasks() {
    console.log('Görevler yükleniyor...');
    const { query, orderBy, onSnapshot } = window.firebaseModules;
    const q = query(tasksCollection, orderBy('timestamp', 'desc'));
    
    return onSnapshot(q, 
        (snapshot) => {
            console.log('Görevler alındı, toplam:', snapshot.size);
            tasks = [];
            snapshot.forEach((doc) => {
                console.log('Görev:', doc.id, doc.data());
                tasks.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            renderTasks();
        }, 
        (error) => {
            console.error('Görevler yüklenirken hata oluştu:', error);
            showError('Görevler yüklenirken bir hata oluştu: ' + error.message);
        }
    );
}

// Render tasks
function renderTasks() {
    if (tasks.length === 0) {
        todoList.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>Henüz görev bulunmamaktadır</p>
                <small>Yukarıdan yeni bir görev ekleyin</small>
            </div>`;
        return;
    }

    todoList.innerHTML = tasks.map(task => {
        // Escape HTML in task text to prevent XSS
        const escapedText = task.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const formattedTime = formatDate(task.displayTime || task.timestamp);
        
        // Function to create URL HTML
        const createUrlHtml = (url, index) => {
            if (!url || url.trim() === '') return '';
            
            // Ensure URL has http:// or https://
            let processedUrl = url.trim();
            if (!processedUrl.match(/^https?:\/\//)) {
                processedUrl = 'http://' + processedUrl;
            }
            
            try {
                const urlObj = new URL(processedUrl);
                const domain = urlObj.hostname.replace('www.', '');
                return `
                    <div class="todo-url">
                        <a href="${processedUrl}" class="task-link" target="_blank" rel="noopener noreferrer">
                            ${index ? index + '. ' : ''}${domain}
                        </a>
                        <a href="${processedUrl}" class="url-button" target="_blank" rel="noopener noreferrer" title="${processedUrl}">
                            RESİM TIKLA
                        </a>
                    </div>`;
            } catch (e) {
                console.error('Invalid URL:', processedUrl);
                return '';
            }
        };
        
        // Create URL content for all three URL fields
        const urlContent = [
            createUrlHtml(task.url, 1),
            createUrlHtml(task.url2, 2),
            createUrlHtml(task.url3, 3)
        ].filter(html => html !== '').join('');
        
        return `
        <div class="todo-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="todo-content">
                <div class="todo-header">
                    <div class="todo-text">${escapedText}</div>
                    <span class="todo-status ${task.completed ? 'status-completed' : 'status-pending'}">
                        ${task.completed ? 'Tamamlandı' : 'Bekliyor'}
                    </span>
                </div>
                ${urlContent}
                <div class="todo-timestamp">
                    <i class="far fa-clock"></i>
                    ${formattedTime}
                </div>
            </div>
            <div class="todo-actions">
                <button class="complete-btn" onclick="toggleTaskCompletion('${task.id}', ${task.completed || false})" title="${task.completed ? 'Geri Al' : 'Tamamlandı'}">
                    <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                </button>
                <button class="delete-btn" onclick="deleteTask('${task.id}')" title="Sil">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Tarih formatını düzenle
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 3000);
}


// Hata mesajı göster
function showError(message, type = 'error') {
    errorMessage.textContent = message;
    errorMessage.className = 'error-message';
    
    if (type === 'success') {
        errorMessage.classList.add('success');
    }
    
    setTimeout(() => {
        errorMessage.textContent = '';
        errorMessage.className = 'error-message';
    }, 3000);
}

// Enter tuşu ile giriş yapma
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (loginSection.style.display !== 'none') {
            login();
        } else if (document.activeElement === newTaskInput) {
            addTask();
        }
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Show login by default
    loginSection.style.display = 'flex';
    todoSection.style.display = 'none';
    
    // Focus on username input
    usernameInput.focus();
    
    // Dispatch event that Firebase is ready
    document.dispatchEvent(new Event('firebaseReady'));
});
