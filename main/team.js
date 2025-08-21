document.addEventListener('DOMContentLoaded', () => {
    loadMyTeam();

    const addMemberButton = document.getElementById('add-member-button');
    const addMemberModal = document.getElementById('add-member-modal');
    const cancelAddMemberButton = document.getElementById('cancel-add-member');
    const addMemberForm = document.getElementById('add-member-form');

    addMemberButton.addEventListener('click', () => {
        addMemberModal.classList.remove('hidden');
    });

    cancelAddMemberButton.addEventListener('click', () => {
        addMemberModal.classList.add('hidden');
    });

    addMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addMemberForm);
        const userData = Object.fromEntries(formData.entries());

        try {
            await api.createUser(userData);
            showNotification('Membro adicionado com sucesso!', 'success');
            addMemberForm.reset();
            addMemberModal.classList.add('hidden');
            loadMyTeam(); // Recarrega a lista da equipe
        } catch (error) {
            showNotification(error.message || 'Erro ao adicionar membro.', 'error');
        }
    });
});

async function loadMyTeam() {
    const container = document.getElementById('team-members-container');
    container.innerHTML = '<p class="text-gray-500 col-span-full">Carregando membros da equipe...</p>';

    try {
        const team = await api.getMyTeam();

        if (team && team.usuarios && team.usuarios.length > 0) {
            container.innerHTML = ''; // Clear loading message
            team.usuarios.forEach(member => {
                const memberCard = createMemberCard(member, team.nome);
                container.appendChild(memberCard);
            });
        } else {
            container.innerHTML = '<p class="text-gray-500 col-span-full">Nenhum membro encontrado na sua equipe.</p>';
        }
    } catch (error) {
        console.error('Erro ao buscar dados da equipe:', error);
        container.innerHTML = '<p class="text-red-500 col-span-full">Não foi possível carregar os dados da equipe.</p>';
    }
}

function createMemberCard(member, teamName) {
    const card = document.createElement('div');
    card.className = 'bg-white p-6 rounded-lg shadow-lg flex flex-col justify-between';

    // Placeholder for feedback dates
    const lastFeedbackDate = '15/06/2023';
    const nextFeedbackDate = '15/09/2023';

    const colors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800'];
    const color = colors[teamName.length % colors.length];

    card.innerHTML = `
        <div>
            <div class="flex items-start mb-4">
                <img class="w-16 h-16 rounded-full mr-4 object-cover" src="https://i.pravatar.cc/150?u=${member.email}" alt="Avatar de ${member.nome}">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${member.nome}</h3>
                    <p class="text-md text-gray-600">${member.jobTitle || 'Cargo não definido'}</p>
                    <span class="mt-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${color}">${teamName}</span>
                </div>
            </div>
            <div class="text-sm text-gray-700 space-y-2 my-4">
                <p><strong>Último feedback:</strong> ${lastFeedbackDate}</p>
                <p><strong>Próximo feedback:</strong> ${nextFeedbackDate}</p>
            </div>
        </div>
        <button onclick="viewMemberDetails('${member.id}')" class="w-full mt-auto bg-indigo-100 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-200 transition-colors">
            Ver Detalhes
        </button>
    `;
    return card;
}

function viewMemberDetails(memberId) {
    window.location.href = `feedback.html?userId=${memberId}`;
}
