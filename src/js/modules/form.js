import { escapeHtml, debounce } from './utils.js';
import { notificationService } from './ui.js';

/**
 * Classe para gerenciar formulários
 */
export class FormManager {
    /**
     * @param {string|HTMLFormElement} form - Elemento do formulário ou seletor
     * @param {Object} options - Opções de configuração
     */
    constructor(form, options = {}) {
        this.form = typeof form === 'string' ? document.querySelector(form) : form;
        this.fields = options.fields || {};
        this.onSubmit = options.onSubmit || (() => {});
        this.onSuccess = options.onSuccess || (() => {});
        this.onError = options.onError || (() => {});
        this.onChange = options.onChange || (() => {});
        this.autoValidate = options.autoValidate !== false;
        this.validateOnChange = options.validateOnChange !== false;
        this.validateOnBlur = options.validateOnBlur !== false;
        this.showValidationMessages = options.showValidationMessages !== false;
        
        // Inicializa o gerenciador
        this.init();
    }
    
    /**
     * Inicializa o gerenciador de formulário
     */
    init() {
        if (!this.form || !(this.form instanceof HTMLFormElement)) {
            console.error('Elemento de formulário inválido');
            return;
        }
        
        // Configura os campos
        this.setupFields();
        
        // Configura os eventos
        this.setupEvents();
        
        // Validação inicial
        if (this.autoValidate) {
            this.validateAll();
        }
    }
    
    /**
     * Configura os campos do formulário
     */
    setupFields() {
        // Adiciona classes iniciais aos campos
        Object.keys(this.fields).forEach(fieldName => {
            const input = this.form.querySelector(`[name="${fieldName}"]`);
            if (input) {
                input.classList.add('form-control');
                
                // Adiciona elemento de mensagem de erro se não existir
                if (this.showValidationMessages && !input.nextElementSibling?.classList?.contains('invalid-feedback')) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'invalid-feedback';
                    errorElement.id = `${fieldName}-error`;
                    input.insertAdjacentElement('afterend', errorElement);
                }
            }
        });
    }
    
    /**
     * Configura os eventos do formulário
     */
    setupEvents() {
        // Evento de submit
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Eventos de validação
        if (this.validateOnChange) {
            this.form.addEventListener('input', debounce(this.handleInput.bind(this), 300));
        }
        
        if (this.validateOnBlur) {
            this.form.addEventListener('focusout', this.handleBlur.bind(this), true);
        }
    }
    
    /**
     * Manipula o evento de submit do formulário
     * @param {Event} event - Evento de submit
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        // Valida o formulário
        const isValid = this.validateAll();
        if (!isValid) {
            this.focusFirstInvalid();
            return;
        }
        
        // Desabilita o botão de submit
        const submitButton = this.form.querySelector('[type="submit"]');
        const originalButtonText = submitButton?.innerHTML;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        }
        
        try {
            // Obtém os dados do formulário
            const formData = this.getFormData();
            
            // Executa a função de submit
            const result = await this.onSubmit(formData, this);
            
            // Executa o callback de sucesso
            await this.onSuccess(result, this);
            
        } catch (error) {
            console.error('Erro ao processar formulário:', error);
            
            // Executa o callback de erro
            await this.onError(error, this);
            
            // Mostra mensagem de erro
            notificationService.error(
                error.message || 'Ocorreu um erro ao processar o formulário. Tente novamente.'
            );
            
        } finally {
            // Reabilita o botão de submit
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        }
    }
    
    /**
     * Manipula o evento de input nos campos
     * @param {Event} event - Evento de input
     */
    handleInput(event) {
        const input = event.target;
        if (!input.name || !this.fields[input.name]) return;
        
        // Valida o campo
        this.validateField(input.name);
        
        // Executa o callback de mudança
        this.onChange(input.name, input.value, this);
    }
    
    /**
     * Manipula o evento de blur nos campos
     * @param {Event} event - Evento de blur
     */
    handleBlur(event) {
        const input = event.target;
        if (!input.name || !this.fields[input.name]) return;
        
        // Valida o campo
        this.validateField(input.name);
    }
    
    /**
     * Valida um campo específico
     * @param {string} fieldName - Nome do campo
     * @returns {boolean} Verdadeiro se o campo for válido
     */
    validateField(fieldName) {
        const fieldConfig = this.fields[fieldName];
        if (!fieldConfig) return true;
        
        const input = this.form.querySelector(`[name="${fieldName}"]`);
        if (!input) return true;
        
        const value = this.getValue(input);
        const errorElement = this.form.querySelector(`#${fieldName}-error`);
        let isValid = true;
        let errorMessage = '';
        
        // Validação de campo obrigatório
        if (fieldConfig.required && !this.hasValue(value)) {
            isValid = false;
            errorMessage = fieldConfig.message || 'Este campo é obrigatório.';
        }
        
        // Validação personalizada
        if (isValid && typeof fieldConfig.validate === 'function') {
            const validationResult = fieldConfig.validate(value, this.getFormData());
            if (validationResult !== true) {
                isValid = false;
                errorMessage = validationResult || 'Valor inválido';
            }
        }
        
        // Atualiza a UI
        this.updateFieldValidationUI(input, isValid, errorMessage);
        
        return isValid;
    }
    
    /**
     * Valida todos os campos do formulário
     * @returns {boolean} Verdadeiro se todos os campos forem válidos
     */
    validateAll() {
        let isValid = true;
        
        Object.keys(this.fields).forEach(fieldName => {
            if (!this.validateField(fieldName)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Atualiza a UI de validação de um campo
     * @param {HTMLElement} input - Elemento de input
     * @param {boolean} isValid - Se o campo é válido
     * @param {string} errorMessage - Mensagem de erro (se houver)
     */
    updateFieldValidationUI(input, isValid, errorMessage = '') {
        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
        }
        
        if (this.showValidationMessages) {
            const errorElement = this.form.querySelector(`#${input.name}-error`);
            if (errorElement) {
                errorElement.textContent = errorMessage;
            }
        }
    }
    
    /**
     * Foca no primeiro campo inválido
     */
    focusFirstInvalid() {
        const firstInvalid = this.form.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus();
        }
    }
    
    /**
     * Obtém o valor de um campo de formulário
     * @param {HTMLElement} input - Elemento de input
     * @returns {*} Valor do campo
     */
    getValue(input) {
        if (input.type === 'checkbox') {
            return input.checked;
        } else if (input.type === 'radio') {
            const checked = this.form.querySelector(`input[name="${input.name}"]:checked`);
            return checked ? checked.value : null;
        } else if (input.type === 'file') {
            return input.files;
        } else {
            return input.value.trim();
        }
    }
    
    /**
     * Verifica se um valor está preenchido
     * @param {*} value - Valor a ser verificado
     * @returns {boolean} Verdadeiro se o valor estiver preenchido
     */
    hasValue(value) {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && !value.trim()) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
    }
    
    /**
     * Obtém todos os dados do formulário como um objeto
     * @returns {Object} Dados do formulário
     */
    getFormData() {
        const formData = {};
        
        Object.keys(this.fields).forEach(fieldName => {
            const input = this.form.querySelector(`[name="${fieldName}"]`);
            if (input) {
                formData[fieldName] = this.getValue(input);
            }
        });
        
        return formData;
    }
    
    /**
     * Preenche o formulário com dados
     * @param {Object} data - Dados para preencher o formulário
     */
    setFormData(data) {
        if (!data) return;
        
        Object.keys(this.fields).forEach(fieldName => {
            const input = this.form.querySelector(`[name="${fieldName}"]`);
            if (!input || data[fieldName] === undefined) return;
            
            if (input.type === 'checkbox') {
                input.checked = Boolean(data[fieldName]);
            } else if (input.type === 'radio') {
                const radio = this.form.querySelector(`input[name="${input.name}"][value="${data[fieldName]}"]`);
                if (radio) radio.checked = true;
            } else if (input.type === 'select-multiple') {
                const values = Array.isArray(data[fieldName]) ? data[fieldName] : [data[fieldName]];
                Array.from(input.options).forEach(option => {
                    option.selected = values.includes(option.value);
                });
            } else {
                input.value = data[fieldName] || '';
            }
        });
    }
    
    /**
     * Reseta o formulário
     */
    reset() {
        this.form.reset();
        
        // Remove as classes de validação
        this.form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        
        // Limpa as mensagens de erro
        if (this.showValidationMessages) {
            this.form.querySelectorAll('.invalid-feedback').forEach(el => {
                el.textContent = '';
            });
        }
    }
}

/**
 * Validações comuns para formulários
 */
export const validators = {
    /**
     * Valida um e-mail
     * @param {string} value - Valor a ser validado
     * @returns {string|boolean} Mensagem de erro ou true se for válido
     */
    email(value) {
        if (!value) return true; // Campo não obrigatório
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(value).toLowerCase()) || 'Por favor, insira um e-mail válido';
    },
    
    /**
     * Valida uma senha
     * @param {string} value - Valor a ser validado
     * @returns {string|boolean} Mensagem de erro ou true se for válido
     */
    password(value) {
        if (!value) return true; // Campo não obrigatório
        if (value.length < 6) return 'A senha deve ter pelo menos 6 caracteres';
        return true;
    },
    
    /**
     * Valida se dois campos são iguais
     * @param {string} fieldName - Nome do campo a ser comparado
     * @param {string} message - Mensagem de erro personalizada
     * @returns {Function} Função de validação
     */
    match(fieldName, message = 'Os campos não conferem') {
        return (value, formData) => {
            return value === formData[fieldName] || message;
        };
    },
    
    /**
     * Valida um CPF
     * @param {string} value - CPF a ser validado
     * @returns {string|boolean} Mensagem de erro ou true se for válido
     */
    cpf(value) {
        if (!value) return true; // Campo não obrigatório
        
        // Remove caracteres não numéricos
        const cpf = value.replace(/[\D]/g, '');
        
        // Verifica se tem 11 dígitos
        if (cpf.length !== 11) return 'CPF inválido';
        
        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cpf)) return 'CPF inválido';
        
        // Validação dos dígitos verificadores
        let sum = 0;
        let remainder;
        
        // Primeiro dígito verificador
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return 'CPF inválido';
        
        // Segundo dígito verificador
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return 'CPF inválido';
        
        return true;
    },
    
    /**
     * Valida um CNPJ
     * @param {string} value - CNPJ a ser validado
     * @returns {string|boolean} Mensagem de erro ou true se for válido
     */
    cnpj(value) {
        if (!value) return true; // Campo não obrigatório
        
        // Remove caracteres não numéricos
        const cnpj = value.replace(/[\D]/g, '');
        
        // Verifica se tem 14 dígitos
        if (cnpj.length !== 14) return 'CNPJ inválido';
        
        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cnpj)) return 'CNPJ inválido';
        
        // Validação dos dígitos verificadores
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        const digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;
        
        // Primeiro dígito verificador
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(0))) return 'CNPJ inválido';
        
        // Segundo dígito verificador
        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(1))) return 'CNPJ inválido';
        
        return true;
    },
    
    /**
     * Valida um telefone
     * @param {string} value - Telefone a ser validado
     * @returns {string|boolean} Mensagem de erro ou true se for válido
     */
    phone(value) {
        if (!value) return true; // Campo não obrigatório
        
        // Remove caracteres não numéricos
        const phone = value.replace(/[\D]/g, '');
        
        // Verifica se tem entre 10 e 11 dígitos
        if (phone.length < 10 || phone.length > 11) return 'Telefone inválido';
        
        // Verifica se o DDD é válido (11 a 99)
        const ddd = parseInt(phone.substring(0, 2));
        if (ddd < 11 || ddd > 99) return 'DDD inválido';
        
        return true;
    },
    
    /**
     * Valida uma data
     * @param {string} value - Data a ser validada (DD/MM/YYYY)
     * @returns {string|boolean} Mensagem de erro ou true se for válido
     */
    date(value) {
        if (!value) return true; // Campo não obrigatório
        
        // Verifica o formato da data
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return 'Formato de data inválido (DD/MM/AAAA)';
        
        // Extrai dia, mês e ano
        const [day, month, year] = value.split('/').map(Number);
        
        // Verifica se a data é válida
        const date = new Date(year, month - 1, day);
        if (
            date.getDate() !== day ||
            date.getMonth() !== month - 1 ||
            date.getFullYear() !== year
        ) {
            return 'Data inválida';
        }
        
        return true;
    }
};

/**
 * Inicializa um formulário com validação
 * @param {string|HTMLFormElement} form - Elemento do formulário ou seletor
 * @param {Object} options - Opções de configuração
 * @returns {FormManager} Instância do gerenciador de formulário
 */
export function initForm(form, options = {}) {
    return new FormManager(form, options);
}
