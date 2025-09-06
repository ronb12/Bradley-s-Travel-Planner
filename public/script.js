// Bradley's Travel Planner - Main JavaScript File
// By Bradley Virtual Solutions, LLC

class TravelPlanner {
    constructor() {
        this.trips = this.loadTrips();
        this.settings = this.loadSettings();
        this.packingLists = this.loadPackingLists();
        this.documents = this.loadDocuments();
        this.currentTripId = null;
        this.currentMonth = new Date();
        this.searchQuery = '';
        this.activeFilter = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDashboard();
        this.updateTripsDisplay();
        this.updateBudgetDisplay();
        this.setMinDate();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Form submission
        document.getElementById('create-trip-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTrip(e);
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // Navigation
    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Update specific sections
        if (sectionName === 'trips') {
            this.updateTripsDisplay();
        } else if (sectionName === 'budget') {
            this.updateBudgetDisplay();
        }
    }

    // Trip Management
    createTrip(event) {
        const formData = new FormData(event.target);
        const trip = {
            id: this.generateId(),
            name: document.getElementById('trip-name').value,
            destination: document.getElementById('destination').value,
            type: document.getElementById('trip-type').value,
            startDate: document.getElementById('start-date').value,
            endDate: document.getElementById('end-date').value,
            budget: parseFloat(document.getElementById('budget').value) || 0,
            notes: document.getElementById('notes').value,
            createdAt: new Date().toISOString(),
            expenses: [],
            itinerary: []
        };

        this.trips.push(trip);
        this.saveTrips();
        this.closeCreateTripModal();
        this.updateDashboard();
        this.updateTripsDisplay();
        this.updateBudgetDisplay();
        this.showNotification('Trip created successfully!', 'success');
    }

    deleteTrip(tripId) {
        if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
            this.trips = this.trips.filter(trip => trip.id !== tripId);
            this.saveTrips();
            this.updateDashboard();
            this.updateTripsDisplay();
            this.updateBudgetDisplay();
            this.showNotification('Trip deleted successfully!', 'success');
        }
    }

    editTrip(tripId) {
        const trip = this.trips.find(t => t.id === tripId);
        if (!trip) return;

        // Populate form with trip data
        document.getElementById('trip-name').value = trip.name;
        document.getElementById('destination').value = trip.destination;
        document.getElementById('trip-type').value = trip.type;
        document.getElementById('start-date').value = trip.startDate;
        document.getElementById('end-date').value = trip.endDate;
        document.getElementById('budget').value = trip.budget;
        document.getElementById('notes').value = trip.notes;

        // Update form to edit mode
        const form = document.getElementById('create-trip-form');
        form.dataset.editMode = 'true';
        form.dataset.tripId = tripId;

        // Update modal title
        document.querySelector('#create-trip-modal .modal-header h3').textContent = 'Edit Trip';

        this.showCreateTripModal();
    }

    updateTrip(tripId, updatedData) {
        const tripIndex = this.trips.findIndex(trip => trip.id === tripId);
        if (tripIndex !== -1) {
            this.trips[tripIndex] = { ...this.trips[tripIndex], ...updatedData };
            this.saveTrips();
            this.updateDashboard();
            this.updateTripsDisplay();
            this.updateBudgetDisplay();
        }
    }

    // Dashboard Updates
    updateDashboard() {
        const upcomingTrips = this.getUpcomingTrips();
        const totalBudget = this.calculateTotalBudget();
        
        document.getElementById('upcoming-count').textContent = 
            `${upcomingTrips.length} trip${upcomingTrips.length !== 1 ? 's' : ''} planned`;
        document.getElementById('total-budget').textContent = this.formatCurrency(totalBudget);
        
        this.updateRecentTrips();
    }

    updateRecentTrips() {
        const recentTrips = this.trips
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);

        const container = document.getElementById('recent-trips-list');
        
        if (recentTrips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marked-alt"></i>
                    <h3>No trips yet</h3>
                    <p>Create your first trip to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentTrips.map(trip => `
            <div class="trip-item">
                <div class="trip-item-info">
                    <h4>${trip.name}</h4>
                    <p>${trip.destination} • ${this.formatDate(trip.startDate)}</p>
                </div>
                <div class="trip-item-actions">
                    <button class="btn btn-secondary" onclick="travelPlanner.viewTrip('${trip.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary" onclick="travelPlanner.editTrip('${trip.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Trips Display
    updateTripsDisplay() {
        const container = document.getElementById('trips-grid');
        
        if (this.trips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marked-alt"></i>
                    <h3>No trips planned</h3>
                    <p>Start planning your next adventure by creating a new trip!</p>
                    <button class="btn btn-primary" onclick="travelPlanner.showCreateTripModal()">
                        Create Your First Trip
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.trips.map(trip => `
            <div class="trip-card">
                <div class="trip-header">
                    <div class="trip-title">${trip.name}</div>
                    <div class="trip-destination">${trip.destination}</div>
                </div>
                <div class="trip-body">
                    <div class="trip-dates">
                        <span><i class="fas fa-calendar-alt"></i> ${this.formatDate(trip.startDate)}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${this.formatDate(trip.endDate)}</span>
                    </div>
                    <div class="trip-budget">
                        <i class="fas fa-dollar-sign"></i> ${this.formatCurrency(trip.budget)}
                    </div>
                    <div class="trip-actions">
                        <button class="btn btn-secondary" onclick="travelPlanner.viewTrip('${trip.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-primary" onclick="travelPlanner.editTrip('${trip.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="travelPlanner.deleteTrip('${trip.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    viewTrip(tripId) {
        const trip = this.trips.find(t => t.id === tripId);
        if (!trip) return;

        this.currentTripId = tripId;
        this.showTripDetailsModal(trip);
    }

    showTripDetailsModal(trip) {
        const modal = document.getElementById('trip-details-modal');
        const title = document.getElementById('trip-details-title');
        const content = document.getElementById('trip-details-content');

        title.textContent = trip.name;
        
        const totalExpenses = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remainingBudget = trip.budget - totalExpenses;

        content.innerHTML = `
            <div class="trip-details">
                <div class="trip-info-grid">
                    <div class="info-card">
                        <h4><i class="fas fa-map-marker-alt"></i> Destination</h4>
                        <p>${trip.destination}</p>
                    </div>
                    <div class="info-card">
                        <h4><i class="fas fa-tag"></i> Type</h4>
                        <p>${trip.type.charAt(0).toUpperCase() + trip.type.slice(1)}</p>
                    </div>
                    <div class="info-card">
                        <h4><i class="fas fa-calendar-alt"></i> Duration</h4>
                        <p>${this.calculateDuration(trip.startDate, trip.endDate)} days</p>
                    </div>
                    <div class="info-card">
                        <h4><i class="fas fa-dollar-sign"></i> Budget</h4>
                        <p>${this.formatCurrency(trip.budget)}</p>
                    </div>
                </div>

                <div class="budget-breakdown">
                    <h4>Budget Breakdown</h4>
                    <div class="budget-summary">
                        <div class="budget-item">
                            <span>Total Budget</span>
                            <span>${this.formatCurrency(trip.budget)}</span>
                        </div>
                        <div class="budget-item">
                            <span>Total Spent</span>
                            <span class="spent">${this.formatCurrency(totalExpenses)}</span>
                        </div>
                        <div class="budget-item">
                            <span>Remaining</span>
                            <span class="remaining">${this.formatCurrency(remainingBudget)}</span>
                        </div>
                    </div>
                </div>

                <div class="expenses-section">
                    <h4>Expenses</h4>
                    <div class="add-expense">
                        <input type="text" id="expense-description" placeholder="Expense description">
                        <input type="number" id="expense-amount" placeholder="Amount" step="0.01">
                        <button class="btn btn-primary" onclick="travelPlanner.addExpense('${trip.id}')">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                    <div class="expenses-list">
                        ${trip.expenses.map(expense => `
                            <div class="expense-item">
                                <span>${expense.description}</span>
                                <span>${this.formatCurrency(expense.amount)}</span>
                                <button class="btn btn-danger btn-sm" onclick="travelPlanner.removeExpense('${trip.id}', '${expense.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${trip.notes ? `
                    <div class="notes-section">
                        <h4>Notes</h4>
                        <p>${trip.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;

        modal.classList.add('active');
    }

    addExpense(tripId) {
        const description = document.getElementById('expense-description').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);

        if (!description || isNaN(amount) || amount <= 0) {
            this.showNotification('Please enter a valid description and amount', 'error');
            return;
        }

        const trip = this.trips.find(t => t.id === tripId);
        if (!trip) return;

        const expense = {
            id: this.generateId(),
            description,
            amount,
            date: new Date().toISOString()
        };

        trip.expenses.push(expense);
        this.saveTrips();
        this.showTripDetailsModal(trip);
        this.updateBudgetDisplay();
        this.showNotification('Expense added successfully!', 'success');
    }

    removeExpense(tripId, expenseId) {
        const trip = this.trips.find(t => t.id === tripId);
        if (!trip) return;

        trip.expenses = trip.expenses.filter(expense => expense.id !== expenseId);
        this.saveTrips();
        this.showTripDetailsModal(trip);
        this.updateBudgetDisplay();
        this.showNotification('Expense removed successfully!', 'success');
    }

    // Budget Management
    updateBudgetDisplay() {
        const totalBudget = this.calculateTotalBudget();
        const totalSpent = this.calculateTotalSpent();
        const remaining = totalBudget - totalSpent;

        document.getElementById('total-budget-amount').textContent = this.formatCurrency(totalBudget);
        document.getElementById('total-spent-amount').textContent = this.formatCurrency(totalSpent);
        document.getElementById('remaining-budget-amount').textContent = this.formatCurrency(remaining);

        this.updateBudgetBreakdown();
    }

    updateBudgetBreakdown() {
        const container = document.getElementById('budget-breakdown-list');
        
        if (this.trips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calculator"></i>
                    <h3>No trips to track</h3>
                    <p>Create a trip to start tracking your budget!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.trips.map(trip => {
            const spent = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
            const remaining = trip.budget - spent;
            
            return `
                <div class="budget-item">
                    <div class="budget-item-name">${trip.name}</div>
                    <div class="budget-item-amount">
                        ${this.formatCurrency(spent)} / ${this.formatCurrency(trip.budget)}
                        <span class="remaining">(${this.formatCurrency(remaining)} remaining)</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Settings Management
    updateCurrency(currency) {
        this.settings.currency = currency;
        this.saveSettings();
        this.updateBudgetDisplay();
        this.updateTripsDisplay();
        this.updateDashboard();
        this.showNotification('Currency updated successfully!', 'success');
    }

    exportData() {
        const data = {
            trips: this.trips,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `travel-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully!', 'success');
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.trips = [];
            this.settings = this.getDefaultSettings();
            this.saveTrips();
            this.saveSettings();
            this.updateDashboard();
            this.updateTripsDisplay();
            this.updateBudgetDisplay();
            this.showNotification('All data cleared successfully!', 'success');
        }
    }

    // Utility Functions
    calculateTotalBudget() {
        return this.trips.reduce((sum, trip) => sum + trip.budget, 0);
    }

    calculateTotalSpent() {
        return this.trips.reduce((sum, trip) => {
            return sum + trip.expenses.reduce((expenseSum, expense) => expenseSum + expense.amount, 0);
        }, 0);
    }

    getUpcomingTrips() {
        const today = new Date();
        return this.trips.filter(trip => new Date(trip.startDate) >= today);
    }

    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    formatCurrency(amount) {
        const currency = this.settings.currency || 'USD';
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'CAD': 'C$'
        };
        
        return `${symbols[currency]}${amount.toFixed(2)}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start-date').min = today;
        document.getElementById('end-date').min = today;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Modal Management
    showCreateTripModal() {
        document.getElementById('create-trip-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeCreateTripModal() {
        document.getElementById('create-trip-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Reset form
        document.getElementById('create-trip-form').reset();
        document.getElementById('create-trip-form').removeAttribute('data-edit-mode');
        document.getElementById('create-trip-form').removeAttribute('data-trip-id');
        document.querySelector('#create-trip-modal .modal-header h3').textContent = 'Create New Trip';
    }

    closeTripDetailsModal() {
        document.getElementById('trip-details-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        this.currentTripId = null;
    }

    closeAllModals() {
        this.closeCreateTripModal();
        this.closeTripDetailsModal();
    }

    // Data Persistence
    loadTrips() {
        try {
            const trips = localStorage.getItem('travelPlannerTrips');
            return trips ? JSON.parse(trips) : [];
        } catch (error) {
            console.error('Error loading trips:', error);
            return [];
        }
    }

    saveTrips() {
        try {
            localStorage.setItem('travelPlannerTrips', JSON.stringify(this.trips));
        } catch (error) {
            console.error('Error saving trips:', error);
        }
    }

    loadSettings() {
        try {
            const settings = localStorage.getItem('travelPlannerSettings');
            return settings ? JSON.parse(settings) : this.getDefaultSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('travelPlannerSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    getDefaultSettings() {
        return {
            currency: 'USD',
            theme: 'light'
        };
    }
}

// Global functions for HTML onclick handlers
let travelPlanner;

function showSection(sectionName) {
    travelPlanner.showSection(sectionName);
}

function showCreateTripModal() {
    travelPlanner.showCreateTripModal();
}

function closeCreateTripModal() {
    travelPlanner.closeCreateTripModal();
}

function closeTripDetailsModal() {
    travelPlanner.closeTripDetailsModal();
}

function createTrip(event) {
    travelPlanner.createTrip(event);
}

function updateCurrency(currency) {
    travelPlanner.updateCurrency(currency);
}

function exportData() {
    travelPlanner.exportData();
}

function clearAllData() {
    travelPlanner.clearAllData();
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    travelPlanner = new TravelPlanner();
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .trip-details {
            padding: 2rem;
        }
        
        .trip-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .info-card {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
        }
        
        .info-card h4 {
            margin-bottom: 0.5rem;
            color: #667eea;
            font-size: 0.9rem;
        }
        
        .info-card p {
            font-weight: 600;
            color: #333;
        }
        
        .add-expense {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        
        .add-expense input {
            flex: 1;
            min-width: 200px;
        }
        
        .expenses-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .expense-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .expense-item span:first-child {
            font-weight: 500;
        }
        
        .expense-item span:nth-child(2) {
            color: #667eea;
            font-weight: 600;
        }
        
        .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
        }
        
        .notes-section {
            margin-top: 2rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .notes-section h4 {
            margin-bottom: 0.5rem;
            color: #333;
        }
        
        .notes-section p {
            color: #666;
            line-height: 1.6;
        }
    `;
    document.head.appendChild(style);
});
