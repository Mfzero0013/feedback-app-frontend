document.addEventListener('DOMContentLoaded', () => {
    loadTeams();
    loadUsers();
});

// --- Funções de Carregamento e Renderização --- 

async function loadTeams() {
    try {
        const response = await api.getAllTeams();
        renderTeamCards(response); 
        populateTeamFilters(response);
    } catch (error) {
        console.error('Erro ao carregar equipes:', error);
    }
}

async function loadUsers() {
    try {
        const users = await api.getAllUsers();
        renderUserCards(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

function renderTeamCards(teams) {
    const container = document.getElementById('company-cards-container');
    if (!container) return;
    container.innerHTML = '';
    teams.forEach(team => {
        const managerName = team.gestor ? team.gestor.nome : 'N/A';
        const card = `
            <div class="bg-gray-50 p-4 rounded-lg shadow">
                <h4 class="font-bold text-lg text-gray-800">${team.nome}</h4>
                <p class="text-sm text-gray-600">Gestor: ${managerName}</p>
                <p class="text-sm text-gray-500">${team.usuarios.length} membros</p>
                <div class="mt-4 flex justify-end space-x-2">
                    <button onclick="openEditTeamModal(${team.id})" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">Editar</button>
                    <button onclick="deleteTeam(${team.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm">Remover</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

function renderUserCards(users) {
    const container = document.getElementById('user-cards-container');
    if (!container) return;
    container.innerHTML = '';
    users.forEach(user => {
        const card = `
            <div class="bg-gray-50 p-4 rounded-lg shadow">
                <h4 class="font-bold text-lg text-gray-800">${user.nome}</h4>
                <p class="text-sm text-gray-600">${user.perfil?.jobTitle || 'Cargo não definido'}</p>
                <p class="text-sm text-gray-500">${user.equipe?.nome || 'Sem equipe'}</p>
                <div class="mt-4 flex justify-end space-x-2">
                    <button onclick="openEditUserModal(${user.id})" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">Editar</button>
                    <button onclick="deleteUser(${user.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm">Remover</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

function populateTeamFilters(teams) {
    const teamFilter = document.getElementById('companyFilter'); // Mantido por consistência com HTML
    const userTeamSelect = document.getElementById('userCompany'); // Mantido por consistência com HTML
    if (!teamFilter || !userTeamSelect) return;

    teamFilter.innerHTML = '<option value="all">Todas as Equipes</option>';
    userTeamSelect.innerHTML = '<option value="">Selecione uma equipe</option>';

    teams.forEach(team => {
        const option = `<option value="${team.id}">${team.nome}</option>`;
        teamFilter.innerHTML += option;
        userTeamSelect.innerHTML += option;
    });
}

// --- Gestão de Equipes (Modal) ---

async function populateManagerSelect(selectedManagerId = null) {
    const managerSelect = document.getElementById('teamManager');
    managerSelect.innerHTML = '<option value="">Selecione um gestor</option>';
    try {
        const users = await api.getAllUsers();
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.nome;
            if (user.id === selectedManagerId) {
                option.selected = true;
            }
            managerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao popular gestores:', error);
    }
}

function openNewTeamModal() {
    document.getElementById('team-modal-title').innerText = 'Adicionar Nova Equipe';
    document.getElementById('team-form').reset();
    document.getElementById('teamId').value = '';
    populateManagerSelect();
    document.getElementById('team-modal').classList.remove('hidden');
}

async function openEditTeamModal(id) {
    try {
        const team = await api.getTeamById(id);
        document.getElementById('team-modal-title').innerText = 'Editar Equipe';
        document.getElementById('teamId').value = team.id;
        document.getElementById('teamName').value = team.nome;
        await populateManagerSelect(team.gestorId);
        document.getElementById('team-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao buscar dados da equipe:', error);
    }
}

function closeTeamModal() {
    document.getElementById('team-modal').classList.add('hidden');
}

async function saveTeam(event) {
    event.preventDefault();
    const teamId = document.getElementById('teamId').value;
    const teamData = {
        nome: document.getElementById('teamName').value,
        gestorId: document.getElementById('teamManager').value || null,
    };

    try {
        if (teamId) {
            await api.updateTeam(teamId, teamData);
        } else {
            await api.createTeam(teamData);
        }
        closeTeamModal();
        loadTeams();
    } catch (error) {
        console.error('Erro ao salvar equipe:', error);
        alert('Falha ao salvar a equipe.');
    }
}

function deleteTeam(id) {
    showConfirmationModal('Excluir Equipe', 'Tem certeza que deseja excluir esta equipe?', async () => {
        try {
            await api.deleteTeam(id);
            loadTeams();
        } catch (error) {
            console.error('Erro ao remover equipe:', error);
        }
    });
}

// --- Gestão de Usuários (Modal) ---

function openNewUserModal() {
    document.getElementById('user-modal-title').innerText = 'Adicionar Novo Usuário';
    document.getElementById('user-form').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('user-modal').classList.remove('hidden');
}

async function openEditUserModal(id) {
    try {
        const user = await api.getUserById(id);
        document.getElementById('user-modal-title').innerText = 'Editar Usuário';
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.nome;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userJobTitle').value = user.perfil?.jobTitle;
        document.getElementById('userCompany').value = user.equipeId;
        document.getElementById('userRole').value = user.perfil?.cargo === 'ADMINISTRADOR' ? 'admin' : 'user';
        document.getElementById('userPassword').value = '';
        document.getElementById('userPassword').required = false;
        document.getElementById('user-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

async function saveUser(event) {
    event.preventDefault();
    const userId = document.getElementById('userId').value;
    const equipeId = document.getElementById('userCompany').value;

    const userData = {
        nome: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        jobTitle: document.getElementById('userJobTitle').value,
        cargo: document.getElementById('userRole').value === 'admin' ? 'ADMINISTRADOR' : 'COLABORADOR',
        equipeId: equipeId || null,
        status: 'ATIVO' // Definindo status padrão no frontend
    };

    const password = document.getElementById('userPassword').value;
    if (password) {
        userData.senha = password;
    }

    try {
        if (userId) {
            await api.updateUser(userId, userData);
        } else {
            // Corrigido para usar a rota de admin para criar usuário
            await api.createUser(userData);
        }
        closeUserModal();
        loadUsers();
        loadTeams(); // Recarrega equipes para atualizar contagem de membros
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        alert(`Falha ao salvar o usuário: ${error.message}`);
    }
}

function deleteUser(id) {
    showConfirmationModal('Excluir Usuário', 'Tem certeza que deseja excluir este usuário?', async () => {
        try {
            await api.deleteUser(id);
            loadUsers();
            loadTeams(); // Recarrega equipes para atualizar contagem de membros
        } catch (error) {
            console.error('Erro ao remover usuário:', error);
        }
    });
}

// --- Modal de Confirmação Genérico ---
function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    document.getElementById('confirmation-modal-title').innerText = title;
    document.getElementById('confirmation-modal-message').innerText = message;
    modal.classList.remove('hidden');

    const confirmBtn = document.getElementById('confirmation-modal-confirm-button');
    const cancelBtn = document.getElementById('confirmation-modal-cancel-button');

    // Remove listeners antigos para evitar chamadas múltiplas
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        modal.classList.add('hidden');
    });

    newCancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}
