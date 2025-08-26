document.addEventListener('DOMContentLoaded', () => {
    loadAllUsers();

    const addUserButton = document.getElementById('add-user-btn');
    if (addUserButton) {
        addUserButton.addEventListener('click', openUserModal);
    }
});

async function loadAllUsers() {
    try {
        // A rota getUsers() já busca todos os usuários (colaboradores e administradores)
        const users = await api.getUsers(); 
        renderUsersTable(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        const tableBody = document.getElementById('users-table-body');
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Falha ao carregar usuários.</td></tr>';
    }
}

function renderUsersTable(users) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nenhum usuário encontrado.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = `
            <tr>
                <td class="py-3 px-4">${user.nome}</td>
                <td class="py-3 px-4">${user.cargo || 'N/A'}</td>
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

function openUserModal() {
    // Esta função deve abrir o modal de usuário, que parece estar definido em users.html
    // mas a lógica de abertura/fechamento pode estar em outro arquivo ou precisar ser criada.
    // Por enquanto, vamos assumir que o modal tem o ID 'collaborator-modal' como no HTML.
    const modal = document.getElementById('collaborator-modal');
    if(modal) {
        document.getElementById('user-modal-title').innerText = 'Adicionar Novo Usuário';
        // Adicionar aqui a lógica para limpar o formulário se necessário
        modal.classList.remove('hidden');
    }
}

function closeCollaboratorModal() {
    const modal = document.getElementById('collaborator-modal');
    if(modal) modal.classList.add('hidden');
}

function deleteUser(id) {
    console.log(`Deletar usuário com ID: ${id}`);
    // A lógica de exclusão precisa ser implementada, provavelmente chamando api.deleteUser(id)
}

function openEditUserModal(id) {
    console.log(`Editar usuário com ID: ${id}`);
    // A lógica de edição precisa ser implementada
}

async function saveCollaborator(event) {
    event.preventDefault();
    const userId = document.getElementById('collaboratorId').value;
    const userData = {
        nome: document.getElementById('collaboratorName').value,
        email: document.getElementById('collaboratorEmail').value,
        jobTitle: document.getElementById('collaboratorJobTitle').value,
        // A senha só é enviada se for preenchida
    };

    const password = document.getElementById('collaboratorPassword').value;
    if (password) {
        userData.senha = password;
    }

    try {
        if (userId) {
            // Atualizar usuário existente
            await api.updateUser(userId, userData);
        } else {
            // Criar novo usuário
            await api.createUser(userData);
        }
        closeCollaboratorModal();
        loadAllUsers(); // Recarrega a lista de usuários
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        // Adicionar feedback de erro para o usuário aqui, se desejar
    }
}
