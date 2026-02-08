const InvoiceState = {
    currency: 'USD',
    currencySymbol: '$',
    items: [],
    taxEnabled: false,
    taxRate: 0,
    
};

const STORAGE_KEYS = {
    CLIENTS: 'vainvoice_saved_clients',
    TEMPLATES: 'vainvoice_saved_templates',
    LAST_INVOICE_NUMBER: 'vainvoice_last_invoice_number',
    INVOICES: 'vainvoice_invoices'
};


document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setTodayDate();
    setupAllEventListeners();
    updatePreview();
    loadLastInvoiceNumber();
    restoreSavedData();
    
    if (window.innerWidth > 1024) {
        document.getElementById('vaName')?.focus();
    }
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    const invoiceDateInput = document.getElementById('invoiceDate');
    const dueDateInput = document.getElementById('dueDate');
    
    if (invoiceDateInput) invoiceDateInput.value = today;
    if (dueDateInput) dueDateInput.value = today;
}

function loadLastInvoiceNumber() {
    const lastNumber = localStorage.getItem(STORAGE_KEYS.LAST_INVOICE_NUMBER);
    if (lastNumber) {
        const nextNumber = parseInt(lastNumber) + 1;
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        if (invoiceNumberInput) {
            invoiceNumberInput.value = `INV-${String(nextNumber).padStart(3, '0')}`;
        }
    }
}

function restoreSavedData() {
    // Restore last used client if exists
    const lastClient = localStorage.getItem('vainvoice_last_client');
    if (lastClient) {
        try {
            const client = JSON.parse(lastClient);
            document.getElementById('clientName').value = client.name || '';
            document.getElementById('clientEmail').value = client.email || '';
            document.getElementById('clientCountry').value = client.country || '';
        } catch (e) {
            
        }
    }
    
    // Restore last used template items if exists
    const lastTemplate = localStorage.getItem('vainvoice_last_template');
    if (lastTemplate) {
        try {
            const template = JSON.parse(lastTemplate);
            const container = document.getElementById('itemsContainer');
            if (container && template.items && template.items.length > 0) {
                // Clear existing items except first one
                const existingItems = container.querySelectorAll('.item-row');
                for (let i = 1; i < existingItems.length; i++) {
                    existingItems[i].remove();
                }
                
                // Load template items
                template.items.forEach((item, index) => {
                    if (index === 0) {
                        const firstRow = document.querySelector('.item-row');
                        if (firstRow) {
                            firstRow.querySelector('.item-description').value = item.description || '';
                            firstRow.querySelector('.item-quantity').value = item.quantity || '1';
                            firstRow.querySelector('.item-price').value = item.price || '0';
                        }
                    } else {
                        addNewItem();
                        const rows = document.querySelectorAll('.item-row');
                        const lastRow = rows[rows.length - 1];
                        lastRow.querySelector('.item-description').value = item.description || '';
                        lastRow.querySelector('.item-quantity').value = item.quantity || '1';
                        lastRow.querySelector('.item-price').value = item.price || '0';
                    }
                });
                calculateTotals();
            }
        } catch (e) {
            
        }
    }
}


function setupAllEventListeners() {
    setupTemplateButtons();
    setupCurrencyButtons();
    setupServicePresets();
    setupFormInputs();
    setupItemCalculations();
    setupAddItemButton();
    setupActionButtons();
    setupModalButtons();
    setupClientManagement();
    setupTemplateManagement();
    setupTaxToggle();
}

function setupTemplateButtons() {
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyTemplate(this.dataset.template);
        });
    });
}

function setupCurrencyButtons() {
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            InvoiceState.currency = this.dataset.currency;
            
            const symbols = {
                'USD': '$',
                'PHP': '₱',
                'EUR': '€',
                'GBP': '£'
            };
            InvoiceState.currencySymbol = symbols[InvoiceState.currency];
            calculateTotals();
        });
    });
}

function setupServicePresets() {
    document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const firstEmpty = Array.from(document.querySelectorAll('.item-description'))
                .find(input => !input.value);
            if (firstEmpty) {
                firstEmpty.value = this.dataset.service;
                firstEmpty.focus();
                updatePreview();
            }
        });
    });
}

function setupFormInputs() {
    const formInputs = document.querySelectorAll('#invoiceForm input, #invoiceForm select, #invoiceForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', updatePreview);
    });
    
    // Auto-save client data
    const clientInputs = ['clientName', 'clientEmail', 'clientCountry'];
    clientInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', saveCurrentClientData);
        }
    });
    
    // Auto-save template data
    setupItemAutoSave();
}

function saveCurrentClientData() {
    const clientData = {
        name: document.getElementById('clientName')?.value || '',
        email: document.getElementById('clientEmail')?.value || '',
        country: document.getElementById('clientCountry')?.value || ''
    };
    localStorage.setItem('vainvoice_last_client', JSON.stringify(clientData));
}

function setupItemAutoSave() {
    // Save items data when they change
    const saveItemsData = () => {
        const items = [];
        document.querySelectorAll('.item-row').forEach(row => {
            const description = row.querySelector('.item-description')?.value;
            const quantity = row.querySelector('.item-quantity')?.value;
            const price = row.querySelector('.item-price')?.value;
            
            if (description) {
                items.push({ description, quantity, price });
            }
        });
        
        if (items.length > 0) {
            localStorage.setItem('vainvoice_last_template', JSON.stringify({ items }));
        }
    };
    
    // Add listeners to all current and future item inputs
    document.addEventListener('input', function(e) {
        if (e.target.matches('.item-description, .item-quantity, .item-price')) {
            saveItemsData();
        }
    });
}

function setupItemCalculations() {
    document.querySelectorAll('.item-quantity, .item-price').forEach(input => {
        input.addEventListener('input', calculateTotals);
    });
}

function setupAddItemButton() {
    const addBtn = document.getElementById('addItemBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addNewItem);
    }
}

function setupActionButtons() {
    document.getElementById('downloadPDFBtn')?.addEventListener('click', downloadPDF);
    document.getElementById('shareInvoiceBtn')?.addEventListener('click', generateShareLink);
    document.getElementById('previewPrintBtn')?.addEventListener('click', printInvoice);
    document.getElementById('clearDataBtn')?.addEventListener('click', clearAllData);
}

function setupModalButtons() {
    document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('modalNewBtn')?.addEventListener('click', function() {
        closeModal();
        resetForm();
    });

    // Share Link Modal
    document.getElementById('closeShareModal')?.addEventListener('click', () => {
        document.getElementById('shareLinkModal').classList.remove('show');
    });
    
    document.getElementById('copyLinkBtn')?.addEventListener('click', copyShareLink);

    // Saved Clients Modal
    document.getElementById('closeSavedClientsModal')?.addEventListener('click', () => {
        document.getElementById('savedClientsModal').classList.remove('show');
    });

    // Saved Templates Modal
    document.getElementById('closeSavedTemplatesModal')?.addEventListener('click', () => {
        document.getElementById('savedTemplatesModal').classList.remove('show');
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

function setupClientManagement() {
    document.getElementById('savedClientsBtn')?.addEventListener('click', showSavedClients);
    document.getElementById('loadClientBtn')?.addEventListener('click', showSavedClients);
    document.getElementById('saveClientBtn')?.addEventListener('click', saveCurrentClient);
}

function setupTemplateManagement() {
    document.getElementById('savedTemplatesBtn')?.addEventListener('click', showSavedTemplates);
    document.getElementById('saveTemplateBtn')?.addEventListener('click', saveCurrentTemplate);
}

function setupTaxToggle() {
    const taxCheckbox = document.getElementById('taxToggle');
    const taxInputGroup = document.getElementById('taxInputSection');
    const taxRateInput = document.getElementById('taxRate');

    taxCheckbox?.addEventListener('change', function() {
        InvoiceState.taxEnabled = this.checked;
        if (taxInputGroup) {
            taxInputGroup.style.display = this.checked ? 'flex' : 'none';
        }
        calculateTotals();
    });

    taxRateInput?.addEventListener('input', function() {
        InvoiceState.taxRate = parseFloat(this.value) || 0;
        calculateTotals();
    });
}

function applyTemplate(template) {
    const firstItem = document.querySelector('.item-description');
    const qtyInput = document.querySelector('.item-quantity');
    
    if (!firstItem || !qtyInput) return;
    
    const templates = {
        'hourly': {
            description: 'Admin Support Services',
            quantity: '40',
            placeholder: 'Admin Support Services'
        },
        'project': {
            description: 'Website Development Project',
            quantity: '1',
            placeholder: 'Project Name'
        },
        'retainer': {
            description: 'Monthly Retainer - ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            quantity: '1',
            placeholder: 'Monthly Retainer'
        }
    };
    
    const selectedTemplate = templates[template];
    if (selectedTemplate) {
        firstItem.value = selectedTemplate.description;
        qtyInput.value = selectedTemplate.quantity;
        firstItem.placeholder = selectedTemplate.placeholder;
        calculateTotals();
    }
}


function calculateTotals() {
    const items = document.querySelectorAll('.item-row');
    let subtotal = 0;

    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.item-quantity')?.value) || 0;
        const price = parseFloat(item.querySelector('.item-price')?.value) || 0;
        const total = quantity * price;
        
        const totalInput = item.querySelector('.item-total');
        if (totalInput) {
            totalInput.value = total.toFixed(2);
        }
        subtotal += total;
    });

    // Calculate tax if enabled
    let taxAmount = 0;
    if (InvoiceState.taxEnabled && InvoiceState.taxRate > 0) {
        taxAmount = subtotal * (InvoiceState.taxRate / 100);
    }

    const grandTotal = subtotal + taxAmount;

    // Update main totals display
    const subtotalEl = document.getElementById('subtotalAmount');
    const taxEl = document.getElementById('taxAmount');
    const taxPercentEl = document.getElementById('taxPercentDisplay');
    const taxRowEl = document.getElementById('taxRow');
    const grandTotalEl = document.getElementById('grandTotal');

    if (subtotalEl) {
        subtotalEl.textContent = `${InvoiceState.currencySymbol}${subtotal.toFixed(2)}`;
    }

    if (InvoiceState.taxEnabled && InvoiceState.taxRate > 0) {
        if (taxEl) taxEl.textContent = `${InvoiceState.currencySymbol}${taxAmount.toFixed(2)}`;
        if (taxPercentEl) taxPercentEl.textContent = InvoiceState.taxRate.toFixed(1);
        if (taxRowEl) taxRowEl.style.display = 'flex';
    } else {
        if (taxRowEl) taxRowEl.style.display = 'none';
    }

    if (grandTotalEl) {
        grandTotalEl.textContent = `${InvoiceState.currencySymbol}${grandTotal.toFixed(2)}`;
    }
    
    updatePreview();
}


function addNewItem() {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'item-row';
    newItem.innerHTML = `
        <div class="form-group">
            <label>Description *</label>
            <input type="text" class="item-description" required placeholder="Service Description">
        </div>
        <div class="form-group">
            <label>Qty/Hours *</label>
            <input type="number" class="item-quantity" value="1" min="0.5" step="0.5" required>
        </div>
        <div class="form-group">
            <label>Rate *</label>
            <input type="number" class="item-price" value="0" min="0" step="0.01" required>
        </div>
        <div class="form-group">
            <label>Amount</label>
            <input type="number" class="item-total" value="0" readonly>
        </div>
        <button type="button" class="remove-btn">Remove</button>
    `;
    
    container.appendChild(newItem);
    
    // Setup event listeners for new item
    const qtyInput = newItem.querySelector('.item-quantity');
    const priceInput = newItem.querySelector('.item-price');
    const descInput = newItem.querySelector('.item-description');
    const removeBtn = newItem.querySelector('.remove-btn');
    
    qtyInput?.addEventListener('input', calculateTotals);
    priceInput?.addEventListener('input', calculateTotals);
    descInput?.addEventListener('input', updatePreview);
    
    removeBtn?.addEventListener('click', function() {
        newItem.remove();
        calculateTotals();
    });
    
    descInput?.focus();
}


function updatePreview() {
    console.log('updatePreview function called');
    // Update basic info
    updateElement('prevInvoiceNumber', 'invoiceNumber');
    updateElement('prevInvoiceDate', 'invoiceDate', formatDate);
    updateElement('prevDueDate', 'dueDate', formatDate);
    
    // Update parties
    updateElement('prevVaName', 'vaName');
    updateElement('prevVaEmail', 'vaEmail');
    updateElement('prevVaPhone', 'vaPhone');
    updateElement('prevVaAddress', 'vaAddress');
    
    updateElement('prevClientName', 'clientName');
    updateElement('prevClientEmail', 'clientEmail');
    updateElement('prevClientCountry', 'clientCountry');
    
    // Update work summary
    const workSummary = document.getElementById('workSummary')?.value;
    const prevWorkSummary = document.getElementById('prevWorkSummary');
    const prevWorkSummaryText = document.getElementById('prevWorkSummaryText');
    
    if (workSummary && workSummary.trim()) {
        if (prevWorkSummary) prevWorkSummary.style.display = 'block';
        if (prevWorkSummaryText) prevWorkSummaryText.textContent = workSummary;
    } else {
        if (prevWorkSummary) prevWorkSummary.style.display = 'none';
    }
    
    // Update payment terms
    const paymentTerms = document.getElementById('paymentTerms')?.value;
    const prevPaymentTerms = document.getElementById('prevPaymentTerms');
    if (prevPaymentTerms) prevPaymentTerms.textContent = paymentTerms;
    
    // Update items table
    updateItemsTable();
    
    // Update totals
    updatePreviewTotals();
    
    // Update notes
    const notes = document.getElementById('paymentNotes')?.value;
    const prevNotes = document.getElementById('prevNotes');
    if (prevNotes) prevNotes.textContent = notes || 'Payment details will appear here...';
}

function updateElement(previewId, inputId, formatter = null) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input && preview) {
        let value = input.value;
        if (formatter) value = formatter(value);
        preview.textContent = value;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function updateItemsTable() {
    const tbody = document.getElementById('prevItemsTable');
    if (!tbody) return;
    
    const items = document.querySelectorAll('.item-row');
    tbody.innerHTML = '';
    
    items.forEach(item => {
        const description = item.querySelector('.item-description')?.value || '';
        const quantity = item.querySelector('.item-quantity')?.value || '0';
        const price = parseFloat(item.querySelector('.item-price')?.value) || 0;
        const total = parseFloat(item.querySelector('.item-total')?.value) || 0;
        
        if (description) {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${description}</td>
                <td style="text-align: center;">${quantity}</td>
                <td class="amount">${InvoiceState.currencySymbol}${price.toFixed(2)}</td>
                <td class="amount">${InvoiceState.currencySymbol}${total.toFixed(2)}</td>
            `;
        }
    });
}

function updatePreviewTotals() {
    const items = document.querySelectorAll('.item-row');
    let subtotal = 0;
    
    items.forEach(item => {
        const total = parseFloat(item.querySelector('.item-total')?.value) || 0;
        subtotal += total;
    });
    
    let taxAmount = 0;
    if (InvoiceState.taxEnabled && InvoiceState.taxRate > 0) {
        taxAmount = subtotal * (InvoiceState.taxRate / 100);
    }
    
    const grandTotal = subtotal + taxAmount;
    
    // Update preview
    const prevSubtotal = document.getElementById('prevSubtotal');
    const prevTax = document.getElementById('prevTax');
    const prevTaxPercent = document.getElementById('prevTaxPercent');
    const prevTaxRow = document.getElementById('prevTaxRow');
    const prevGrandTotal = document.getElementById('prevGrandTotal');
    
    if (prevSubtotal) {
        prevSubtotal.textContent = `${InvoiceState.currencySymbol}${subtotal.toFixed(2)}`;
    }
    
    if (InvoiceState.taxEnabled && InvoiceState.taxRate > 0) {
        if (prevTax) prevTax.textContent = `${InvoiceState.currencySymbol}${taxAmount.toFixed(2)}`;
        if (prevTaxPercent) prevTaxPercent.textContent = InvoiceState.taxRate.toFixed(1);
        if (prevTaxRow) prevTaxRow.style.display = 'flex';
    } else {
        if (prevTaxRow) prevTaxRow.style.display = 'none';
    }
    
    if (prevGrandTotal) {
        prevGrandTotal.textContent = `${InvoiceState.currencySymbol}${grandTotal.toFixed(2)}`;
    }
}


function saveCurrentClient() {
    const clientName = document.getElementById('clientName')?.value;
    const clientEmail = document.getElementById('clientEmail')?.value;
    const clientCountry = document.getElementById('clientCountry')?.value;
    
    if (!clientName) {
        alert('Please enter a client name first.');
        return;
    }
    
    const client = {
        id: Date.now(),
        name: clientName,
        email: clientEmail,
        country: clientCountry,
        currency: InvoiceState.currency,
        savedAt: new Date().toISOString()
    };
    
    const clients = getSavedClients();
    clients.push(client);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    
    showModal('Client Saved!', `${clientName} has been saved to your client list.`);
}

function getSavedClients() {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return saved ? JSON.parse(saved) : [];
}

function showSavedClients() {
    const clients = getSavedClients();
    const modal = document.getElementById('savedClientsModal');
    const listContainer = document.getElementById('savedClientsList');
    
    if (!listContainer) return;
    
    if (clients.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No saved clients yet. Save your first client to get started!</div>';
    } else {
        listContainer.innerHTML = clients.map(client => `
            <div class="saved-item">
                <div class="saved-item-name">${client.name}</div>
                <div class="saved-item-details">
                    ${client.email ? client.email + ' • ' : ''}${client.country || ''} • ${client.currency}
                </div>
                <div class="saved-item-actions">
                    <button class="btn-load" onclick="loadClient(${client.id})">Load</button>
                    <button class="btn-delete" onclick="deleteClient(${client.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    modal?.classList.add('show');
}

function loadClient(clientId) {
    const clients = getSavedClients();
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
        document.getElementById('clientName').value = client.name;
        document.getElementById('clientEmail').value = client.email || '';
        document.getElementById('clientCountry').value = client.country || '';
        
        // Set currency
        const currencyBtn = document.querySelector(`[data-currency="${client.currency}"]`);
        if (currencyBtn) currencyBtn.click();
        
        updatePreview();
        document.getElementById('savedClientsModal')?.classList.remove('show');
    }
}

function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    let clients = getSavedClients();
    clients = clients.filter(c => c.id !== clientId);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    showSavedClients(); // Refresh the list
}


function saveCurrentTemplate() {
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const description = row.querySelector('.item-description')?.value;
        const quantity = row.querySelector('.item-quantity')?.value;
        const price = row.querySelector('.item-price')?.value;
        
        if (description) {
            items.push({ description, quantity, price });
        }
    });
    
    if (items.length === 0) {
        alert('Please add at least one line item to save as a template.');
        return;
    }
    
    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;
    
    // Ask for category
    const categories = ['Web Development', 'Design', 'Marketing', 'Admin Support', 'Writing', 'Consulting', 'Other'];
    const categorySelect = prompt(`Select a category:\n${categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}\n\nEnter number (1-${categories.length}):`);
    
    let selectedCategory = 'Other';
    if (categorySelect) {
        const catIndex = parseInt(categorySelect) - 1;
        if (catIndex >= 0 && catIndex < categories.length) {
            selectedCategory = categories[catIndex];
        }
    }
    
    const template = {
        id: Date.now(),
        name: templateName,
        category: selectedCategory,
        items: items,
        savedAt: new Date().toISOString()
    };
    
    const templates = getSavedTemplates();
    templates.push(template);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    
    showModal('Template Saved!', `"${templateName}" has been saved to your templates.`);
}

function getSavedTemplates() {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return saved ? JSON.parse(saved) : [];
}

function showSavedTemplates() {
    const templates = getSavedTemplates();
    const modal = document.getElementById('savedTemplatesModal');
    const listContainer = document.getElementById('savedTemplatesList');
    
    if (!listContainer) return;
    
    if (templates.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No saved templates yet. Create your first template to speed up invoicing!</div>';
    } else {
        // Group templates by category
        const templatesByCategory = templates.reduce((groups, template) => {
            const category = template.category || 'Other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(template);
            return groups;
        }, {});
        
        // Sort categories alphabetically
        const sortedCategories = Object.keys(templatesByCategory).sort();
        
        // Generate HTML with category sections
        listContainer.innerHTML = sortedCategories.map(category => `
            <div class="template-category">
                <h3 class="category-title">${category}</h3>
                <div class="category-items">
                    ${templatesByCategory[category].map(template => `
                        <div class="saved-item">
                            <div class="saved-item-name">${template.name}</div>
                            <div class="saved-item-details">
                                ${template.items.length} line item${template.items.length > 1 ? 's' : ''}
                            </div>
                            <div class="saved-item-actions">
                                <button class="btn-load" onclick="loadTemplate(${template.id})">Load</button>
                                <button class="btn-delete" onclick="deleteTemplate(${template.id})">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
    
    modal?.classList.add('show');
}

function loadTemplate(templateId) {
    const templates = getSavedTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
        const container = document.getElementById('itemsContainer');
        if (!container) return;
        
        // Clear existing items
        container.innerHTML = '';
        
        // Add template items
        template.items.forEach((item, index) => {
            if (index === 0) {
                // Use first item slot
                const firstRow = document.querySelector('.item-row');
                if (firstRow) {
                    firstRow.querySelector('.item-description').value = item.description;
                    firstRow.querySelector('.item-quantity').value = item.quantity;
                    firstRow.querySelector('.item-price').value = item.price;
                }
            } else {
                addNewItem();
                const rows = document.querySelectorAll('.item-row');
                const lastRow = rows[rows.length - 1];
                lastRow.querySelector('.item-description').value = item.description;
                lastRow.querySelector('.item-quantity').value = item.quantity;
                lastRow.querySelector('.item-price').value = item.price;
            }
        });
        
        calculateTotals();
        document.getElementById('savedTemplatesModal')?.classList.remove('show');
    }
}

function deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    let templates = getSavedTemplates();
    templates = templates.filter(t => t.id !== templateId);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    showSavedTemplates(); // Refresh the list
}


function collectInvoiceData() {
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const description = row.querySelector('.item-description')?.value || '';
        const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const amount = parseFloat(row.querySelector('.item-total')?.value) || 0;
        
        if (description) {
            items.push({ description, quantity, price, amount });
        }
    });
    
    let subtotal = 0;
    items.forEach(item => subtotal += item.amount);
    
    let taxAmount = 0;
    if (InvoiceState.taxEnabled && InvoiceState.taxRate > 0) {
        taxAmount = subtotal * (InvoiceState.taxRate / 100);
    }
    
    const total = subtotal + taxAmount;
    
    return {
        invoiceNumber: document.getElementById('invoiceNumber')?.value || '',
        invoiceDate: document.getElementById('invoiceDate')?.value || '',
        dueDate: document.getElementById('dueDate')?.value || '',
        vaName: document.getElementById('vaName')?.value || '',
        vaEmail: document.getElementById('vaEmail')?.value || '',
        vaPhone: document.getElementById('vaPhone')?.value || '',
        vaAddress: document.getElementById('vaAddress')?.value || '',
        clientName: document.getElementById('clientName')?.value || '',
        clientEmail: document.getElementById('clientEmail')?.value || '',
        clientCountry: document.getElementById('clientCountry')?.value || '',
        paymentTerms: document.getElementById('paymentTerms')?.value || '',
        workSummary: document.getElementById('workSummary')?.value || '',
        notes: document.getElementById('paymentNotes')?.value || '',
        items: items,
        currency: InvoiceState.currencySymbol,
        subtotal: `${InvoiceState.currencySymbol}${subtotal.toFixed(2)}`,
        taxEnabled: InvoiceState.taxEnabled,
        taxRate: InvoiceState.taxRate,
        taxAmount: `${InvoiceState.currencySymbol}${taxAmount.toFixed(2)}`,
        total: `${InvoiceState.currencySymbol}${total.toFixed(2)}`
    };
}

function downloadPDF() {
    const data = collectInvoiceData();
    
    if (!data.vaName || !data.clientName) {
        alert('Please fill in your name and client name before downloading.');
        return;
    }
    
    // Generate HTML content matching the preview layout
    const pdfContent = generatePDFContent(data, false);
    
    // Create a hidden iframe for PDF generation
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '210mm'; // A4 width
    iframe.style.height = '297mm'; // A4 height
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(pdfContent);
    iframeDoc.close();
    
    // Wait for content to load, then trigger print to PDF
    setTimeout(() => {
        iframe.contentWindow.print();
        
        // Remove iframe after print dialog closes
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 1000);
    
    // Save invoice number
    saveInvoiceNumber(data.invoiceNumber);
    
    showModal('PDF Ready!', 'Use your browser\'s "Save as PDF" option to download the invoice.');
}

function printCurrentInvoice() {
    const data = collectInvoiceData();
    
    if (!data.vaName || !data.clientName) {
        alert('Please fill in your name and client name before printing.');
        return;
    }
    
    const pdfContent = generatePDFContent(data, true); // Auto-print for print button
    
    // Create a hidden iframe and trigger print dialog
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(pdfContent);
    iframeDoc.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
        iframe.contentWindow.print();
        
        // Remove iframe after print dialog closes
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
    
    // Save invoice number
    saveInvoiceNumber(data.invoiceNumber);
}

function generatePDFContent(data, autoPrint = false) {
    const workSummaryHTML = data.workSummary ? `
        <div style="margin: 20px 0; padding: 15px; background: #F9FAFB; border-left: 3px solid #6366F1; border-radius: 0 8px 8px 0;">
            <strong style="display: block; margin-bottom: 8px; font-size: 14px; color: #374151;">Work Summary:</strong>
            <p style="font-size: 14px; color: #4B5563; line-height: 1.5; margin: 0; white-space: pre-line;">${data.workSummary}</p>
        </div>
    ` : '';
    
    const taxRowHTML = data.taxEnabled ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
            <span>Tax (${data.taxRate}%):</span>
            <span>${data.taxAmount}</span>
        </div>
    ` : '';
    
    const autoPrintScript = autoPrint ? `
    <script>
        window.onload = function() {
            setTimeout(() => window.print(), 250);
        };
    </script>` : '';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        @page { margin: 40px; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            margin: 0; 
            padding: 40px;
            position: relative;
        }
        .header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px; 
            padding-bottom: 20px; 
            border-bottom: 3px solid #6366F1; 
        }
        .title { font-size: 36px; font-weight: bold; color: #6366F1; }
        .meta { text-align: right; font-size: 14px; }
        .meta > div { margin-bottom: 4px; }
        .parties { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin: 30px 0; 
        }
        .party h3 { 
            font-size: 12px; 
            text-transform: uppercase; 
            color: #6B7280; 
            margin-bottom: 10px; 
            font-weight: 600;
            letter-spacing: 0.05em;
        }
        .party-info { font-size: 14px; line-height: 1.8; }
        .party-info .name { font-weight: 600; font-size: 16px; color: #111827; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        th { 
            background: #F9FAFB; 
            padding: 12px; 
            text-align: left; 
            font-weight: 600; 
            border-bottom: 2px solid #6366F1; 
            font-size: 14px;
            color: #374151;
        }
        td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
        .amount { text-align: right; font-weight: 500; }
        .totals { 
            text-align: right; 
            margin-top: 20px;
            min-width: 300px;
            margin-left: auto;
        }
        .totals > div {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }
        .grand-total { 
            font-size: 24px; 
            font-weight: bold; 
            color: #6366F1; 
            margin-top: 10px; 
            padding-top: 10px; 
            border-top: 2px solid #6366F1; 
        }
        .notes { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #E5E7EB; 
        }
        .notes strong {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            color: #374151;
        }
        .notes p {
            font-size: 14px;
            color: #4B5563;
            line-height: 1.6;
            white-space: pre-line;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">INVOICE</div>
        <div class="meta">
            <div><strong>Invoice #:</strong> ${data.invoiceNumber}</div>
            <div><strong>Date:</strong> ${formatDate(data.invoiceDate)}</div>
            <div><strong>Due Date:</strong> ${formatDate(data.dueDate)}</div>
        </div>
    </div>

    <div class="parties">
        <div class="party">
            <h3>From</h3>
            <div class="party-info">
                <div class="name">${data.vaName}</div>
                ${data.vaEmail ? `<div>${data.vaEmail}</div>` : ''}
                ${data.vaPhone ? `<div>${data.vaPhone}</div>` : ''}
                ${data.vaAddress ? `<div>${data.vaAddress}</div>` : ''}
            </div>
        </div>
        <div class="party">
            <h3>Bill To</h3>
            <div class="party-info">
                <div class="name">${data.clientName}</div>
                ${data.clientEmail ? `<div>${data.clientEmail}</div>` : ''}
                ${data.clientCountry ? `<div>${data.clientCountry}</div>` : ''}
            </div>
        </div>
    </div>

    ${workSummaryHTML}

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align: center;">Qty/Hours</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${data.items.map(item => `
            <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td class="amount">${data.currency}${item.price.toFixed(2)}</td>
                <td class="amount">${data.currency}${item.amount.toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div>
            <span>Subtotal:</span>
            <span>${data.subtotal}</span>
        </div>
        ${taxRowHTML}
        <div class="grand-total">
            <span>TOTAL:</span>
            <span>${data.total}</span>
        </div>
        <div style="margin-top: 10px; font-size: 14px;">
            <span>Payment Terms:</span>
            <span>${data.paymentTerms}</span>
        </div>
    </div>

    <div class="notes">
        <strong>Payment Instructions:</strong>
        <p>${data.notes}</p>
    </div>
    ${autoPrintScript}
</body>
</html>`;
}

function generateShareLink() {
    const data = collectInvoiceData();
    
    if (!data.vaName || !data.clientName) {
        alert('Please fill in your name and client name before generating a share link.');
        return;
    }
    
    // Save invoice to local storage
    const invoiceId = 'INV_' + Date.now();
    const invoices = getStoredInvoices();
    invoices.push({ id: invoiceId, data: data, createdAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    
    // Generate shareable link (in production, this would be a real URL)
    const shareUrl = `${window.location.origin}${window.location.pathname}?invoice=${invoiceId}`;
    
    // Show modal with link
    const modal = document.getElementById('shareLinkModal');
    const input = document.getElementById('shareLinkInput');
    if (input) input.value = shareUrl;
    modal?.classList.add('show');
    
    // Save invoice number
    saveInvoiceNumber(data.invoiceNumber);
}

function getStoredInvoices() {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return saved ? JSON.parse(saved) : [];
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    if (input) {
        input.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyLinkBtn');
        const originalText = btn?.textContent;
        if (btn) {
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    }
}

function saveInvoiceNumber(invoiceNumber) {
    // Extract number from invoice number (e.g., "INV-001" -> 1)
    const match = invoiceNumber.match(/(\d+)$/);
    if (match) {
        localStorage.setItem(STORAGE_KEYS.LAST_INVOICE_NUMBER, match[1]);
    }
}

function printInvoice() {
    window.print();
}


function showModal(title, message) {
    const modal = document.getElementById('successModal');
    const modalTitle = modal?.querySelector('.modal-title');
    const modalMessage = document.getElementById('modalMessage');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    modal?.classList.add('show');
}

function closeModal() {
    document.getElementById('successModal')?.classList.remove('show');
}


function resetForm() {
    document.getElementById('invoiceForm')?.reset();
    setTodayDate();
    loadLastInvoiceNumber();
    
    const container = document.getElementById('itemsContainer');
    if (container) {
        container.innerHTML = `
            <div class="item-row">
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" class="item-description" required placeholder="Service Description">
                </div>
                <div class="form-group">
                    <label>Qty/Hours *</label>
                    <input type="number" class="item-quantity" value="1" min="0.5" step="0.5" required>
                </div>
                <div class="form-group">
                    <label>Rate *</label>
                    <input type="number" class="item-price" value="0" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" class="item-total" value="0" readonly>
                </div>
            </div>
        `;
        
        setupItemCalculations();
    }
    
    // Reset tax
    InvoiceState.taxEnabled = false;
    InvoiceState.taxRate = 0;
    document.getElementById('taxToggle').checked = false;
    document.getElementById('taxInputSection').style.display = 'none';
    
    calculateTotals();
}

function clearAllData() {
    const confirmClear = confirm('Are you sure you want to clear all saved data? This will remove:\n\n• Saved clients\n• Saved templates\n• Last used client data\n• Last used template data\n• Invoice history\n\nThis action cannot be undone.');
    
    if (confirmClear) {
        // Clear all localStorage data related to the app
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Clear auto-save data
        localStorage.removeItem('vainvoice_last_client');
        localStorage.removeItem('vainvoice_last_template');
        
        // Reset the form to clear current data
        resetForm();
        
        showModal('Data Cleared!', 'All saved data has been successfully removed.');
    }
}


function checkForSharedInvoice() {
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('invoice');
    
    if (invoiceId) {
        const invoices = getStoredInvoices();
        const invoice = invoices.find(inv => inv.id === invoiceId);
        
        if (invoice) {
            // Display invoice in read-only mode
            displaySharedInvoice(invoice.data);
        }
    }
}

function displaySharedInvoice(data) {
    // Hide form, show only preview
    const formSection = document.querySelector('.form-section');
    const previewSection = document.querySelector('.preview-section');
    
    if (formSection) formSection.style.display = 'none';
    if (previewSection) {
        previewSection.style.gridColumn = '1 / -1';
        previewSection.style.maxWidth = '800px';
        previewSection.style.margin = '0 auto';
    }
    
    // Populate preview with invoice data
    // (This would populate all the preview fields with the shared invoice data)
    
}

if (window.location.search.includes('invoice=')) {
    checkForSharedInvoice();
}