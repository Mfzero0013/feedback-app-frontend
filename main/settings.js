document.addEventListener('DOMContentLoaded', () => {
    loadCollaborators();
    loadTeams();

    const tableBody = document.getElementById('collaborators-table-body');
    tableBody.addEventListener('click', handleTableClick);

    const confirmationModal = document.getElementById('confirmation-modal');
    confirmationModal.addEventListener('click', (e) => {
        if (e.target.id === 'confirmation-modal-confirm-button') {
            const userId = e.target.dataset.id;
            deleteCollaborator(userId);
        } else if (e.target.id === 'confirmation-modal-cancel-button') {
            closeConfirmationModal();
        }
    });
});

let allUsers = [];

async function loadCollaborators() {
    try {
        allUsers = await api.get('/users');
        renderCollaborators(allUsers);
    } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        showNotification('Erro ao carregar colaboradores.', 'error');
    }
}

function renderCollaborators(users) {
    const tableBody = document.getElementById('collaborators-table-body');
    tableBody.innerHTML = '';

    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nenhum colaborador encontrado.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-4 px-6">${user.nome}</td>
            <td class="py-4 px-6">${user.jobTitle || 'N/A'}</td>
            <td class="py-4 px-6">${user.equipe ? user.equipe.nome : 'N/A'}</td>
            <td class="py-4 px-6">${user.email}</td>
            <td class="py-4 px-6 space-x-2">
                <button class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 edit-btn" data-id="${user.id}">Editar</button>
                <button class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 remove-btn" data-id="${user.id}">Remover</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadTeams() {
    try {
        const teams = await api.get('/teams');
        const select = document.getElementById('collaboratorTeam');
        select.innerHTML = '<option value="">Selecione um setor</option>';
        if (Array.isArray(teams)) {
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar equipes:', error);
    }
}

function handleTableClick(event) {
    const target = event.target;
    const userId = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const user = allUsers.find(u => u.id == userId);
        if (user) openCollaboratorModal(user);
    } else if (target.classList.contains('remove-btn')) {
        openConfirmationModal(userId);
    }
}

function adicionarColaborador() {
    openCollaboratorModal();
}

function openCollaboratorModal(user = null) {
    const modal = document.getElementById('collaborator-modal');
    const title = document.getElementById('collaborator-modal-title');
    const form = document.getElementById('collaborator-form');
    const passwordInput = document.getElementById('collaboratorPassword');

    form.reset();
    document.getElementById('collaboratorId').value = '';

    if (user) {
        title.textContent = 'Editar Colaborador';
        document.getElementById('collaboratorId').value = user.id;
        document.getElementById('collaboratorName').value = user.nome;
        document.getElementById('collaboratorEmail').value = user.email;
        document.getElementById('collaboratorJobTitle').value = user.jobTitle || '';
        document.getElementById('collaboratorRole').value = user.cargo === 'ADMINISTRADOR' ? 'admin' : 'user';
        document.getElementById('collaboratorTeam').value = user.equipeId;
        passwordInput.placeholder = 'Deixe em branco para não alterar';
        passwordInput.removeAttribute('required');
    } else {
        title.textContent = 'Adicionar Novo Colaborador';
        passwordInput.placeholder = '';
        passwordInput.setAttribute('required', 'true');
    }

    modal.classList.remove('hidden');
}

function closeCollaboratorModal() {
    const modal = document.getElementById('collaborator-modal');
    modal.classList.add('hidden');
}

async function saveCollaborator(event) {
    event.preventDefault();

    const id = document.getElementById('collaboratorId').value;
    const teamSelect = document.getElementById('collaboratorTeam');

    const payload = {
        nome: document.getElementById('collaboratorName').value,
        email: document.getElementById('collaboratorEmail').value,
        jobTitle: document.getElementById('collaboratorJobTitle').value,
        accountType: document.getElementById('collaboratorRole').value,
        equipeId: parseInt(teamSelect.value, 10),
    };

    const password = document.getElementById('collaboratorPassword').value;
    if (password) {
        payload.senha = password;
    }

    const isEditing = !!id;

    try {
        if (isEditing) {
            await api.put(`/users/${id}`, payload);
        } else {
            await api.post('/auth/register', payload);
        }
        showNotification(`Colaborador ${isEditing ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
        closeCollaboratorModal();
        loadCollaborators();
    } catch (error) {
        console.error('Erro ao salvar colaborador:', error);
        showNotification(error.message || 'Erro ao salvar colaborador.', 'error');
    }
}

function openConfirmationModal(userId) {
    const modal = document.getElementById('confirmation-modal');
    const confirmBtn = document.getElementById('confirmation-modal-confirm-button');
    confirmBtn.dataset.id = userId; 
    modal.classList.remove('hidden');
}

function closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    modal.classList.add('hidden');
}

async function deleteCollaborator(userId) {
    try {
        await api.delete(`/users/${userId}`);
        showNotification('Colaborador removido com sucesso!', 'success');
        closeConfirmationModal();
        loadCollaborators();
    } catch (error) {
        console.error('Erro ao remover colaborador:', error);
        showNotification('Erro ao remover colaborador.', 'error');
    }
}
