document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    const addCollaboratorButton = document.getElementById('add-collaborator-btn');
    if (addCollaboratorButton) {
        addCollaboratorButton.addEventListener('click', () => openCollaboratorModal());
    }
});

async function loadUsers() {
    try {
        const response = await api.getUsers();
        renderUsersTable(response.data);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

function renderUsersTable(users) {
    const tableBody = document.getElementById('collaborators-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    users.forEach(user => {
        const row = `
            <tr>
                <td class="py-3 px-4">${user.nome}</td>
                <td class="py-3 px-4">${user.jobTitle || 'N/A'}</td>
                <td class="py-3 px-4">${user.equipe?.nome || 'Sem equipe'}</td>
                <td class="py-3 px-4">${user.email}</td>
                <td class="py-3 px-4">
                    <button onclick="openEditUserModal(${user.id})" class="text-indigo-600 hover:text-indigo-900">Editar</button>
                    <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900 ml-4">Excluir</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function openNewUserModal() {
    document.getElementById('collaborator-modal-title').innerText = 'Adicionar Novo Colaborador';
    document.getElementById('collaborator-form').reset();
    document.getElementById('collaboratorId').value = '';
    document.getElementById('collaborator-modal').classList.remove('hidden');
}

function closeCollaboratorModal() {
    document.getElementById('collaborator-modal').classList.add('hidden');
}

function deleteUser(id) {
    // Lógica para deletar usuário
    console.log(`Deletar usuário com ID: ${id}`);
}

// Adicione aqui a lógica para salvar e editar usuários, similar ao admin.js
