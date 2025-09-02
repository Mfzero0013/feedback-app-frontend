document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM para CRUD de Equipes
    const addTeamBtn = document.getElementById('add-team-btn');
    const teamModal = document.getElementById('team-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveTeamBtn = document.getElementById('save-team-btn');
    const teamForm = document.getElementById('team-form');
    const teamsListEl = document.getElementById('teams-list');
    const gestorSelect = document.getElementById('gestor');

    // Elementos do DOM para Gerenciamento de Membros
    const membersModal = document.getElementById('members-modal');
    const closeMembersModalBtn = document.getElementById('close-members-modal-btn');
    const membersModalTitle = document.getElementById('members-modal-title');
    const addMemberForm = document.getElementById('add-member-form');
    const userSelect = document.getElementById('user-select');
    const currentMembersList = document.getElementById('current-members-list');
    const memberTeamIdInput = document.getElementById('member-team-id');

    // --- Funções de Modal ---
    const openTeamModal = () => teamModal.classList.remove('hidden');
    const closeTeamModal = () => teamModal.classList.add('hidden');
    const openMembersModal = () => membersModal.classList.remove('hidden');
    const closeMembersModal = () => membersModal.classList.add('hidden');

    // --- CRUD de Equipes ---
    /**
     * Carrega as equipes do servidor e renderiza na tabela
     */
    async function loadTeams() {
        showLoader();
        try {
            const response = await api.teams.getAllTeams();
            const teams = response?.data || [];
            renderTeams(teams);
        } catch (error) {
            console.error('Erro ao carregar equipes:', error);
            showNotification(
                error.message || 'Falha ao carregar a lista de equipes.',
                'error'
            );
            teamsListEl.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-red-700">
                                Não foi possível carregar as equipes. Tente novamente mais tarde.
                            </p>
                        </div>
                    </div>
                </div>`;
        } finally {
            hideLoader();
        }
    }

    function renderTeams(teams) {
        teamsListEl.innerHTML = '';
        if (!teams || teams.length === 0) {
            teamsListEl.innerHTML = '<p class="text-gray-500">Nenhuma equipe encontrada.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        table.innerHTML = `
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gestor</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membros</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200"></tbody>
        `;
        const tbody = table.querySelector('tbody');
        teams.forEach(team => {
            const tr = document.createElement('tr');
            const memberCount = team.members_count || 0;
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${team.nome}</div>
                    <div class="text-sm text-gray-500">${team.descricao || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${team.gestor ? team.gestor.nome : 'Não definido'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${memberCount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button data-id="${team.id}" class="members-btn text-green-600 hover:text-green-900">Membros</button>
                    <button data-id="${team.id}" class="edit-btn text-indigo-600 hover:text-indigo-900 ml-4">Editar</button>
                    <button data-id="${team.id}" class="delete-btn text-red-600 hover:text-red-900 ml-4">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        teamsListEl.appendChild(table);
    }

        const teamNameInput = document.getElementById('nome');
    const teamNameError = document.getElementById('nome-error');

    const validateTeamName = () => {
        const teamName = teamNameInput.value.trim();
        if (teamName === '') {
            teamNameError.textContent = 'O nome da equipe é obrigatório.';
            return false;
        }
        teamNameError.textContent = '';
        return true;
    };

    teamNameInput.addEventListener('blur', validateTeamName);

    async function handleSaveTeam() {
        if (!validateTeamName()) {
            return;
        }

        const id = document.getElementById('team-id').value;
        const teamData = {
            nome: teamNameInput.value,
            descricao: document.getElementById('descricao').value,
            // A lógica do gestor precisa ser implementada no backend se necessário.
            // gestorId: document.getElementById('gestor').value || null
        };

        try {
            if (id) {
                await api.updateTeam(id, teamData);
                showNotification('Equipe atualizada com sucesso!', 'success');
            } else {
                await api.createTeam(teamData);
                showNotification('Equipe criada com sucesso!', 'success');
            }
            closeTeamModal();
            loadTeams();
        } catch (error) {
            console.error('Erro ao salvar equipe:', error);
            showNotification(error.message || 'Falha ao salvar equipe.', 'error');
        }
    }

        /**
     * Abre o modal de edição de equipe
     * @param {string} id - ID da equipe a ser editada
     */
    async function handleEditClick(id) {
        showLoader();
        try {
            // Busca os dados atualizados da equipe
            const response = await api.teams.getTeamById(id);
            const team = response?.data;
            
            if (!team) {
                throw new Error('Equipe não encontrada');
            }
            
            // Preenche o formulário
            teamForm.reset();
            document.getElementById('nome-error').textContent = '';
            document.getElementById('team-id').value = team.id;
            document.getElementById('modal-title').textContent = 'Editar Equipe';
            document.getElementById('nome').value = team.nome || '';
            document.getElementById('descricao').value = team.descricao || '';
            
            // Carrega e seleciona o gestor se existir
            await loadPossibleManagers();
            if (team.gestorId) {
                document.getElementById('gestor').value = team.gestorId;
            }
            
            openTeamModal();
        } catch (error) {
            console.error('Erro ao cargar dados da equipe:', error);
            showNotification(
                error.message || 'Falha ao carregar os dados da equipe.',
                'error'
            );
        } finally {
            hideLoader();
        }
    }

    /**
     * Exclui uma equipe após confirmação do usuário
     * @param {string} id - ID da equipe a ser excluída
     */
    async function handleDeleteClick(id) {
        try {
            // Primeiro, busca os dados da equipe para mostrar o nome na confirmação
            const response = await api.teams.getTeamById(id);
            const team = response?.data;
            
            if (!team) {
                throw new Error('Equipe não encontrada');
            }
            
            const onConfirm = async () => {
                showLoader();
                try {
                    await api.teams.deleteTeam(id);
                    showNotification('Equipe excluída com sucesso!', 'success');
                    loadTeams();
                } catch (error) {
                    console.error('Erro ao excluir equipe:', error);
                    showNotification(
                        error.message || 'Falha ao excluir a equipe. Tente novamente mais tarde.',
                        'error'
                    );
                } finally {
                    hideLoader();
                }
            };
            
            showConfirmationModal(
                'Confirmar Exclusão',
                `Tem certeza que deseja excluir a equipe "${escapeHtml(team.nome || '')}"? Esta ação não pode ser desfeita.`,
                onConfirm,
                'Excluir',
                'Cancelar',
                'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                'bg-white hover:bg-gray-50 focus:ring-gray-50 border border-gray-300 text-gray-700'
            );
        } catch (error) {
            console.error('Erro ao buscar detalhes da equipe:', error);
            showNotification('Não foi possível carregar os membros da equipe.', 'error');
        }
    }

    /**
     * Carrega todos os usuários uma única vez e armazena em cache
     */
    async function loadAllUsersOnce() {
        if (localUsers.length === 0) {
            showLoader();
            try {
                const response = await api.users.getUsers();
                localUsers = response?.data || [];
            } catch (error) {
                console.error('Erro ao carregar usuários:', error);
                showNotification(
                    'Falha ao carregar a lista de usuários. Tente novamente mais tarde.',
                    'error'
                );
                localUsers = [];
            } finally {
                hideLoader();
            }
        }
    }

    function renderCurrentMembers(members) {
        currentMembersList.innerHTML = '';
        if (members.length === 0) {
            currentMembersList.innerHTML = '<p class="text-gray-500">Nenhum membro nesta equipe.</p>';
            return;
        }
        members.forEach(member => {
            const memberEl = document.createElement('div');
            memberEl.className = 'flex justify-between items-center bg-gray-100 p-2 rounded';
            memberEl.innerHTML = `
                <span>${member.nome}</span>
                <button data-user-id="${member.id}" class="remove-member-btn text-red-500 hover:text-red-700 text-xs">Remover</button>
            `;
            currentMembersList.appendChild(memberEl);
        });
    }

    function renderAvailableUsers(currentTeamId) {
        const usersWithoutTeam = localUsers.filter(u => !u.departamentoId || u.departamentoId === currentTeamId);
        userSelect.innerHTML = '<option value="">Selecione um usuário</option>';
        
        if (usersWithoutTeam.length === 0) {
            userSelect.innerHTML = '<option value="" disabled>Nenhum usuário disponível</option>';
            return;
        }

        usersWithoutTeam.forEach(user => {
            if (user.departamentoId !== currentTeamId) { // Não listar quem já está na equipe
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.nome} (${user.email})`;
                userSelect.appendChild(option);
            }
        });
    }

    async function handleAddMember(e) {
        e.preventDefault();
        const equipeId = memberTeamIdInput.value;
        const usuarioId = userSelect.value;

        if (!equipeId || !usuarioId) {
            showNotification('Selecione um usuário.', 'warning');
            return;
        }

        try {
            await api.addTeamMember({ equipeId, usuarioId });
            showNotification('Membro adicionado com sucesso!', 'success');
            // Recarregar dados para refletir a mudança
            handleManageMembersClick(equipeId);
            loadTeams();
        } catch (error) {
            console.error('Erro ao adicionar membro:', error);
                        showNotification('Falha ao adicionar membro.', 'error');
        }
    }

    async function handleRemoveMember(usuarioId) {
        const equipeId = memberTeamIdInput.value;

        const onConfirm = async () => {
            try {
                await api.removeTeamMember({ usuarioId });
                showNotification('Membro removido com sucesso!', 'success');

                // Recarregar dados para refletir a mudança
                handleManageMembersClick(equipeId);
                loadTeams();
            } catch (error) {
                console.error('Erro ao remover membro:', error);
                showNotification(error.message || 'Falha ao remover membro.', 'error');
            }
        };

        showConfirmationModal(
            'Remover Membro',
            'Tem certeza que deseja remover este membro da equipe?',
            onConfirm
        );
    }

    async function loadPossibleManagers() {
        await loadAllUsersOnce();
        const managers = localUsers.filter(user => user.cargo === 'GESTOR' || user.cargo === 'ADMIN');
        gestorSelect.innerHTML = '<option value="">Selecione um gestor</option>';
        managers.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager.id;
            option.textContent = manager.nome;
            gestorSelect.appendChild(option);
        });
    }

    // --- Event Listeners ---
        addTeamBtn.addEventListener('click', () => {
        teamForm.reset();
        document.getElementById('team-id').value = '';
        document.getElementById('modal-title').textContent = 'Adicionar Nova Equipe';
        document.getElementById('nome-error').textContent = ''; // Limpa erro ao abrir
        loadPossibleManagers();
        openTeamModal();
    });
    closeModalBtn.addEventListener('click', closeTeamModal);
    saveTeamBtn.addEventListener('click', handleSaveTeam);

    closeMembersModalBtn.addEventListener('click', closeMembersModal);
    addMemberForm.addEventListener('submit', handleAddMember);

    teamsListEl.addEventListener('click', (event) => {
        const button = event.target;
        const id = button.dataset.id;
        if (button.classList.contains('edit-btn')) handleEditClick(id);
        if (button.classList.contains('delete-btn')) handleDeleteClick(id);
        if (button.classList.contains('members-btn')) handleManageMembersClick(id);
    });

    currentMembersList.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-member-btn')) {
            const userId = event.target.dataset.userId;
            handleRemoveMember(userId);
        }
    });

    // Carregamento inicial
    loadTeams();
});
