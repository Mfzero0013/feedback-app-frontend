function loadUserProfileWidget() {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
        try {
            const userData = JSON.parse(userDataString);
            const userName = userData.nome;
            const userAvatar = document.getElementById('user-avatar-display');
            const userNameDisplay = document.getElementById('user-name-display');

            if (userName && userAvatar && userNameDisplay) {
                userNameDisplay.textContent = userName;
                userNameDisplay.classList.remove('hidden');
                
                const encodedName = encodeURIComponent(userName);
                userAvatar.src = `https://ui-avatars.com/api/?name=${encodedName}&background=818cf8&color=fff`;
                userAvatar.alt = userName;
            }
        } catch (error) {
            console.error('Failed to parse user data for profile widget:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Token não encontrado, redirecionando para o login.');
        // window.location.href = '/login.html'; // Opcional: redirecionar se não houver token
        return;
    }

    try {
        const response = await fetch('/api/dashboard/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao buscar as estatísticas do dashboard.');
        }

        const result = await response.json();
        const stats = result.data;

        // Atualiza os cartões de estatísticas com dados da API
        document.getElementById('feedbacks-abertos').textContent = stats.feedbacksAbertos;
        document.getElementById('media-avaliacoes').textContent = stats.mediaAvaliacoes.toFixed(1);
        document.getElementById('colegas-equipe').textContent = stats.colegasEquipe;

    } catch (error) {
        console.error('Erro ao carregar estatísticas do dashboard:', error);
        // Opcional: mostrar uma mensagem de erro na UI
    }

    // TODO: Implementar a busca de dados para os gráficos
    // Por enquanto, eles permanecerão com dados zerados.
    const competenciasData = {
        labels: ['Comunicação', 'Proatividade', 'Colaboração', 'Liderança', 'Inovação'],
        datasets: [{
            label: 'Pontuação Média',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };

    const evolucaoData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{
            label: 'Sua Evolução',
            data: [0, 0, 0, 0, 0, 0],
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1
        }]
    };

    function renderCompetenciasChart(competenciasData) {
        const competenceCtx = document.getElementById('competence-chart')?.getContext('2d');
        if (competenceCtx) {
            new Chart(competenceCtx, {
                type: 'bar',
                data: competenciasData,
                options: { scales: { y: { beginAtZero: true, max: 10 } }, plugins: { legend: { display: false } } }
            });
        }
    }

    function renderEvolucaoChart(evolucaoData) {
        const evolutionCtx = document.getElementById('evolution-chart')?.getContext('2d');
        if (evolutionCtx) {
            new Chart(evolutionCtx, {
                type: 'line',
                data: evolucaoData,
                options: { plugins: { legend: { display: false } } }
            });
        }
    }

    renderCompetenciasChart(competenciasData);
    renderEvolucaoChart(evolucaoData);
});
