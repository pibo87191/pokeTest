const TYPE_CONFIG = {
    normal:   { es: 'Normal',    color: '#94A3B8', weak: ['fighting'] },
    fire:     { es: 'Fuego',     color: '#F97316', weak: ['water', 'ground', 'rock'] },
    water:    { es: 'Agua',      color: '#0EA5E9', weak: ['electric', 'grass'] },
    electric: { es: 'Electrico', color: '#EAB308', weak: ['ground'] },
    grass:    { es: 'Planta',    color: '#22C55E', weak: ['fire', 'ice', 'poison', 'flying', 'bug'] },
    ice:      { es: 'Hielo',     color: '#06B6D4', weak: ['fire', 'fighting', 'rock', 'steel'] },
    fighting: { es: 'Lucha',     color: '#DC2626', weak: ['flying', 'psychic', 'fairy'] },
    poison:   { es: 'Veneno',    color: '#9333EA', weak: ['ground', 'psychic'] },
    ground:   { es: 'Tierra',    color: '#D97706', weak: ['water', 'grass', 'ice'] },
    flying:   { es: 'Volador',   color: '#6366F1', weak: ['electric', 'ice', 'rock'] },
    psychic:  { es: 'Psiquico',  color: '#EC4899', weak: ['bug', 'ghost', 'dark'] },
    bug:      { es: 'Bicho',     color: '#84CC16', weak: ['fire', 'flying', 'rock'] },
    rock:     { es: 'Roca',      color: '#78716C', weak: ['water', 'grass', 'fighting', 'ground', 'steel'] },
    ghost:    { es: 'Fantasma',  color: '#6D28D9', weak: ['ghost', 'dark'] },
    dragon:   { es: 'Dragon',    color: '#4F46E5', weak: ['ice', 'dragon', 'fairy'] },
    dark:     { es: 'Siniestro', color: '#334155', weak: ['fighting', 'bug', 'fairy'] },
    steel:    { es: 'Acero',     color: '#64748B', weak: ['fire', 'fighting', 'ground'] },
    fairy:    { es: 'Hada',      color: '#F472B6', weak: ['poison', 'steel'] }
};

const ROLE_META = {
    admin: {
        label: 'Administrador',
        badgeClass: 'bg-warning text-dark',
        icon: 'bi-shield-lock',
        perkText: 'Control total: gestiona roles de usuarios, registra nuevos Pokemon, edita fichas y modera comentarios.'
    },
    moderador: {
        label: 'Moderador',
        badgeClass: 'bg-primary text-white',
        icon: 'bi-shield-check',
        perkText: 'Moderacion activa: destaca o elimina cualquier comentario y depura bitacoras de campo.'
    },
    investigador: {
        label: 'Investigador',
        badgeClass: 'bg-info text-dark',
        icon: 'bi-journal-medical',
        perkText: 'Acceso cientifico: documenta bitacoras de campo y visualiza metricas ocultas de captura/experiencia.'
    },
    usuario: {
        label: 'Usuario',
        badgeClass: 'bg-secondary text-white',
        icon: 'bi-person',
        perkText: 'Explorador: guarda tus Pokemon favoritos y participa en los comentarios de cada especie.'
    }
};

const activeSession = JSON.parse(localStorage.getItem('pokedock_session'));
if (!activeSession) {
    window.location.href = 'login.html';
}

let currentPokemonId = 1;
let currentPokemonData = null;
let catalogOffset = 0;
const CATALOG_LIMIT = 24;

const Storage = {
    getSession: () => JSON.parse(localStorage.getItem('pokedock_session')),
    setSession: (session) => localStorage.setItem('pokedock_session', JSON.stringify(session)),
    clearSession: () => localStorage.removeItem('pokedock_session'),

    getUsers: () => JSON.parse(localStorage.getItem('pokedock_users')) || [],
    saveUsers: (users) => localStorage.setItem('pokedock_users', JSON.stringify(users)),

    getFavoritesKey: () => `pokedock_favorites_${activeSession.username.toLowerCase()}`,
    getFavorites: () => JSON.parse(localStorage.getItem(Storage.getFavoritesKey())) || [],
    toggleFavorite: (id, name) => {
        let favs = Storage.getFavorites();
        const exists = favs.some(f => f.id == id);
        favs = exists ? favs.filter(f => f.id != id) : [...favs, { id, name }];
        localStorage.setItem(Storage.getFavoritesKey(), JSON.stringify(favs));
        return !exists;
    },

    getNotes: () => JSON.parse(localStorage.getItem('pokedock_notes')) || {},
    saveNote: (id, noteObj) => {
        const notes = Storage.getNotes();
        notes[id] = noteObj;
        localStorage.setItem('pokedock_notes', JSON.stringify(notes));
    },
    deleteNote: (id) => {
        const notes = Storage.getNotes();
        delete notes[id];
        localStorage.setItem('pokedock_notes', JSON.stringify(notes));
    },

    getOverrides: () => JSON.parse(localStorage.getItem('pokedock_overrides')) || {},
    saveOverride: (id, data) => {
        const overrides = Storage.getOverrides();
        overrides[id] = data;
        localStorage.setItem('pokedock_overrides', JSON.stringify(overrides));
    },
    deleteOverride: (id) => {
        const overrides = Storage.getOverrides();
        delete overrides[id];
        localStorage.setItem('pokedock_overrides', JSON.stringify(overrides));
    },

    getCustomList: () => JSON.parse(localStorage.getItem('pokedock_custom')) || [],
    addCustomPokemon: (poke) => {
        const list = Storage.getCustomList();
        const filtered = list.filter(item => item.id != poke.id);
        filtered.push(poke);
        localStorage.setItem('pokedock_custom', JSON.stringify(filtered));
    },

    getAllComments: () => JSON.parse(localStorage.getItem('pokedock_comments')) || {},
    getCommentsForPokemon: (id) => {
        const all = Storage.getAllComments();
        const list = all[id] || [];
        return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    },
    addComment: (pokeId, pokeName, text) => {
        const session = Storage.getSession();
        const all = Storage.getAllComments();
        if (!all[pokeId]) all[pokeId] = [];
        all[pokeId].unshift({
            id: Date.now(),
            pokeId,
            pokeName,
            author: session.username,
            role: session.role,
            text,
            date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            pinned: false
        });
        localStorage.setItem('pokedock_comments', JSON.stringify(all));
    },
    deleteComment: (pokeId, commentId) => {
        const all = Storage.getAllComments();
        if (!all[pokeId]) return;
        all[pokeId] = all[pokeId].filter(c => c.id !== commentId);
        localStorage.setItem('pokedock_comments', JSON.stringify(all));
    },
    togglePinComment: (pokeId, commentId) => {
        const all = Storage.getAllComments();
        if (!all[pokeId]) return;
        all[pokeId] = all[pokeId].map(c => c.id === commentId ? { ...c, pinned: !c.pinned } : c);
        localStorage.setItem('pokedock_comments', JSON.stringify(all));
    }
};

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function syncSessionRoleFromStorage() {
    const session = Storage.getSession();
    if (!session) return;
    const userRecord = Storage.getUsers().find(u => u.username.toLowerCase() === session.username.toLowerCase());
    if (userRecord && userRecord.role !== session.role) {
        session.role = userRecord.role;
        Storage.setSession(session);
    }
}

function applyRolePermissions() {
    syncSessionRoleFromStorage();
    const session = Storage.getSession();
    if (!session) return;

    const meta = ROLE_META[session.role] || ROLE_META.usuario;

    const greetingEl = document.getElementById('userGreeting');
    if (greetingEl) greetingEl.textContent = `Hola, ${session.username}`;

    const badge = document.getElementById('roleBadge');
    if (badge) {
        badge.className = `badge rounded-pill ${meta.badgeClass} px-3 py-1`;
        badge.innerHTML = `<i class="bi ${meta.icon} me-1"></i>${meta.label}`;
    }

    const drawerPerks = document.getElementById('drawerRoleFeatures');
    if (drawerPerks) {
        drawerPerks.innerHTML = `<strong><i class="bi ${meta.icon} me-1"></i>Permisos de ${meta.label}:</strong><br>${meta.perkText}`;
    }

    const btnOpenAdminPanel = document.getElementById('btnOpenAdminPanel');
    const btnOpenModPanel = document.getElementById('btnOpenModPanel');
    const adminControls = document.getElementById('adminControls');
    const adminCatalogControls = document.getElementById('adminCatalogControls');
    const researchForm = document.getElementById('researchForm');
    const noteReadOnly = document.getElementById('noteReadOnly');
    const btnModClearNote = document.getElementById('btnModClearNote');

    if (btnOpenAdminPanel) btnOpenAdminPanel.classList.add('d-none');
    if (btnOpenModPanel) btnOpenModPanel.classList.add('d-none');
    if (adminControls) adminControls.classList.add('d-none');
    if (adminCatalogControls) adminCatalogControls.classList.add('d-none');
    if (researchForm) researchForm.classList.add('d-none');
    if (noteReadOnly) noteReadOnly.classList.remove('d-none');
    if (btnModClearNote) btnModClearNote.classList.add('d-none');

    if (session.role === 'admin') {
        if (btnOpenAdminPanel) btnOpenAdminPanel.classList.remove('d-none');
        if (btnOpenModPanel) btnOpenModPanel.classList.remove('d-none');
        if (adminControls) adminControls.classList.remove('d-none');
        if (adminCatalogControls) adminCatalogControls.classList.remove('d-none');
        if (researchForm) researchForm.classList.remove('d-none');
        if (noteReadOnly) noteReadOnly.classList.add('d-none');
        if (btnModClearNote) btnModClearNote.classList.remove('d-none');
    } else if (session.role === 'moderador') {
        if (btnOpenModPanel) btnOpenModPanel.classList.remove('d-none');
        if (btnModClearNote) btnModClearNote.classList.remove('d-none');
    } else if (session.role === 'investigador') {
        if (researchForm) researchForm.classList.remove('d-none');
        if (noteReadOnly) noteReadOnly.classList.add('d-none');
    }

    const newIdInput = document.getElementById('newId');
    if (newIdInput) {
        newIdInput.value = 1026 + Storage.getCustomList().length;
    }

    renderDrawerLists();
}

function renderDrawerLists() {
    const favList = document.getElementById('favoritesList');
    if (favList) {
        const favs = Storage.getFavorites();
        favList.innerHTML = favs.length ? favs.map(f => `
            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                <a href="pokemon.html?id=${f.id}" class="text-decoration-none fw-semibold text-dark">
                    <span class="mono-num text-muted me-1">#${String(f.id).padStart(4, '0')}</span> ${f.name}
                </a>
                <span class="badge bg-warning text-dark rounded-pill"><i class="bi bi-star-fill"></i></span>
            </li>
        `).join('') : '<li class="list-group-item text-muted small px-0">Aun no tienes favoritos guardados.</li>';
    }

    const customList = document.getElementById('customPokemonList');
    if (customList) {
        const customs = Storage.getCustomList();
        customList.innerHTML = customs.length ? customs.map(c => `
            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                <a href="pokemon.html?id=${c.id}" class="text-decoration-none fw-semibold text-success">
                    <span class="mono-num me-1">#${c.id}</span> ${c.name}
                </a>
                <span class="badge bg-success rounded-pill">Custom</span>
            </li>
        `).join('') : '<li class="list-group-item text-muted small px-0">Ningun Pokemon creado aun.</li>';
    }
}

/* ==================== PANEL DE CONTROL ADMIN ==================== */
function renderAdminControlPanel() {
    const tbody = document.getElementById('adminUsersTableBody');
    const statsContainer = document.getElementById('adminSystemStats');
    if (!tbody) return;

    const users = Storage.getUsers();
    const currentSession = Storage.getSession();

    tbody.innerHTML = users.map(u => {
        const meta = ROLE_META[u.role] || ROLE_META.usuario;
        const isProtected = u.username.toLowerCase() === 'admin';
        return `
            <tr>
                <td class="fw-bold">
                    ${u.username}
                    ${u.username.toLowerCase() === currentSession.username.toLowerCase() ? '<span class="badge bg-light text-dark border ms-1">Tu</span>' : ''}
                </td>
                <td><span class="badge rounded-pill ${meta.badgeClass}">${meta.label}</span></td>
                <td>
                    <select class="form-select form-select-sm js-admin-role-select" data-username="${u.username}" ${isProtected ? 'disabled' : ''}>
                        <option value="usuario" ${u.role === 'usuario' ? 'selected' : ''}>Usuario</option>
                        <option value="investigador" ${u.role === 'investigador' ? 'selected' : ''}>Investigador</option>
                        <option value="moderador" ${u.role === 'moderador' ? 'selected' : ''}>Moderador</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                </td>
                <td class="text-end">
                    ${isProtected
                        ? '<span class="text-muted small">Principal</span>'
                        : `<button type="button" class="btn btn-outline-danger btn-sm js-admin-delete-user" data-username="${u.username}"><i class="bi bi-trash"></i></button>`}
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.js-admin-role-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const targetUser = e.target.dataset.username;
            const newRole = e.target.value;
            const updated = Storage.getUsers().map(u =>
                u.username.toLowerCase() === targetUser.toLowerCase() ? { ...u, role: newRole } : u
            );
            Storage.saveUsers(updated);
            showAdminAlert(`Rol de "${targetUser}" actualizado a ${ROLE_META[newRole].label}.`);
            applyRolePermissions();
            renderAdminControlPanel();
        });
    });

    document.querySelectorAll('.js-admin-delete-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetUser = btn.dataset.username;
            const updated = Storage.getUsers().filter(u => u.username.toLowerCase() !== targetUser.toLowerCase());
            Storage.saveUsers(updated);
            showAdminAlert(`Usuario "${targetUser}" eliminado.`, 'warning');
            renderAdminControlPanel();
        });
    });

    if (statsContainer) {
        const allComments = Storage.getAllComments();
        const totalComments = Object.values(allComments).reduce((acc, arr) => acc + arr.length, 0);
        const totalCustom = Storage.getCustomList().length;
        const totalOverrides = Object.keys(Storage.getOverrides()).length;
        const totalNotes = Object.keys(Storage.getNotes()).length;

        statsContainer.innerHTML = `
            <div class="col-6 col-md-3"><div class="p-2 bg-light rounded-3 border"><div class="h4 fw-bold mb-0">${users.length}</div><div class="small text-muted">Usuarios</div></div></div>
            <div class="col-6 col-md-3"><div class="p-2 bg-light rounded-3 border"><div class="h4 fw-bold mb-0 text-success">${totalCustom}</div><div class="small text-muted">Custom Poke</div></div></div>
            <div class="col-6 col-md-3"><div class="p-2 bg-light rounded-3 border"><div class="h4 fw-bold mb-0 text-primary">${totalNotes}</div><div class="small text-muted">Bitacoras</div></div></div>
            <div class="col-6 col-md-3"><div class="p-2 bg-light rounded-3 border"><div class="h4 fw-bold mb-0 text-warning">${totalComments}</div><div class="small text-muted">Comentarios</div></div></div>
        `;
    }
}

function showAdminAlert(msg, type = 'success') {
    const el = document.getElementById('adminPanelAlert');
    if (!el) return;
    el.className = `alert alert-${type} py-2 small fw-semibold rounded-3`;
    el.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 3000);
}

/* ==================== PANEL DE MODERACION ==================== */
function renderGlobalModerationPanel() {
    const container = document.getElementById('globalModCommentsList');
    if (!container) return;

    const all = Storage.getAllComments();
    const flat = Object.values(all).flat().sort((a, b) => b.id - a.id);

    if (flat.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4 small">No hay comentarios registrados en la Pokedex todavia.</div>';
        return;
    }

    container.innerHTML = flat.map(c => {
        const meta = ROLE_META[c.role] || ROLE_META.usuario;
        return `
            <div class="comment-item ${c.pinned ? 'pinned-comment' : ''} d-flex justify-content-between align-items-start gap-2">
                <div>
                    <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <a href="pokemon.html?id=${c.pokeId}" class="badge bg-dark text-info text-decoration-none">
                            #${String(c.pokeId).padStart(4, '0')} ${c.pokeName || 'Pokemon'}
                        </a>
                        <strong class="small">${c.author}</strong>
                        <span class="badge rounded-pill ${meta.badgeClass}" style="font-size: 0.65rem;">${meta.label}</span>
                        <span class="text-muted" style="font-size: 0.72rem;">${c.date}</span>
                    </div>
                    <p class="mb-0 small">${c.text}</p>
                </div>
                <div class="d-flex gap-1">
                    <button type="button" class="btn btn-outline-warning text-dark btn-sm js-mod-pin" data-poke-id="${c.pokeId}" data-id="${c.id}" title="Destacar / Quitar destacado">
                        <i class="bi ${c.pinned ? 'bi-pin-fill' : 'bi-pin'}"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm js-mod-del" data-poke-id="${c.pokeId}" data-id="${c.id}" title="Eliminar comentario">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.js-mod-pin').forEach(btn => {
        btn.addEventListener('click', () => {
            Storage.togglePinComment(btn.dataset.pokeId, Number(btn.dataset.id));
            renderGlobalModerationPanel();
            if (document.getElementById('commentsListContainer')) renderPokemonComments(currentPokemonId);
        });
    });

    container.querySelectorAll('.js-mod-del').forEach(btn => {
        btn.addEventListener('click', () => {
            Storage.deleteComment(btn.dataset.pokeId, Number(btn.dataset.id));
            renderGlobalModerationPanel();
            if (document.getElementById('commentsListContainer')) renderPokemonComments(currentPokemonId);
        });
    });
}

/* ==================== CATALOGO (INDEX.HTML) ==================== */
function createPokemonCardHTML(pokeObj) {
    const override = Storage.getOverrides()[pokeObj.id];
    const displayName = override?.name || capitalize(pokeObj.name);
    const isFav = Storage.getFavorites().some(f => f.id == pokeObj.id);
    const typesHtml = pokeObj.types.map(t => {
        const info = TYPE_CONFIG[t] || { es: t, color: '#64748B' };
        return `<span class="type-badge" style="background-color: ${info.color}">${info.es}</span>`;
    }).join(' ');

    return `
        <div class="col-6 col-sm-4 col-md-3 col-lg-2">
            <div class="poke-card">
                <a href="pokemon.html?id=${pokeObj.id}" class="poke-card-img-wrap text-decoration-none">
                    ${pokeObj.isCustom || override ? '<span class="badge bg-warning text-dark rounded-pill position-absolute top-0 start-0 m-2">Custom</span>' : ''}
                    <img src="${pokeObj.image}" alt="${displayName}" width="96" height="96" loading="lazy">
                </a>
                <div class="p-3 d-flex flex-column flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="text-muted fw-bold small mono-num">N. ${String(pokeObj.id).padStart(4, '0')}</span>
                        <button type="button" class="btn btn-sm border-0 p-0 js-card-fav" data-id="${pokeObj.id}" data-name="${displayName}">
                            <i class="bi ${isFav ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}"></i>
                        </button>
                    </div>
                    <h6 class="fw-bold mb-2 text-truncate">${displayName}</h6>
                    <div class="d-flex gap-1 flex-wrap mb-3">${typesHtml}</div>
                    <a href="pokemon.html?id=${pokeObj.id}" class="btn btn-rotom btn-sm mt-auto w-100 py-1">
                        Ver ficha
                    </a>
                </div>
            </div>
        </div>
    `;
}

function bindCardFavoriteButtons() {
    document.querySelectorAll('.js-card-fav').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            const added = Storage.toggleFavorite(id, name);
            btn.innerHTML = `<i class="bi ${added ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}"></i>`;
            renderDrawerLists();
        };
    });
}

async function getPokemonNameIndex() {
    const cached = sessionStorage.getItem('pokedock_name_index');
    if (cached) return JSON.parse(cached);

    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const data = await res.json();
    const index = data.results.map((item, idx) => ({
        id: idx + 1,
        name: item.name
    }));
    sessionStorage.setItem('pokedock_name_index', JSON.stringify(index));
    return index;
}

async function fetchPokemonSummary(nameOrId) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${String(nameOrId).toLowerCase()}`);
    if (!res.ok) throw new Error('No encontrado');
    const data = await res.json();
    return {
        id: data.id,
        name: data.name,
        types: data.types.map(t => t.type.name),
        image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
        isCustom: false
    };
}

async function loadCatalogPage(reset = false) {
    const grid = document.getElementById('pokemonCatalogGrid');
    const status = document.getElementById('catalogStatus');
    const loadMoreWrapper = document.getElementById('loadMoreWrapper');
    if (!grid) return;

    if (reset) {
        catalogOffset = 0;
        grid.innerHTML = '';
        const customs = Storage.getCustomList();
        customs.forEach(c => {
            grid.insertAdjacentHTML('beforeend', createPokemonCardHTML({ ...c, isCustom: true }));
        });
    }

    status.classList.remove('d-none');
    status.textContent = 'Cargando registros desde PokeAPI...';
    loadMoreWrapper.classList.remove('d-none');

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${CATALOG_LIMIT}&offset=${catalogOffset}`);
        const data = await res.json();
        const summaries = await Promise.all(data.results.map(p => fetchPokemonSummary(p.name)));

        summaries.forEach(poke => {
            grid.insertAdjacentHTML('beforeend', createPokemonCardHTML(poke));
        });

        catalogOffset += CATALOG_LIMIT;
        status.classList.add('d-none');
        bindCardFavoriteButtons();
    } catch (e) {
        status.textContent = 'Error al conectar con PokeAPI.';
    }
}

async function loadOnlyFavoritesInCatalog() {
    const grid = document.getElementById('pokemonCatalogGrid');
    const status = document.getElementById('catalogStatus');
    const loadMoreWrapper = document.getElementById('loadMoreWrapper');
    if (!grid) return;

    loadMoreWrapper.classList.add('d-none');
    grid.innerHTML = '';
    const favs = Storage.getFavorites();

    if (favs.length === 0) {
        status.classList.remove('d-none');
        status.textContent = 'Aun no tienes Pokemon guardados en tus favoritos.';
        return;
    }

    status.classList.remove('d-none');
    status.textContent = 'Cargando tus favoritos...';

    const customs = Storage.getCustomList();
    for (const f of favs) {
        const customMatch = customs.find(c => c.id == f.id);
        if (customMatch) {
            grid.insertAdjacentHTML('beforeend', createPokemonCardHTML({ ...customMatch, isCustom: true }));
        } else {
            try {
                const summary = await fetchPokemonSummary(f.id);
                grid.insertAdjacentHTML('beforeend', createPokemonCardHTML(summary));
            } catch (e) {}
        }
    }

    status.classList.add('d-none');
    bindCardFavoriteButtons();
}

async function searchInCatalog(query) {
    const grid = document.getElementById('pokemonCatalogGrid');
    const status = document.getElementById('catalogStatus');
    const loadMoreWrapper = document.getElementById('loadMoreWrapper');
    if (!grid) return;

    loadMoreWrapper.classList.add('d-none');
    status.classList.remove('d-none');
    status.textContent = 'Buscando especimen...';
    grid.innerHTML = '';

    const normalized = query.trim().toLowerCase();
    const customMatches = Storage.getCustomList().filter(
        p => String(p.id) === normalized || p.name.toLowerCase().includes(normalized)
    );

    customMatches.forEach(c => {
        grid.insertAdjacentHTML('beforeend', createPokemonCardHTML({ ...c, isCustom: true }));
    });

    try {
        const index = await getPokemonNameIndex();
        const matches = index.filter(
            item => String(item.id) === normalized || item.name.includes(normalized)
        ).slice(0, 18);

        if (matches.length === 0 && customMatches.length === 0) {
            status.textContent = `No se encontro ningun Pokemon con "${query}".`;
            return;
        }

        const summaries = await Promise.all(matches.map(m => fetchPokemonSummary(m.id)));
        summaries.forEach(poke => {
            grid.insertAdjacentHTML('beforeend', createPokemonCardHTML(poke));
        });

        status.classList.add('d-none');
        bindCardFavoriteButtons();
    } catch (e) {
        if (customMatches.length > 0) {
            status.classList.add('d-none');
            bindCardFavoriteButtons();
        } else {
            status.textContent = `No se encontro ningun Pokemon con "${query}".`;
        }
    }
}

async function filterCatalogByType(type) {
    if (type === 'all') {
        loadCatalogPage(true);
        return;
    }

    const grid = document.getElementById('pokemonCatalogGrid');
    const status = document.getElementById('catalogStatus');
    const loadMoreWrapper = document.getElementById('loadMoreWrapper');

    loadMoreWrapper.classList.add('d-none');
    status.classList.remove('d-none');
    status.textContent = 'Filtrando por tipo...';
    grid.innerHTML = '';

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
        const data = await res.json();
        const slice = data.pokemon.slice(0, 24);
        const summaries = await Promise.all(slice.map(entry => fetchPokemonSummary(entry.pokemon.name)));

        summaries.forEach(poke => {
            grid.insertAdjacentHTML('beforeend', createPokemonCardHTML(poke));
        });

        status.classList.add('d-none');
        bindCardFavoriteButtons();
    } catch (e) {
        status.textContent = 'No se pudo filtrar por ese tipo.';
    }
}

/* ==================== FICHA DETALLADA (POKEMON.HTML) ==================== */
async function loadPokemonDetail(query, isVariety = false) {
    try {
        const customPokemon = Storage.getCustomList().find(
            p => p.id == query || p.name.toLowerCase() === String(query).toLowerCase()
        );

        if (customPokemon) {
            renderCustomPokemonDetail(customPokemon);
            return;
        }

        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${String(query).toLowerCase()}`);
        if (!res.ok) throw new Error('Pokemon no encontrado');
        const poke = await res.json();

        const speciesRes = await fetch(poke.species.url);
        const species = await speciesRes.json();

        currentPokemonId = species.id;
        currentPokemonData = { poke, species };
        window.history.replaceState({}, '', `pokemon.html?id=${species.id}`);

        const override = Storage.getOverrides()[species.id];
        document.getElementById('customBadge').classList.toggle('d-none', !override);

        const displayName = override?.name || capitalize(species.name);
        document.getElementById('pokeName').textContent = displayName;
        document.getElementById('pokeNumber').textContent = `N. ${String(species.id).padStart(4, '0')}`;

        const artwork = poke.sprites.other['official-artwork'].front_default || poke.sprites.front_default;
        document.getElementById('pokeImage').src = artwork;

        const flavorEs = species.flavor_text_entries.find(e => e.language.name === 'es');
        const descText = override?.description || (flavorEs ? flavorEs.flavor_text.replace(/\f/g, ' ') : 'Sin descripcion disponible.');
        document.getElementById('pokeDescription').textContent = descText;

        const heightM = override?.height || (poke.height / 10).toFixed(1);
        const weightKg = override?.weight || (poke.weight / 10).toFixed(1);
        document.getElementById('pokeHeight').textContent = `${heightM} m`;
        document.getElementById('pokeWeight').textContent = `${weightKg} kg`;

        const genusEs = species.genera.find(g => g.language.name === 'es');
        document.getElementById('pokeCategory').textContent = genusEs ? genusEs.genus.replace('Pokemon ', '').replace('Pokémon ', '') : 'Desconocida';

        const abilitiesHtml = poke.abilities.map(a => capitalize(a.ability.name.replace('-', ' '))).join('<br>');
        document.getElementById('pokeAbilities').innerHTML = abilitiesHtml;

        const genderEl = document.getElementById('pokeGender');
        genderEl.innerHTML = species.gender_rate === -1
            ? 'Sin genero'
            : '<i class="bi bi-gender-male me-2"></i><i class="bi bi-gender-female"></i>';

        const types = poke.types.map(t => t.type.name);
        renderTypesAndWeaknesses(types);
        renderBaseStats(poke.stats);

        if (!isVariety) {
            const formSelect = document.getElementById('formSelector');
            formSelect.innerHTML = species.varieties.map(v => {
                const label = v.pokemon.name.replace('-', ' ').toUpperCase();
                return `<option value="${v.pokemon.name}">${label}</option>`;
            }).join('');
        }

        updatePrevNextButtons(species.id);
        renderEvolutionChain(species.evolution_chain ? species.evolution_chain.url : null);
        syncNotesAndFavorites(species.id, displayName, poke, species);
        renderPokemonComments(species.id);

        document.getElementById('editName').value = displayName;
        document.getElementById('editHeight').value = heightM;
        document.getElementById('editWeight').value = weightKg;
        document.getElementById('editDescription').value = descText;

    } catch (err) {
        alert('No se pudo encontrar ese Pokemon. Verifica el nombre o numero.');
    }
}

function renderCustomPokemonDetail(custom) {
    currentPokemonId = custom.id;
    window.history.replaceState({}, '', `pokemon.html?id=${custom.id}`);
    document.getElementById('customBadge').classList.remove('d-none');
    document.getElementById('pokeName').textContent = custom.name;
    document.getElementById('pokeNumber').textContent = `N. ${String(custom.id).padStart(4, '0')}`;
    document.getElementById('pokeImage').src = custom.image;
    document.getElementById('pokeDescription').textContent = custom.description;
    document.getElementById('pokeHeight').textContent = '1.5 m';
    document.getElementById('pokeWeight').textContent = '45.0 kg';
    document.getElementById('pokeCategory').textContent = 'Custom';
    document.getElementById('pokeAbilities').textContent = 'Motor Rotom';
    document.getElementById('pokeGender').textContent = 'Sin genero';
    document.getElementById('formSelector').innerHTML = `<option>${custom.name}</option>`;
    renderTypesAndWeaknesses(custom.types);
    renderBaseStats([
        { base_stat: 85 }, { base_stat: 105 }, { base_stat: 80 },
        { base_stat: 115 }, { base_stat: 80 }, { base_stat: 110 }
    ]);
    document.getElementById('prevLabel').textContent = 'N. 1025 Pecharunt';
    document.getElementById('nextLabel').textContent = 'Bulbasaur N. 0001';
    document.getElementById('btnPrev').onclick = () => loadPokemonDetail(1025);
    document.getElementById('btnNext').onclick = () => loadPokemonDetail(1);
    document.getElementById('evolutionContainer').innerHTML = '<p class="mb-0 text-light small">Especie unica registrada localmente.</p>';
    syncNotesAndFavorites(custom.id, custom.name, null, null);
    renderPokemonComments(custom.id);
}

function renderPokemonComments(pokemonId) {
    const container = document.getElementById('commentsListContainer');
    const countBadge = document.getElementById('commentsCountBadge');
    if (!container) return;

    const session = Storage.getSession();
    const comments = Storage.getCommentsForPokemon(pokemonId);
    const isModOrAdmin = session.role === 'moderador' || session.role === 'admin';

    if (countBadge) {
        countBadge.textContent = `${comments.length} ${comments.length === 1 ? 'comentario' : 'comentarios'}`;
    }

    if (comments.length === 0) {
        container.innerHTML = '<div class="text-center text-muted small py-3">Aun no hay comentarios para este Pokemon. ¡Se el primero en opinar!</div>';
        return;
    }

    container.innerHTML = comments.map(c => {
        const meta = ROLE_META[c.role] || ROLE_META.usuario;
        const canDelete = isModOrAdmin || c.author.toLowerCase() === session.username.toLowerCase();

        return `
            <div class="comment-item ${c.pinned ? 'pinned-comment' : ''}">
                <div class="d-flex justify-content-between align-items-start gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                            ${c.pinned ? '<span class="badge bg-warning text-dark rounded-pill"><i class="bi bi-pin-fill"></i> Destacado</span>' : ''}
                            <strong class="small text-dark">${c.author}</strong>
                            <span class="badge rounded-pill ${meta.badgeClass}" style="font-size: 0.68rem;">${meta.label}</span>
                            <span class="text-muted" style="font-size: 0.72rem;">${c.date}</span>
                        </div>
                        <p class="mb-0 small text-secondary">${c.text}</p>
                    </div>
                    <div class="d-flex gap-1">
                        ${isModOrAdmin ? `
                            <button type="button" class="btn btn-outline-warning text-dark btn-sm py-0 px-2 js-pin-comment" data-id="${c.id}" title="${c.pinned ? 'Quitar destacado' : 'Destacar comentario'}">
                                <i class="bi ${c.pinned ? 'bi-pin-fill' : 'bi-pin'}"></i>
                            </button>` : ''}
                        ${canDelete ? `
                            <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2 js-del-comment" data-id="${c.id}" title="Eliminar comentario">
                                <i class="bi bi-trash"></i>
                            </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.js-pin-comment').forEach(btn => {
        btn.addEventListener('click', () => {
            Storage.togglePinComment(pokemonId, Number(btn.dataset.id));
            renderPokemonComments(pokemonId);
        });
    });

    container.querySelectorAll('.js-del-comment').forEach(btn => {
        btn.addEventListener('click', () => {
            Storage.deleteComment(pokemonId, Number(btn.dataset.id));
            renderPokemonComments(pokemonId);
        });
    });
}

function renderTypesAndWeaknesses(types) {
    document.getElementById('pokeTypes').innerHTML = types.map(t => {
        const info = TYPE_CONFIG[t] || { es: t, color: '#64748B' };
        return `<span class="type-badge" style="background-color: ${info.color}">${info.es}</span>`;
    }).join('');

    const weakSet = new Set();
    types.forEach(t => (TYPE_CONFIG[t]?.weak || []).forEach(w => weakSet.add(w)));

    document.getElementById('pokeWeaknesses').innerHTML = Array.from(weakSet).map(w => {
        const info = TYPE_CONFIG[w] || { es: w, color: '#64748B' };
        return `<span class="type-badge" style="background-color: ${info.color}">${info.es}</span>`;
    }).join('');
}

function renderBaseStats(stats) {
    const labels = ['PS', 'Ataque', 'Defensa', 'Ataque Esp.', 'Defensa Esp.', 'Velocidad'];
    const totalSegments = 14;

    document.getElementById('baseStatsContainer').innerHTML = stats.map((s, idx) => {
        const activeCount = Math.min(totalSegments, Math.ceil((s.base_stat / 180) * totalSegments));
        let bars = '';
        for (let i = totalSegments; i >= 1; i--) {
            bars += `<div class="stat-segment ${i <= activeCount ? 'active' : ''}"></div>`;
        }
        return `
            <div class="col-2">
                <div class="stat-col">
                    ${bars}
                    <div class="stat-value-num">${s.base_stat}</div>
                    <div class="stat-label">${labels[idx]}</div>
                </div>
            </div>
        `;
    }).join('');
}

async function updatePrevNextButtons(id) {
    const prevId = id > 1 ? id - 1 : 1025;
    const nextId = id < 1025 ? id + 1 : 1;

    try {
        const [pRes, nRes] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon-species/${prevId}`),
            fetch(`https://pokeapi.co/api/v2/pokemon-species/${nextId}`)
        ]);
        const [prevData, nextData] = await Promise.all([pRes.json(), nRes.json()]);

        document.getElementById('prevLabel').textContent = `N. ${String(prevId).padStart(4, '0')} ${capitalize(prevData.name)}`;
        document.getElementById('nextLabel').textContent = `${capitalize(nextData.name)} N. ${String(nextId).padStart(4, '0')}`;
        document.getElementById('btnPrev').onclick = () => loadPokemonDetail(prevId);
        document.getElementById('btnNext').onclick = () => loadPokemonDetail(nextId);
    } catch (e) {}
}

async function renderEvolutionChain(url) {
    const container = document.getElementById('evolutionContainer');
    if (!url) {
        container.innerHTML = '<span class="small text-light">Cadena evolutiva no disponible.</span>';
        return;
    }

    container.innerHTML = '<span class="small text-light">Cargando evoluciones...</span>';
    try {
        const res = await fetch(url);
        const data = await res.json();
        const stages = [];

        function traverse(node, depth) {
            if (!stages[depth]) stages[depth] = [];
            const id = node.species.url.split('/').filter(Boolean).pop();
            stages[depth].push({ name: node.species.name, id });
            node.evolves_to.forEach(child => traverse(child, depth + 1));
        }

        traverse(data.chain, 0);

        container.innerHTML = stages.map((group, index) => {
            const groupHtml = group.map(evo => `
                <div class="text-center" onclick="loadPokemonDetail(${evo.id})">
                    <div class="evo-circle">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png" alt="${evo.name}" width="70" height="70">
                    </div>
                    <div class="fw-bold small">${capitalize(evo.name)} <span class="text-info mono-num">N. ${String(evo.id).padStart(4, '0')}</span></div>
                </div>
            `).join('');

            return `
                ${index > 0 ? '<i class="bi bi-chevron-right fs-2 text-info"></i>' : ''}
                <div class="d-flex flex-wrap justify-content-center gap-3">${groupHtml}</div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<span class="small text-light">Cadena evolutiva no disponible.</span>';
    }
}

function syncNotesAndFavorites(id, name, poke, species) {
    const isFav = Storage.getFavorites().some(f => f.id == id);
    const btnFav = document.getElementById('btnFavorite');
    btnFav.innerHTML = isFav ? '<i class="bi bi-star-fill text-warning me-1"></i>En Favoritos' : '<i class="bi bi-star me-1"></i>Favorito';
    btnFav.onclick = () => {
        Storage.toggleFavorite(id, name);
        syncNotesAndFavorites(id, name, poke, species);
        renderDrawerLists();
    };

    const note = Storage.getNotes()[id];
    document.getElementById('viewNoteHabitat').textContent = note?.habitat || 'No documentado';
    document.getElementById('viewNoteObs').textContent = note?.obs || 'Aun no hay notas de campo para este especimen.';
    document.getElementById('noteAuthorTag').textContent = note ? `Por: ${note.author}` : 'Sin registros';

    document.getElementById('inputNoteHabitat').value = note?.habitat || '';
    document.getElementById('inputNoteObs').value = note?.obs || '';

    if (poke && species) {
        document.getElementById('researchExtraMetrics').textContent =
            `Metricas Cientificas API: Exp. Base ${poke.base_experience} | Tasa Captura ${species.capture_rate} | Felicidad Base ${species.base_happiness}`;
    } else {
        document.getElementById('researchExtraMetrics').textContent = '';
    }
}

/* ==================== INICIALIZACION GLOBAL ==================== */
document.addEventListener('DOMContentLoaded', () => {
    applyRolePermissions();

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            Storage.clearSession();
            window.location.href = 'login.html';
        });
    }

    // Eventos Panel Admin
    const adminControlModal = document.getElementById('adminControlModal');
    if (adminControlModal) {
        adminControlModal.addEventListener('show.bs.modal', renderAdminControlPanel);
    }

    const adminCreateUserForm = document.getElementById('adminCreateUserForm');
    if (adminCreateUserForm) {
        adminCreateUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('adminNewUsername').value.trim();
            const password = document.getElementById('adminNewPassword').value.trim();
            const role = document.getElementById('adminNewRole').value;
            if (!username || !password) return;

            const users = Storage.getUsers();
            if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
                showAdminAlert('Ese usuario ya existe.', 'danger');
                return;
            }
            users.push({ username, password, role });
            Storage.saveUsers(users);
            adminCreateUserForm.reset();
            showAdminAlert(`Usuario "${username}" creado con rol ${ROLE_META[role].label}.`);
            renderAdminControlPanel();
        });
    }

    const btnAdminClearComments = document.getElementById('btnAdminClearComments');
    if (btnAdminClearComments) {
        btnAdminClearComments.addEventListener('click', () => {
            localStorage.removeItem('pokedock_comments');
            showAdminAlert('Todos los comentarios fueron eliminados.', 'warning');
            renderAdminControlPanel();
            if (document.getElementById('commentsListContainer')) renderPokemonComments(currentPokemonId);
        });
    }

    const btnAdminClearOverrides = document.getElementById('btnAdminClearOverrides');
    if (btnAdminClearOverrides) {
        btnAdminClearOverrides.addEventListener('click', () => {
            localStorage.removeItem('pokedock_overrides');
            showAdminAlert('Todas las fichas editadas volvieron a su estado original.', 'warning');
            renderAdminControlPanel();
            if (document.getElementById('pokemonCatalogGrid')) loadCatalogPage(true);
            if (document.getElementById('pokedexDetailSheet')) loadPokemonDetail(currentPokemonId);
        });
    }

    const btnAdminClearCustomPoke = document.getElementById('btnAdminClearCustomPoke');
    if (btnAdminClearCustomPoke) {
        btnAdminClearCustomPoke.addEventListener('click', () => {
            localStorage.removeItem('pokedock_custom');
            showAdminAlert('Pokemon personalizados eliminados.', 'warning');
            renderAdminControlPanel();
            renderDrawerLists();
            if (document.getElementById('pokemonCatalogGrid')) loadCatalogPage(true);
        });
    }

    // Eventos Panel Moderador
    const modControlModal = document.getElementById('modControlModal');
    if (modControlModal) {
        modControlModal.addEventListener('show.bs.modal', renderGlobalModerationPanel);
    }

    // Crear Pokemon (Admin)
    const createPokemonForm = document.getElementById('createPokemonForm');
    if (createPokemonForm) {
        createPokemonForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const types = [document.getElementById('newType1').value];
            const t2 = document.getElementById('newType2').value;
            if (t2) types.push(t2);

            const newPoke = {
                id: Number(document.getElementById('newId').value),
                name: document.getElementById('newName').value.trim(),
                types,
                image: document.getElementById('newImage').value.trim(),
                description: document.getElementById('newDesc').value.trim()
            };
            Storage.addCustomPokemon(newPoke);
            bootstrap.Modal.getInstance(document.getElementById('createPokemonModal')).hide();
            createPokemonForm.reset();
            document.getElementById('newId').value = 1026 + Storage.getCustomList().length;
            renderDrawerLists();
            loadCatalogPage(true);
        });
    }

    // Logica especifica de index.html
    if (document.getElementById('pokemonCatalogGrid')) {
        loadCatalogPage(true);

        const navQuickForm = document.getElementById('navbarQuickSearchForm');
        if (navQuickForm) {
            navQuickForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const q = document.getElementById('navbarQuickSearchInput').value.trim();
                if (q) searchInCatalog(q);
            });
        }

        document.getElementById('btnShowAllCatalog').addEventListener('click', () => {
            document.getElementById('catalogSearchInput').value = '';
            document.getElementById('typeFilterSelect').value = 'all';
            loadCatalogPage(true);
        });

        document.getElementById('btnShowOnlyFavs').addEventListener('click', () => {
            loadOnlyFavoritesInCatalog();
        });

        document.getElementById('catalogSearchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const q = document.getElementById('catalogSearchInput').value.trim();
            if (q) {
                searchInCatalog(q);
            } else {
                loadCatalogPage(true);
            }
        });

        document.getElementById('typeFilterSelect').addEventListener('change', (e) => {
            document.getElementById('catalogSearchInput').value = '';
            filterCatalogByType(e.target.value);
        });

        document.getElementById('btnResetCatalog').addEventListener('click', () => {
            document.getElementById('catalogSearchInput').value = '';
            document.getElementById('typeFilterSelect').value = 'all';
            loadCatalogPage(true);
        });

        document.getElementById('btnLoadMore').addEventListener('click', () => {
            loadCatalogPage(false);
        });
    }

    // Logica especifica de pokemon.html
    if (document.getElementById('pokedexDetailSheet')) {
        const params = new URLSearchParams(window.location.search);
        const initialQuery = params.get('id') || '1';
        loadPokemonDetail(initialQuery);

        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const val = document.getElementById('searchInput').value.trim();
            if (val) loadPokemonDetail(val);
        });

        document.getElementById('formSelector').addEventListener('change', (e) => {
            loadPokemonDetail(e.target.value, true);
        });

        document.getElementById('researchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const session = Storage.getSession();
            Storage.saveNote(currentPokemonId, {
                habitat: document.getElementById('inputNoteHabitat').value,
                obs: document.getElementById('inputNoteObs').value,
                author: `${session.username} (${ROLE_META[session.role].label})`
            });
            syncNotesAndFavorites(
                currentPokemonId,
                document.getElementById('pokeName').textContent,
                currentPokemonData?.poke,
                currentPokemonData?.species
            );
            alert('Bitacora de investigacion guardada.');
        });

        const btnModClearNote = document.getElementById('btnModClearNote');
        if (btnModClearNote) {
            btnModClearNote.addEventListener('click', () => {
                Storage.deleteNote(currentPokemonId);
                syncNotesAndFavorites(
                    currentPokemonId,
                    document.getElementById('pokeName').textContent,
                    currentPokemonData?.poke,
                    currentPokemonData?.species
                );
                alert('Bitacora depurada por moderacion.');
            });
        }

        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('commentInput');
                const text = input.value.trim();
                if (!text) return;

                const pokeTitle = document.getElementById('pokeName').textContent;
                Storage.addComment(currentPokemonId, pokeTitle, text);
                input.value = '';
                renderPokemonComments(currentPokemonId);
            });
        }

        document.getElementById('editPokemonForm').addEventListener('submit', (e) => {
            e.preventDefault();
            Storage.saveOverride(currentPokemonId, {
                name: document.getElementById('editName').value,
                height: document.getElementById('editHeight').value,
                weight: document.getElementById('editWeight').value,
                description: document.getElementById('editDescription').value
            });
            bootstrap.Modal.getInstance(document.getElementById('editPokemonModal')).hide();
            loadPokemonDetail(currentPokemonId);
        });

        document.getElementById('btnResetOverride').addEventListener('click', () => {
            Storage.deleteOverride(currentPokemonId);
            loadPokemonDetail(currentPokemonId);
        });
    }
});