// General application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-temp)');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert && alert.parentNode) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    });

    // Confirm delete actions
    const deleteButtons = document.querySelectorAll('[data-confirm-delete]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const message = this.getAttribute('data-confirm-delete') || 'Are you sure you want to delete this item?';
            if (!confirm(message)) {
                e.preventDefault();
                return false;
            }
        });
    });

    // Form validation enhancement
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });

    // Password strength indicator
    const passwordInputs = document.querySelectorAll('input[type="password"][data-strength]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', function() {
            const strength = calculatePasswordStrength(this.value);
            updatePasswordStrengthIndicator(this, strength);
        });
    });

    // Real-time validation for email fields
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateEmail(this);
        });
    });

    // Navigation active state
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Tooltip initialization
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Session timeout warning
    let sessionWarningShown = false;
    const SESSION_TIMEOUT = 23 * 60 * 1000; // 23 minutes (session expires at 24 minutes)
    
    setTimeout(() => {
        if (!sessionWarningShown) {
            sessionWarningShown = true;
            showSessionWarning();
        }
    }, SESSION_TIMEOUT);

    function calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        return Math.min(strength, 4);
    }

    function updatePasswordStrengthIndicator(input, strength) {
        let indicator = input.parentNode.querySelector('.password-strength');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'password-strength mt-1';
            input.parentNode.appendChild(indicator);
        }
        
        const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['bg-danger', 'bg-warning', 'bg-info', 'bg-primary', 'bg-success'];
        
        indicator.innerHTML = `
            <div class="progress" style="height: 4px;">
                <div class="progress-bar ${colors[strength]}" style="width: ${(strength + 1) * 20}%"></div>
            </div>
            <small class="text-muted">${levels[strength] || 'Very Weak'}</small>
        `;
    }

    function validateEmail(input) {
        const email = input.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            input.classList.add('is-invalid');
            
            let feedback = input.parentNode.querySelector('.invalid-feedback');
            if (!feedback) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                input.parentNode.appendChild(feedback);
            }
            feedback.textContent = 'Please enter a valid email address';
        } else {
            input.classList.remove('is-invalid');
        }
    }

    function showSessionWarning() {
        const alertHtml = `
            <div class="alert alert-warning alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x" 
                 style="z-index: 9999; margin-top: 20px;" role="alert">
                <i class="fas fa-exclamation-triangle"></i> 
                Your session will expire in 1 minute. Please save your work.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', alertHtml);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+/ or Cmd+/ for help
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            showKeyboardShortcuts();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });
        }
    });

    function showKeyboardShortcuts() {
        // This would show a modal with keyboard shortcuts
        console.log('Keyboard shortcuts: Ctrl+/ for help, Escape to close modals');
    }
});

// Utility functions
window.utils = {
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },
    
    showConfirmDialog: function(message, callback) {
        if (confirm(message)) {
            callback();
        }
    },
    
    showToast: function(message, type = 'info') {
        // Simple toast notification
        const toastHtml = `
            <div class="toast position-fixed bottom-0 end-0 m-3" role="alert">
                <div class="toast-header">
                    <strong class="me-auto">Notification</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.querySelector('.toast:last-child');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Remove from DOM after hiding
        toastElement.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }
};