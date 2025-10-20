// Custom Date Selection for Orders
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize custom date selection functionality
    initializeCustomDates();
    
    function initializeCustomDates() {
        const subscriptionTypeSelect = document.getElementById('subscription_type');
        const customDatesContainer = document.getElementById('custom-dates-container');
        const previewContainer = document.getElementById('delivery-preview');
        
        if (!subscriptionTypeSelect || !customDatesContainer) return;
        
        // Show/hide custom dates based on subscription type
        subscriptionTypeSelect.addEventListener('change', function() {
            if (this.value === 'custom-dates') {
                customDatesContainer.style.display = 'block';
                setupDatePickers();
            } else {
                customDatesContainer.style.display = 'none';
                if (previewContainer) previewContainer.innerHTML = '';
            }
        });
        
        // Initial check
        if (subscriptionTypeSelect.value === 'custom-dates') {
            customDatesContainer.style.display = 'block';
            setupDatePickers();
        }
    }
    
    function setupDatePickers() {
        // Create day selector buttons (1-31)
        const daySelector = document.getElementById('day-selector');
        if (!daySelector) return;
        
        daySelector.innerHTML = ''; // Clear existing
        
        for (let day = 1; day <= 31; day++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-primary btn-sm m-1 day-selector-btn';
            button.textContent = day;
            button.setAttribute('data-day', day);
            
            button.addEventListener('click', function() {
                toggleDaySelection(this);
                updateSelectedDates();
                updateDeliveryPreview();
            });
            
            daySelector.appendChild(button);
        }
        
        // Add preview update listeners
        const startDateInput = document.getElementById('start_date');
        const endDateInput = document.getElementById('end_date');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', updateDeliveryPreview);
        }
        if (endDateInput) {
            endDateInput.addEventListener('change', updateDeliveryPreview);
        }
    }
    
    function toggleDaySelection(button) {
        if (button.classList.contains('btn-outline-primary')) {
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-primary');
        } else {
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline-primary');
        }
    }
    
    function updateSelectedDates() {
        const selectedButtons = document.querySelectorAll('.day-selector-btn.btn-primary');
        const selectedDates = Array.from(selectedButtons).map(btn => parseInt(btn.getAttribute('data-day')));
        
        // Update hidden input
        const hiddenInput = document.getElementById('custom_delivery_dates');
        if (hiddenInput) {
            hiddenInput.value = selectedDates.join(',');
        }
        
        // Update display
        const selectedDisplay = document.getElementById('selected-dates-display');
        if (selectedDisplay) {
            if (selectedDates.length > 0) {
                selectedDisplay.innerHTML = `<strong>Selected Days:</strong> ${selectedDates.sort((a, b) => a - b).join(', ')}`;
                selectedDisplay.className = 'alert alert-info mt-2';
            } else {
                selectedDisplay.innerHTML = '<em>No dates selected</em>';
                selectedDisplay.className = 'text-muted mt-2';
            }
        }
    }
    
    function updateDeliveryPreview() {
        const startDate = document.getElementById('start_date')?.value;
        const endDate = document.getElementById('end_date')?.value;
        const selectedButtons = document.querySelectorAll('.day-selector-btn.btn-primary');
        const selectedDates = Array.from(selectedButtons).map(btn => parseInt(btn.getAttribute('data-day')));
        
        if (!startDate || !endDate || selectedDates.length === 0) {
            const previewContainer = document.getElementById('delivery-preview');
            if (previewContainer) {
                previewContainer.innerHTML = '';
            }
            return;
        }
        
        // Make AJAX request to preview delivery dates
        fetch(`/orders/api/custom-dates/preview?start_date=${startDate}&end_date=${endDate}&custom_dates=${selectedDates.join(',')}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayDeliveryPreview(data);
                } else {
                    console.error('Error previewing dates:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching preview:', error);
            });
    }
    
    function displayDeliveryPreview(data) {
        const previewContainer = document.getElementById('delivery-preview');
        if (!previewContainer) return;
        
        if (data.delivery_dates.length === 0) {
            previewContainer.innerHTML = '<div class="alert alert-warning">No delivery dates found for the selected range.</div>';
            return;
        }
        
        let html = `
            <div class="card mt-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-calendar-check"></i> Delivery Schedule Preview
                        <span class="badge bg-primary ms-2">${data.total_deliveries} deliveries</span>
                    </h6>
                </div>
                <div class="card-body">
                    <p><strong>Selected Days of Month:</strong> ${data.selected_days.join(', ')}</p>
                    <div class="row">
        `;
        
        data.delivery_dates.forEach((date, index) => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            html += `
                <div class="col-md-6 mb-2">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-calendar text-primary me-2"></i>
                        <span>${formattedDate}</span>
                    </div>
                </div>
            `;
            
            // Add line break every 2 items
            if ((index + 1) % 2 === 0) {
                html += '</div><div class="row">';
            }
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        previewContainer.innerHTML = html;
    }
    
    // Quick select preset buttons
    function addPresetButtons() {
        const daySelector = document.getElementById('day-selector');
        if (!daySelector) return;
        
        const presetContainer = document.createElement('div');
        presetContainer.className = 'mb-3';
        presetContainer.innerHTML = `
            <small class="text-muted">Quick Select:</small><br>
            <button type="button" class="btn btn-sm btn-outline-secondary me-1 preset-btn" data-preset="1,15">1st & 15th</button>
            <button type="button" class="btn btn-sm btn-outline-secondary me-1 preset-btn" data-preset="1,10,20">Every 10 days</button>
            <button type="button" class="btn btn-sm btn-outline-secondary me-1 preset-btn" data-preset="6,9,11">6th, 9th & 11th</button>
            <button type="button" class="btn btn-sm btn-outline-secondary preset-btn" onclick="clearAllDates()">Clear All</button>
        `;
        
        daySelector.parentNode.insertBefore(presetContainer, daySelector);
        
        // Add preset button functionality
        document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', function() {
                const preset = this.getAttribute('data-preset');
                if (preset) {
                    selectPresetDates(preset.split(',').map(d => parseInt(d)));
                }
            });
        });
    }
    
    function selectPresetDates(dates) {
        // Clear all selections
        clearAllDates();
        
        // Select preset dates
        dates.forEach(day => {
            const button = document.querySelector(`[data-day="${day}"]`);
            if (button) {
                button.classList.remove('btn-outline-primary');
                button.classList.add('btn-primary');
            }
        });
        
        updateSelectedDates();
        updateDeliveryPreview();
    }
    
    window.clearAllDates = function() {
        document.querySelectorAll('.day-selector-btn').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
        });
        
        updateSelectedDates();
        updateDeliveryPreview();
    };
    
    // Initialize preset buttons if custom dates container exists
    setTimeout(() => {
        if (document.getElementById('custom-dates-container')) {
            addPresetButtons();
        }
    }, 100);
});

// Helper function to format date display
function formatDeliveryDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
}