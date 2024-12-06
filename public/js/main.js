/**
 * Smart Inventory Manager - Main JavaScript
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('✓ Smart Inventory Manager loaded');
    
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
    
    // Mobile sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
    
    // Global search functionality
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = globalSearch.value.trim();
                if (query) {
                    window.location.href = `/products?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    
    // Product table search
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.data-table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
    
    // Confirm delete actions
    const deleteForms = document.querySelectorAll('form[action*="DELETE"]');
    deleteForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
    });
    
    // Filter chips toggle
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });
    
    // Form validation feedback
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (!input.value.trim()) {
                    input.classList.add('is-invalid');
                } else {
                    input.classList.remove('is-invalid');
                }
            });
            
            input.addEventListener('input', () => {
                if (input.value.trim()) {
                    input.classList.remove('is-invalid');
                }
            });
        });
    });
    
    // Number input formatting
    const priceInputs = document.querySelectorAll('input[name="price"]');
    priceInputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value) {
                input.value = parseFloat(input.value).toFixed(2);
            }
        });
    });

    // ==========================================
    // AI Description Generator
    // ==========================================
    const aiGenerateBtn = document.getElementById('aiGenerateBtn');
    if (aiGenerateBtn) {
        aiGenerateBtn.addEventListener('click', async function() {
            const nameInput = document.getElementById('name');
            const categorySelect = document.getElementById('category_id');
            const descriptionField = document.getElementById('description');
            const aiStatus = document.getElementById('aiStatus');
            const btn = this;
            
            // Get values
            const name = nameInput?.value?.trim() || '';
            const category = categorySelect?.selectedOptions[0]?.text || '';
            
            // Validate product name
            if (!name) {
                alert('Please enter a product name first');
                nameInput?.focus();
                return;
            }
            
            // UI Feedback: Show loading state
            btn.disabled = true;
            btn.innerHTML = '⏳ Generating...';
            if (aiStatus) aiStatus.classList.remove('hidden');
            
            try {
                // Fetch: Send POST request to API
                const response = await fetch('/api/ai/generate-desc', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        category: category !== '-- Select Category --' ? category : ''
                    })
                });
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned non-JSON response. Please try again.');
                }
                
                const data = await response.json();
                
                if (response.ok && data.description) {
                    // Success: Update textarea with returned text
                    descriptionField.value = data.description;
                    console.log('AI Description generated:', data.source);
                } else {
                    throw new Error(data.error || 'Failed to generate description');
                }
                
            } catch (error) {
                console.error('AI generation failed:', error);
                // Error: Show browser alert with specific message
                alert(error.message || 'Failed to generate description. Please try again.');
            } finally {
                // Reset button and hide status
                btn.disabled = false;
                btn.innerHTML = '✨ Auto-Write with AI';
                if (aiStatus) aiStatus.classList.add('hidden');
            }
        });
    }

    // ==========================================
    // AI Pricing Advisor
    // ==========================================
    const aiPriceBtn = document.getElementById('aiPriceBtn');
    if (aiPriceBtn) {
        aiPriceBtn.addEventListener('click', async function() {
            const nameInput = document.getElementById('name');
            const categorySelect = document.getElementById('category_id');
            const costPriceInput = document.getElementById('cost_price');
            const priceInput = document.getElementById('price');
            const statusDiv = document.getElementById('priceAiStatus');
            const suggestionDiv = document.getElementById('priceSuggestion');
            const btn = this;
            
            // Get values
            const name = nameInput?.value?.trim() || '';
            const category = categorySelect?.selectedOptions[0]?.text || '';
            const costPrice = costPriceInput?.value || '';
            
            // Validate inputs
            if (!name) {
                alert('Please enter a product name first');
                nameInput?.focus();
                return;
            }
            
            if (!costPrice || parseFloat(costPrice) <= 0) {
                alert('Please enter your cost price first (what you paid for the product)');
                costPriceInput?.focus();
                return;
            }
            
            // UI Feedback: Show loading state
            btn.disabled = true;
            btn.innerHTML = '💡 Thinking...';
            if (statusDiv) {
                statusDiv.classList.remove('hidden');
            }
            if (suggestionDiv) {
                suggestionDiv.classList.add('hidden');
            }
            
            try {
                // Fetch: Send POST request to API
                const response = await fetch('/api/ai/suggest-price', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        category: category !== '-- Select Category --' ? category : '',
                        costPrice: costPrice
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.suggestion) {
                    // Hide loading status
                    if (statusDiv) {
                        statusDiv.classList.add('hidden');
                    }
                    
                    // Show suggestion
                    if (suggestionDiv) {
                        suggestionDiv.innerHTML = `
                            <div class="suggestion-content">
                                <span class="suggestion-icon">💡</span>
                                <div class="suggestion-text">
                                    <p>${data.suggestion}</p>
                                    ${data.suggestedPrice ? `<button type="button" class="btn btn-sm btn-primary apply-price-btn" data-price="${data.suggestedPrice}">Apply $${data.suggestedPrice.toFixed(2)}</button>` : ''}
                                </div>
                            </div>
                        `;
                        suggestionDiv.classList.remove('hidden');
                        
                        // Add click handler for apply button
                        const applyBtn = suggestionDiv.querySelector('.apply-price-btn');
                        if (applyBtn) {
                            applyBtn.addEventListener('click', function() {
                                const suggestedPrice = this.getAttribute('data-price');
                                if (priceInput && suggestedPrice) {
                                    priceInput.value = parseFloat(suggestedPrice).toFixed(2);
                                    suggestionDiv.classList.add('hidden');
                                }
                            });
                        }
                    }
                } else {
                    throw new Error(data.error || 'Failed to get price suggestion');
                }
                
            } catch (error) {
                console.error('AI pricing failed:', error);
                if (statusDiv) {
                    statusDiv.classList.add('hidden');
                }
                alert(error.message || 'Failed to get price suggestion. Please try again.');
            } finally {
                // Reset button
                btn.disabled = false;
                btn.innerHTML = '💡 Suggest Price';
            }
        });
    }

    // ==========================================
    // Flash Message Logic (Alert Close)
    // ==========================================
    document.querySelectorAll('.alert-close').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove the parent element from the DOM
            this.parentElement?.remove();
        });
    });
});
