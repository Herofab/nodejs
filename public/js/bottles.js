// Bottle management JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Status change handling
    const statusSelects = document.querySelectorAll('.status-select');
    statusSelects.forEach(select => {
        select.addEventListener('change', async function() {
            const bottleId = this.dataset.bottleId;
            const newStatus = this.value;
            const originalStatus = this.dataset.originalStatus || this.querySelector('option[selected]')?.value;
            
            try {
                const response = await fetch(`/bottles/${bottleId}/status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    utils.showToast(result.message, 'success');
                    this.dataset.originalStatus = newStatus;
                    
                    // Update row styling based on status
                    const row = this.closest('tr');
                    row.className = `bottle-row status-${newStatus.toLowerCase()}`;
                    
                } else {
                    utils.showToast(result.message, 'error');
                    this.value = originalStatus; // Revert to original status
                }
            } catch (error) {
                console.error('Status update error:', error);
                utils.showToast('Error updating status', 'error');
                this.value = originalStatus; // Revert to original status
            }
        });
        
        // Store original status for reverting if needed
        select.dataset.originalStatus = select.value;
    });

    // Select all functionality
    const selectAllCheckbox = document.getElementById('selectAll');
    const selectAllHeader = document.getElementById('selectAllHeader');
    const bottleCheckboxes = document.querySelectorAll('.bottle-select');
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    const selectedCountSpan = document.getElementById('selectedCount');

    function updateSelectAll() {
        const checkedBoxes = document.querySelectorAll('.bottle-select:checked');
        const allBoxes = document.querySelectorAll('.bottle-select');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkedBoxes.length === allBoxes.length && allBoxes.length > 0;
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
        }
        
        if (selectAllHeader) {
            selectAllHeader.checked = checkedBoxes.length === allBoxes.length && allBoxes.length > 0;
            selectAllHeader.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
        }
        
        // Update selected count and bulk action button
        if (selectedCountSpan) {
            selectedCountSpan.textContent = checkedBoxes.length;
        }
        
        if (bulkActionBtn) {
            bulkActionBtn.disabled = checkedBoxes.length === 0;
        }
    }

    // Select all checkbox handlers
    [selectAllCheckbox, selectAllHeader].forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                bottleCheckboxes.forEach(box => {
                    box.checked = this.checked;
                });
                updateSelectAll();
            });
        }
    });

    // Individual checkbox handlers
    bottleCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectAll);
    });

    // Initialize select all state
    updateSelectAll();

    // QR Code modal functionality
    window.showQRCode = function(qrCodeData, bottleCode) {
        const qrImage = document.getElementById('qrCodeImage');
        const qrBottleCode = document.getElementById('qrBottleCode');
        
        if (qrImage && qrBottleCode) {
            qrImage.src = qrCodeData;
            qrBottleCode.textContent = bottleCode;
        }
    };

    // Download QR code function
    window.downloadQR = function() {
        const qrImage = document.getElementById('qrCodeImage');
        const bottleCode = document.getElementById('qrBottleCode').textContent;
        
        if (qrImage && qrImage.src) {
            const link = document.createElement('a');
            link.download = `qr-code-${bottleCode}.png`;
            link.href = qrImage.src;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // View bottle detail function (double-click)
    window.viewBottleDetail = function(bottleId) {
        window.location.href = `/bottles/${bottleId}`;
    };

    // Bulk actions
    window.performBulkAction = function(action) {
        const checkedBoxes = document.querySelectorAll('.bottle-select:checked');
        const bottleIds = Array.from(checkedBoxes).map(box => box.value);
        
        if (bottleIds.length === 0) {
            utils.showToast('Please select bottles first', 'warning');
            return;
        }

        let confirmMessage;
        if (action === 'delete') {
            confirmMessage = `Are you sure you want to delete ${bottleIds.length} bottle(s)?`;
        } else {
            confirmMessage = `Are you sure you want to move ${bottleIds.length} bottle(s) to ${action.replace('At', '')}?`;
        }

        if (confirm(confirmMessage)) {
            const form = document.getElementById('bulkActionForm');
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = action;
            
            const bottleIdsInput = document.getElementById('bulkBottleIds');
            bottleIdsInput.value = JSON.stringify(bottleIds);
            
            form.appendChild(actionInput);
            form.submit();
        }
    };

    // Auto-refresh functionality
    let autoRefreshInterval;
    const autoRefreshCheckbox = document.getElementById('autoRefresh');
    
    function startAutoRefresh() {
        autoRefreshInterval = setInterval(() => {
            // Only refresh if user is not interacting
            if (document.querySelectorAll('.bottle-select:checked').length === 0) {
                window.location.reload();
            }
        }, 30000); // Refresh every 30 seconds
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
    }

    if (autoRefreshCheckbox) {
        autoRefreshCheckbox.addEventListener('change', function() {
            if (this.checked) {
                startAutoRefresh();
                utils.showToast('Auto-refresh enabled', 'info');
            } else {
                stopAutoRefresh();
                utils.showToast('Auto-refresh disabled', 'info');
            }
        });
    }

    // QR Code search functionality
    const qrSearchBtn = document.getElementById('qrSearchBtn');
    const qrSearchInput = document.getElementById('qrSearchInput');

    if (qrSearchBtn && qrSearchInput) {
        qrSearchBtn.addEventListener('click', async function() {
            const code = qrSearchInput.value.trim();
            if (!code) {
                utils.showToast('Please enter a bottle code', 'warning');
                return;
            }

            try {
                const response = await fetch(`/bottles/search/qr/${code}`);
                const result = await response.json();

                if (result.success) {
                    // Highlight the found bottle row
                    const rows = document.querySelectorAll('.bottle-row');
                    rows.forEach(row => {
                        if (row.dataset.bottleId === result.bottle.id.toString()) {
                            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            row.classList.add('table-warning');
                            setTimeout(() => row.classList.remove('table-warning'), 3000);
                        }
                    });
                } else {
                    utils.showToast(result.message, 'error');
                }
            } catch (error) {
                console.error('QR search error:', error);
                utils.showToast('Error searching for bottle', 'error');
            }
        });

        qrSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                qrSearchBtn.click();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+A or Cmd+A to select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            if (selectAllCheckbox) {
                selectAllCheckbox.click();
            }
        }
        
        // Delete key to delete selected
        if (e.key === 'Delete' && !e.target.matches('input, textarea, select')) {
            const checkedBoxes = document.querySelectorAll('.bottle-select:checked');
            if (checkedBoxes.length > 0) {
                performBulkAction('delete');
            }
        }
        
        // F5 to refresh (prevent default and show message)
        if (e.key === 'F5') {
            e.preventDefault();
            window.location.reload();
        }
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Table row hover effects
    const tableRows = document.querySelectorAll('.bottle-row');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
});

// Utility functions for bottle management
window.bottleUtils = {
    // Format bottle status for display
    formatStatus(status) {
        const statusMap = {
            'AtPlant': 'At Plant',
            'AtCustomer': 'At Customer',
            'AtVehicle': 'At Vehicle'
        };
        return statusMap[status] || status;
    },

    // Get status badge class
    getStatusBadgeClass(status) {
        const classMap = {
            'AtPlant': 'bg-success',
            'AtCustomer': 'bg-warning',
            'AtVehicle': 'bg-info'
        };
        return classMap[status] || 'bg-secondary';
    },

    // Format bottle type for display
    formatBottleType(type) {
        return type.replace('L', ' Liter');
    }
};