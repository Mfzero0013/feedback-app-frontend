# Caminho para o arquivo principal
$filePath = 'c:\Users\mauricio.oliveira\Downloads\feedback-app-frontend\main\main.js'

# Ler o conteúdo do arquivo
$content = Get-Content -Path $filePath -Raw

# Definir o novo bloco finally
$newFinallyBlock = @'
    } finally {
        // Restaurar opacidade da tabela
        if (tableBody) {
            tableBody.style.opacity = '1';
            
            // Remover loaders locais
            const loaders = tableBody.querySelectorAll('.table-loader');
            loaders.forEach(loader => loader.remove());
            
            // Limpar estilos de transição após a conclusão
            setTimeout(() => {
                tableBody.style.transition = '';
                tableBody.style.opacity = '';
            }, 200);
        }
        
        // Esconder loader global se existir
        const globalLoader = document.getElementById('loader');
        if (globalLoader) {
            globalLoader.classList.add('hidden');
            globalLoader.classList.remove('flex');
        }
        
        // Melhorar acessibilidade removendo foco de elementos temporários
        const activeElement = document.activeElement;
        if (activeElement?.blur && 
            (activeElement.tagName === 'BUTTON' || 
             activeElement.tagName === 'A' || 
             activeElement.tagName === 'INPUT' || 
             activeElement.tagName === 'SELECT')) {
            activeElement.blur();
        }
    }'@

# Padrão para encontrar o bloco finally específico da função renderUsersTable
$pattern = '(?s)renderUsersTable\([^}]*?finally \{\s*hideLoader\(\);\s*\}'
$replacement = 'renderUsersTable$1' + $newFinallyBlock

# Fazer a substituição
$newContent = [regex]::Replace($content, $pattern, $replacement)

# Escrever o conteúdo de volta para o arquivo
[System.IO.File]::WriteAllText($filePath, $newContent, [System.Text.Encoding]::UTF8)

Write-Host "Bloco finally atualizado com sucesso!"
