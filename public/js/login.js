// Login page JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Password visibility toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // PIN form handling
    const pinForm = document.getElementById('pinForm');
    if (pinForm) {
        pinForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';
            
            try {
                const response = await fetch('/auth/login/pin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(result.message, 'success');
                    setTimeout(() => {
                        window.location.href = result.redirectUrl;
                    }, 1000);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Network error occurred', 'error');
            } finally {
                // Restore button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Fingerprint simulation
    const fingerprintScanner = document.querySelector('.fingerprint-scanner');
    const fingerprintData = document.getElementById('fingerprintData');
    const fingerprintSubmit = document.getElementById('fingerprintSubmit');
    const fingerprintForm = document.getElementById('fingerprintForm');
    
    if (fingerprintScanner) {
        fingerprintScanner.addEventListener('click', function() {
            // Simulate fingerprint scanning
            this.classList.add('active');
            const icon = this.querySelector('i');
            const text = this.querySelector('p');
            
            icon.style.animation = 'pulse 1s infinite';
            text.textContent = 'Scanning...';
            
            setTimeout(() => {
                // Simulate successful scan
                const simulatedFingerprint = 'simulated_fingerprint_' + Date.now();
                fingerprintData.value = simulatedFingerprint;
                
                icon.style.animation = '';
                text.textContent = 'Fingerprint captured!';
                fingerprintSubmit.disabled = false;
                
                showMessage('Fingerprint captured successfully', 'success');
            }, 2000);
        });
    }

    // Fingerprint form handling
    if (fingerprintForm) {
        fingerprintForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Authenticating...';
            
            try {
                const response = await fetch('/auth/login/fingerprint', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(result.message, 'success');
                    setTimeout(() => {
                        window.location.href = result.redirectUrl;
                    }, 1000);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Network error occurred', 'error');
            } finally {
                // Restore button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // PIN input formatting
    const pinInput = document.getElementById('pinCode');
    if (pinInput) {
        pinInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // Tab switching animation
    const tabButtons = document.querySelectorAll('#loginTabs button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Reset any form states when switching tabs
            resetFormStates();
        });
    });

    function resetFormStates() {
        // Reset fingerprint scanner
        if (fingerprintScanner) {
            fingerprintScanner.classList.remove('active');
            const icon = fingerprintScanner.querySelector('i');
            const text = fingerprintScanner.querySelector('p');
            icon.style.animation = '';
            text.textContent = 'Click to scan fingerprint';
        }
        
        if (fingerprintData) {
            fingerprintData.value = '';
        }
        
        if (fingerprintSubmit) {
            fingerprintSubmit.disabled = true;
        }
    }

    function showMessage(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-temp');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new alert
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show alert-temp slide-up" role="alert">
                <i class="fas ${icon}"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const tempAlert = document.querySelector('.alert-temp');
            if (tempAlert) {
                tempAlert.remove();
            }
        }, 5000);
    }
});