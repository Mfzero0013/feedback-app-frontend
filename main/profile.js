document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const viewMode = document.getElementById('profile-view');
    const editMode = document.getElementById('profile-edit');

    // Buttons
    const editButton = document.getElementById('edit-profile-button');
    const saveButton = document.getElementById('save-profile-button');
    const cancelButton = document.getElementById('cancel-edit-button');

    // View-mode elements
    const profileAvatar = document.getElementById('profile-avatar');
    const profileName = document.getElementById('profile-name');
    const profileJobTitle = document.getElementById('profile-job-title');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');
    const profileTeam = document.getElementById('profile-team');

    // Edit-mode elements
    const editAvatar = document.getElementById('edit-profile-avatar');
    const editName = document.getElementById('edit-profile-name');
    const editJobTitle = document.getElementById('edit-profile-job-title');

    let originalUserData = {};

    const loadProfileData = async () => {
        try {
            const response = await api.get('/profile/me');
            originalUserData = response.data.data;
            populateProfileData(originalUserData);
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            alert('Não foi possível carregar os dados do perfil.');
            if (error.response && error.response.status === 401) {
                window.location.href = 'index.html';
            }
        }
    };

    const populateProfileData = (user) => {
        const avatarUrl = `https://i.pravatar.cc/150?u=${user.email}`;
        // View mode
        profileAvatar.src = avatarUrl;
        profileName.textContent = user.nome;
        profileJobTitle.textContent = user.jobTitle || 'Cargo não definido';
        profileEmail.textContent = user.email;
        profileRole.textContent = user.cargo;
        profileTeam.textContent = user.equipe ? user.equipe.nome : 'Sem equipe';

        // Edit mode
        editAvatar.src = avatarUrl;
        editName.value = user.nome;
        editJobTitle.value = user.jobTitle || '';
    };

    const toggleEditMode = (isEditing) => {
        if (isEditing) {
            populateProfileData(originalUserData); // Garante que o form tem os dados mais recentes
            viewMode.classList.add('hidden');
            editMode.classList.remove('hidden');
            editButton.classList.add('hidden');
            saveButton.classList.remove('hidden');
            cancelButton.classList.remove('hidden');
        } else {
            viewMode.classList.remove('hidden');
            editMode.classList.add('hidden');
            editButton.classList.remove('hidden');
            saveButton.classList.add('hidden');
            cancelButton.classList.add('hidden');
        }
    };

    const saveProfileChanges = async () => {
        const updatedData = {
            nome: editName.value.trim(),
            jobTitle: editJobTitle.value.trim(),
        };

        if (!updatedData.nome) {
            alert('O nome não pode ficar em branco.');
            return;
        }

        try {
            const response = await api.patch('/profile/me', updatedData);
            originalUserData = response.data.user;
            localStorage.setItem('userData', JSON.stringify(originalUserData)); // Atualiza o localStorage
            populateProfileData(originalUserData);
            toggleEditMode(false);
            alert('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar o perfil:', error);
            alert('Falha ao salvar as alterações. Tente novamente.');
        }
    };

    // Event Listeners
    editButton.addEventListener('click', () => toggleEditMode(true));
    cancelButton.addEventListener('click', () => toggleEditMode(false));
    saveButton.addEventListener('click', saveProfileChanges);

    // Initial Load
    loadProfileData();
});
