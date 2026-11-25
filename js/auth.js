const AUTH_KEYS = {
    USERS: 'pokedock_users',
    SESSION: 'pokedock_session'
};

function seedDefaultUsers() {
    const existing = JSON.parse(localStorage.getItem(AUTH_KEYS.USERS));
    if (!existing || existing.length === 0) {
        const defaultUsers = [
            { username: 'admin', password: '123', role: 'admin' },
            { username: 'moderador', password: '123', role: 'moderador' },
            { username: 'investigador', password: '123', role: 'investigador' },
            { username: 'usuario', password: '123', role: 'usuario' }
        ];
        localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(defaultUsers));
    } else if (!existing.some(u => u.username === 'moderador')) {
        existing.splice(1, 0, { username: 'moderador', password: '123', role: 'moderador' });
        localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(existing));
    }
}

function getUsers() {
    seedDefaultUsers();
    return JSON.parse(localStorage.getItem(AUTH_KEYS.USERS)) || [];
}

function showAlert(elementId, message, type = 'danger') {
    const alertBox = document.getElementById(elementId);
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} rounded-3 py-2 small fw-semibold`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', () => {
    seedDefaultUsers();

    if (localStorage.getItem(AUTH_KEYS.SESSION)) {
        window.location.href = 'index.html';
        return;
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;

            if (!username || !password) {
                showAlert('authAlert', 'Completa ambos campos para continuar.');
                return;
            }

            const users = getUsers();
            if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
                showAlert('authAlert', 'Ese nombre de usuario ya existe.');
                return;
            }

            users.push({
                username,
                password,
                role: 'usuario'
            });
            localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));

            showAlert('authAlert', 'Cuenta creada correctamente. Redirigiendo al login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 900);
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            const users = getUsers();
            const matchedUser = users.find(
                u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
            );

            if (!matchedUser) {
                showAlert('authAlert', 'Usuario o contrasena incorrectos.');
                return;
            }

            localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify({
                username: matchedUser.username,
                role: matchedUser.role
            }));

            window.location.href = 'index.html';
        });

        document.querySelectorAll('[data-demo-user]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('loginUsername').value = btn.dataset.demoUser;
                document.getElementById('loginPassword').value = '123';
            });
        });
    }
});