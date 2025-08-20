document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('create-team-form');
    const gestorSelect = document.getElementById('gestorId');

    // Popula o seletor de gestores
    try {
        const users = await api.get('/admin/users'); // Assumindo que essa rota existe
        const gestores = users.filter(user => user.cargo === 'GESTOR' || user.cargo === 'ADMINISTRADOR');
        
        gestores.forEach(gestor => {
            const option = document.createElement('option');
            option.value = gestor.id;
            option.textContent = `${gestor.nome} (${gestor.email})`;
            gestorSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar gestores:', error);
        showNotification('Não foi possível carregar a lista de gestores.', 'error');
    }

    // Manipula a submissão do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            nome: formData.get('nome'),
            descricao: formData.get('descricao'),
            gestorId: formData.get('gestorId') || null,
        };

        try {
            await api.post('/admin/teams', data, true);
            showNotification('Equipe criada com sucesso!', 'success');
            form.reset();
            setTimeout(() => window.location.href = 'admin.html', 1500);
        } catch (error) {
            console.error('Erro ao criar equipe:', error);
            showNotification(error.message || 'Falha ao criar a equipe.', 'error');
        }
    });
});

// Função de notificação (deve estar em um arquivo global, mas adicionada aqui por simplicidade)
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
