// Bradley's Travel Planner - Main JavaScript File
// By Bradley Virtual Solutions, LLC

// Global variable for TravelPlanner instance
let travelPlanner;

// Import Firebase Auth functions
import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class TravelPlanner {
    constructor() {
        this.trips = this.loadTrips();
        this.settings = this.loadSettings();
        this.packingLists = this.loadPackingLists();
        this.documents = this.loadDocuments();
        this.photos = this.loadPhotos();
        this.currentTripId = null;
        this.currentMonth = new Date();
        this.searchQuery = '';
        this.activeFilter = 'all';
        this.eventListeners = new Map(); // Track event listeners for cleanup
        this.init();
    }

    init() {
        console.log('🚀 Bradley\'s Travel Planner - A+ Features Loading...');
        this.setupAuth();
        this.setupEventListeners();
        this.updateDashboard();
        this.updateTripsDisplay();
        this.updateBudgetDisplay();
        this.updatePackingListsDisplay();
        this.updateDocumentsDisplay();
        this.updateCalendarDisplay();
        this.setMinDate();
        this.registerServiceWorker();
        this.setupPWA();
        this.hideSplashScreen();
        console.log('✅ A+ Features Loaded: Weather, Export, Templates, Authentication');
    }

    // Security and validation functions
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    validateInput(input, type = 'text', maxLength = 255) {
        if (!input || typeof input !== 'string') return false;
        
        const sanitized = this.sanitizeInput(input);
        if (sanitized.length === 0 || sanitized.length > maxLength) return false;
        
        switch (type) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
            case 'number':
                return !isNaN(parseFloat(sanitized)) && isFinite(sanitized);
            case 'date':
                return !isNaN(Date.parse(sanitized));
            case 'currency':
                return /^\d+(\.\d{1,2})?$/.test(sanitized);
            default:
                return sanitized.length > 0;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    safeInnerHTML(element, html) {
        if (typeof html !== 'string') return;
        element.innerHTML = this.escapeHtml(html);
    }

    // Error handling
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        this.showNotification(`An error occurred: ${error.message || 'Unknown error'}`, 'error');
    }

    // Memory management
    addEventListenerWithCleanup(element, event, handler, options = {}) {
        if (!element || typeof handler !== 'function') return;
        
        const key = `${element.id || 'unknown'}_${event}`;
        if (this.eventListeners.has(key)) {
            this.removeEventListener(key);
        }
        
        element.addEventListener(event, handler, options);
        this.eventListeners.set(key, { element, event, handler, options });
    }

    removeEventListener(key) {
        const listener = this.eventListeners.get(key);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            this.eventListeners.delete(key);
        }
    }

    cleanup() {
        this.eventListeners.forEach((_, key) => {
            this.removeEventListener(key);
        });
        this.eventListeners.clear();
    }

    setupEventListeners() {
        try {
            // Navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                console.log('Setting up navigation for button:', btn.dataset.section);
                this.addEventListenerWithCleanup(btn, 'click', (e) => {
                    try {
                        console.log('Navigation button clicked:', e.currentTarget.dataset.section);
                        const section = e.currentTarget.dataset.section;
                        this.showSection(section);
                    } catch (error) {
                        console.error('Navigation error:', error);
                        this.handleError(error, 'Navigation click');
                    }
                });
            });

            // Form submission
            const createTripForm = document.getElementById('create-trip-form');
            if (createTripForm) {
                this.addEventListenerWithCleanup(createTripForm, 'submit', (e) => {
                    try {
                        e.preventDefault();
                        this.createTrip(e);
                    } catch (error) {
                        this.handleError(error, 'Create trip form');
                    }
                });
            }

            // Modal close events
            this.addEventListenerWithCleanup(document, 'click', (e) => {
                try {
                    if (e.target.classList.contains('modal')) {
                        this.closeAllModals();
                    }
                } catch (error) {
                    this.handleError(error, 'Modal close');
                }
            });

            // Keyboard shortcuts
            this.addEventListenerWithCleanup(document, 'keydown', (e) => {
                try {
                    if (e.key === 'Escape') {
                        this.closeAllModals();
                    }
                } catch (error) {
                    this.handleError(error, 'Keyboard shortcuts');
                }
            });

            // Search functionality
            const searchInput = document.getElementById('global-search');
            if (searchInput) {
                this.addEventListenerWithCleanup(searchInput, 'input', (e) => {
                    try {
                        const query = this.sanitizeInput(e.target.value);
                        this.performGlobalSearch(query);
                    } catch (error) {
                        this.handleError(error, 'Search input');
                    }
                });
            }
        } catch (error) {
            this.handleError(error, 'Setup event listeners');
        }
    }

    // Navigation
    showSection(sectionName) {
        console.log('showSection called with:', sectionName);
        
        // Update navigation
        const navButtons = document.querySelectorAll('.nav-btn');
        console.log('Found nav buttons:', navButtons.length);
        if (navButtons.length > 0) {
            navButtons.forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        const activeButton = document.querySelector(`[data-section="${sectionName}"]`);
        console.log('Active button found:', activeButton);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Update content
        const contentSections = document.querySelectorAll('.content-section');
        console.log('Found content sections:', contentSections.length);
        if (contentSections.length > 0) {
            contentSections.forEach(section => {
                section.classList.remove('active');
            });
        }
        
        const targetSection = document.getElementById(sectionName);
        console.log('Target section found:', targetSection);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update specific sections
        if (sectionName === 'trips') {
            this.updateTripsDisplay();
        } else if (sectionName === 'budget') {
            this.updateBudgetDisplay();
        }
    }

    // Trip Management
    createTrip(event) {
        try {
            const formData = new FormData(event.target);
            
            // Validate and sanitize inputs
            const name = this.sanitizeInput(document.getElementById('trip-name')?.value || '');
            const destination = this.sanitizeInput(document.getElementById('destination')?.value || '');
            const type = this.sanitizeInput(document.getElementById('trip-type')?.value || '');
            const startDate = this.sanitizeInput(document.getElementById('start-date')?.value || '');
            const endDate = this.sanitizeInput(document.getElementById('end-date')?.value || '');
            const budgetValue = this.sanitizeInput(document.getElementById('trip-budget')?.value || '0');
            const notes = this.sanitizeInput(document.getElementById('notes')?.value || '');

            // Validate required fields
            if (!this.validateInput(name, 'text', 100)) {
                this.showNotification('Please enter a valid trip name', 'error');
                return;
            }
            if (!this.validateInput(destination, 'text', 100)) {
                this.showNotification('Please enter a valid destination', 'error');
                return;
            }
            if (!this.validateInput(startDate, 'date')) {
                this.showNotification('Please enter a valid start date', 'error');
                return;
            }
            if (!this.validateInput(endDate, 'date')) {
                this.showNotification('Please enter a valid end date', 'error');
                return;
            }
            if (!this.validateInput(budgetValue, 'currency')) {
                this.showNotification('Please enter a valid budget amount', 'error');
                return;
            }

            // Validate date logic
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start >= end) {
                this.showNotification('End date must be after start date', 'error');
                return;
            }

            const budget = parseFloat(budgetValue);
            if (budget < 0) {
                this.showNotification('Budget cannot be negative', 'error');
                return;
            }

            const trip = {
                id: this.generateId(),
                name: name,
                destination: destination,
                type: type,
                startDate: startDate,
                endDate: endDate,
                budget: budget,
                notes: notes,
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
        } catch (error) {
            this.handleError(error, 'Create trip');
        }
    }

    deleteTrip(tripId) {
        try {
            if (!tripId || typeof tripId !== 'string') {
                this.showNotification('Invalid trip ID', 'error');
                return;
            }

            if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
                const initialLength = this.trips.length;
                this.trips = this.trips.filter(trip => trip.id !== tripId);
                
                if (this.trips.length === initialLength) {
                    this.showNotification('Trip not found', 'error');
                    return;
                }

                this.saveTrips();
                this.updateDashboard();
                this.updateTripsDisplay();
                this.updateBudgetDisplay();
                this.showNotification('Trip deleted successfully!', 'success');
            }
        } catch (error) {
            this.handleError(error, 'Delete trip');
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
        document.getElementById('trip-budget').value = trip.budget;
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
        try {
            const upcomingTrips = this.getUpcomingTrips();
            const totalBudget = this.calculateTotalBudget();
            
            const upcomingCountEl = document.getElementById('upcoming-count');
            const totalBudgetEl = document.getElementById('total-budget');
            
            if (upcomingCountEl) {
                upcomingCountEl.textContent = 
                    `${upcomingTrips.length} trip${upcomingTrips.length !== 1 ? 's' : ''} planned`;
            }
            
            if (totalBudgetEl) {
                totalBudgetEl.textContent = this.formatCurrency(totalBudget);
            }
            
            this.updateRecentTrips();
        } catch (error) {
            this.handleError(error, 'Update dashboard');
        }
    }

    updateRecentTrips() {
        try {
            const recentTrips = this.trips
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 3);

            const container = document.getElementById('recent-trips-list');
            if (!container) return;
            
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
                        <h4>${this.escapeHtml(trip.name)}</h4>
                        <p>${this.escapeHtml(trip.destination)} • ${this.formatDate(trip.startDate)}</p>
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
        } catch (error) {
            this.handleError(error, 'Update recent trips');
        }
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

                <div class="weather-section">
                    <h4><i class="fas fa-cloud-sun"></i> Weather Forecast</h4>
                    <div id="weather-forecast-${trip.id}" class="weather-forecast">
                        <div class="weather-loading">
                            <i class="fas fa-spinner fa-spin"></i> Loading weather...
                        </div>
                    </div>
                </div>

                <div class="photos-section">
                    <h4><i class="fas fa-images"></i> Trip Photos</h4>
                    <div class="photos-container">
                        <div class="photos-grid" id="photos-grid-${trip.id}">
                            ${this.renderTripPhotos(trip.id)}
                        </div>
                        <div class="photo-actions">
                            <button class="btn btn-primary" onclick="travelPlanner.openPhotoUpload('${trip.id}')">
                                <i class="fas fa-plus"></i> Add Photos
                            </button>
                            <button class="btn btn-secondary" onclick="travelPlanner.openPhotoGallery('${trip.id}')">
                                <i class="fas fa-images"></i> View All Photos
                            </button>
                        </div>
                    </div>
                </div>

                ${trip.notes ? `
                    <div class="notes-section">
                        <h4>Notes</h4>
                        <p>${trip.notes}</p>
                    </div>
                ` : ''}
                
                <div class="trip-actions">
                    <button class="btn btn-secondary" onclick="travelPlanner.exportTripPDF('${trip.id}')">
                        <i class="fas fa-file-pdf"></i> Export PDF
                    </button>
                    <button class="btn btn-secondary" onclick="travelPlanner.exportTripCSV('${trip.id}')">
                        <i class="fas fa-file-csv"></i> Export CSV
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
        
        // Load weather data
        this.loadWeatherForecast(trip);
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
        this.updateAnalytics();
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
            this.packingLists = [];
            this.documents = [];
            this.settings = this.getDefaultSettings();
            this.saveTrips();
            this.savePackingLists();
            this.saveDocuments();
            this.saveSettings();
            this.updateDashboard();
            this.updateTripsDisplay();
            this.updatePackingListsDisplay();
            this.updateDocumentsDisplay();
            this.updateBudgetDisplay();
            this.updateCalendarDisplay();
            this.showNotification('All data cleared successfully!', 'success');
        }
    }

    loadSampleData() {
        this.trips = this.getSampleTrips();
        this.packingLists = this.getSamplePackingLists();
        this.documents = this.getSampleDocuments();
        this.settings = this.getDefaultSettings();
        
        this.saveTrips();
        this.savePackingLists();
        this.saveDocuments();
        this.saveSettings();
        
        this.updateDashboard();
        this.updateTripsDisplay();
        this.updatePackingListsDisplay();
        this.updateDocumentsDisplay();
        this.updateBudgetDisplay();
        this.updateCalendarDisplay();
        
        this.showNotification('Sample data loaded successfully!', 'success');
    }

    // Weather Integration
    async loadWeatherForecast(trip) {
        try {
            const weatherContainer = document.getElementById(`weather-forecast-${trip.id}`);
            if (!weatherContainer) {
                console.log('❌ Weather container not found');
                return;
            }
            console.log('🌤️ Loading weather forecast for trip:', trip.destination);

            // Extract city from destination (simple parsing)
            const city = trip.destination.split(',')[0].trim();
            const startDate = new Date(trip.startDate);
            const endDate = new Date(trip.endDate);
            
            // Try to get real weather data first
            try {
                const weatherData = await this.fetchRealWeatherData(city, startDate, endDate);
                if (weatherData) {
                    weatherContainer.innerHTML = `
                        <div class="weather-cards">
                            ${weatherData.map(day => `
                                <div class="weather-card">
                                    <div class="weather-date">${day.date}</div>
                                    <div class="weather-icon">${day.icon}</div>
                                    <div class="weather-temp">${day.temp}°F</div>
                                    <div class="weather-desc">${day.description}</div>
                                    <div class="weather-details">
                                        <small>H: ${day.maxTemp}° L: ${day.minTemp}°</small>
                                        <small>Humidity: ${day.humidity}%</small>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="weather-source">
                            <small>Weather data provided by wttr.in (free service)</small>
                        </div>
                    `;
                    return;
                }
            } catch (apiError) {
                console.log('Weather API unavailable, using mock data:', apiError.message);
            }
            
            // Fallback to mock weather data
            const mockWeather = this.generateMockWeather(city, startDate, endDate);
            
            weatherContainer.innerHTML = `
                <div class="weather-cards">
                    ${mockWeather.map(day => `
                        <div class="weather-card">
                            <div class="weather-date">${day.date}</div>
                            <div class="weather-icon">${day.icon}</div>
                            <div class="weather-temp">${day.temp}°F</div>
                            <div class="weather-desc">${day.description}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="weather-source">
                    <small>Demo weather data - Real weather data is automatically loaded from free APIs</small>
                </div>
            `;
        } catch (error) {
            console.error('Error loading weather:', error);
            const weatherContainer = document.getElementById(`weather-forecast-${trip.id}`);
            if (weatherContainer) {
                weatherContainer.innerHTML = '<p class="weather-error">Weather data unavailable</p>';
            }
        }
    }

    async fetchRealWeatherData(city, startDate, endDate) {
        try {
            // Use free weather API that doesn't require API key
            // Using wttr.in - a free weather service
            const response = await fetch(
                `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=en`
            );
            
            if (!response.ok) {
                throw new Error('Weather API request failed');
            }
            
            const data = await response.json();
            
            // Process weather data for trip dates
            const weatherData = [];
            const tripDays = this.getDaysBetweenDates(startDate, endDate);
            
            // wttr.in provides 3 days of weather data
            const weatherDays = data.weather || [];
            
            tripDays.forEach((day, index) => {
                if (index < weatherDays.length) {
                    const weatherDay = weatherDays[index];
                    const hourly = weatherDay.hourly || [];
                    const noonWeather = hourly[6] || hourly[0] || weatherDay.hourly[0]; // Get noon weather or first available
                    
                    if (noonWeather) {
                        weatherData.push({
                            date: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                            icon: this.getWeatherIconFromWttr(noonWeather.weatherCode),
                            temp: Math.round(parseInt(noonWeather.tempC)),
                            maxTemp: Math.round(parseInt(weatherDay.maxtempC)),
                            minTemp: Math.round(parseInt(weatherDay.mintempC)),
                            description: noonWeather.weatherDesc[0].value,
                            humidity: parseInt(noonWeather.humidity)
                        });
                    }
                }
            });
            
            return weatherData;
        } catch (error) {
            console.log('wttr.in failed, trying alternative API:', error.message);
            
            // Fallback to another free weather API
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=5`
                );
                
                if (!response.ok) {
                    throw new Error('Alternative weather API failed');
                }
                
                const data = await response.json();
                
                const weatherData = [];
                const tripDays = this.getDaysBetweenDates(startDate, endDate);
                
                tripDays.forEach((day, index) => {
                    if (index < data.daily.time.length) {
                        weatherData.push({
                            date: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                            icon: this.getWeatherIconFromCode(data.daily.weathercode[index]),
                            temp: Math.round((data.daily.temperature_2m_max[index] + data.daily.temperature_2m_min[index]) / 2),
                            maxTemp: Math.round(data.daily.temperature_2m_max[index]),
                            minTemp: Math.round(data.daily.temperature_2m_min[index]),
                            description: this.getWeatherDescription(data.daily.weathercode[index]),
                            humidity: 65 // Default humidity since this API doesn't provide it
                        });
                    }
                });
                
                return weatherData;
            } catch (fallbackError) {
                console.log('All weather APIs failed:', fallbackError.message);
                throw new Error('Weather services unavailable');
            }
        }
    }

    getDaysBetweenDates(startDate, endDate) {
        const days = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            days.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return days;
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': '☀️', '01n': '🌙',
            '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️',
            '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️',
            '10d': '🌦️', '10n': '🌧️',
            '11d': '⛈️', '11n': '⛈️',
            '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️'
        };
        return iconMap[iconCode] || '🌤️';
    }

    getWeatherIconFromWttr(weatherCode) {
        // wttr.in weather code mapping
        const iconMap = {
            '113': '☀️',  // Clear
            '116': '⛅',  // Partly Cloudy
            '119': '☁️',  // Cloudy
            '122': '☁️',  // Overcast
            '143': '🌫️', // Mist
            '176': '🌦️', // Patchy rain nearby
            '179': '🌧️', // Patchy snow nearby
            '182': '🌧️', // Patchy sleet nearby
            '185': '🌧️', // Patchy freezing drizzle nearby
            '200': '⛈️', // Thundery outbreaks in nearby
            '227': '❄️', // Blowing snow
            '230': '❄️', // Blizzard
            '248': '🌫️', // Fog
            '260': '🌫️', // Freezing fog
            '263': '🌦️', // Patchy light drizzle
            '266': '🌧️', // Light drizzle
            '281': '🌧️', // Freezing drizzle
            '284': '🌧️', // Heavy freezing drizzle
            '293': '🌦️', // Patchy light rain
            '296': '🌧️', // Light rain
            '299': '🌧️', // Moderate rain at times
            '302': '🌧️', // Moderate rain
            '305': '🌧️', // Heavy rain at times
            '308': '🌧️', // Heavy rain
            '311': '🌧️', // Light freezing rain
            '314': '🌧️', // Moderate or heavy freezing rain
            '317': '🌧️', // Light sleet
            '320': '🌧️', // Moderate or heavy sleet
            '323': '❄️', // Patchy light snow
            '326': '❄️', // Light snow
            '329': '❄️', // Patchy moderate snow
            '332': '❄️', // Moderate snow
            '335': '❄️', // Patchy heavy snow
            '338': '❄️', // Heavy snow
            '350': '🌧️', // Ice pellets
            '353': '🌦️', // Light rain shower
            '356': '🌧️', // Moderate or heavy rain shower
            '359': '🌧️', // Torrential rain shower
            '362': '🌧️', // Light sleet showers
            '365': '🌧️', // Moderate or heavy sleet showers
            '368': '❄️', // Light snow showers
            '371': '❄️', // Moderate or heavy snow showers
            '374': '🌧️', // Light showers of ice pellets
            '377': '🌧️', // Moderate or heavy showers of ice pellets
            '386': '⛈️', // Patchy light rain with thunder
            '389': '⛈️', // Moderate or heavy rain with thunder
            '392': '⛈️', // Patchy light snow with thunder
            '395': '⛈️'  // Moderate or heavy snow with thunder
        };
        return iconMap[weatherCode] || '🌤️';
    }

    getWeatherIconFromCode(weatherCode) {
        // Open-Meteo weather code mapping (WMO Weather interpretation codes)
        const iconMap = {
            '0': '☀️',   // Clear sky
            '1': '☀️',   // Mainly clear
            '2': '⛅',   // Partly cloudy
            '3': '☁️',   // Overcast
            '45': '🌫️', // Fog
            '48': '🌫️', // Depositing rime fog
            '51': '🌦️', // Light drizzle
            '53': '🌦️', // Moderate drizzle
            '55': '🌧️', // Dense drizzle
            '56': '🌧️', // Light freezing drizzle
            '57': '🌧️', // Dense freezing drizzle
            '61': '🌧️', // Slight rain
            '63': '🌧️', // Moderate rain
            '65': '🌧️', // Heavy rain
            '66': '🌧️', // Light freezing rain
            '67': '🌧️', // Heavy freezing rain
            '71': '❄️', // Slight snow fall
            '73': '❄️', // Moderate snow fall
            '75': '❄️', // Heavy snow fall
            '77': '❄️', // Snow grains
            '80': '🌦️', // Slight rain showers
            '81': '🌧️', // Moderate rain showers
            '82': '🌧️', // Violent rain showers
            '85': '❄️', // Slight snow showers
            '86': '❄️', // Heavy snow showers
            '95': '⛈️', // Thunderstorm
            '96': '⛈️', // Thunderstorm with slight hail
            '99': '⛈️'  // Thunderstorm with heavy hail
        };
        return iconMap[weatherCode.toString()] || '🌤️';
    }

    getWeatherDescription(weatherCode) {
        const descriptions = {
            '0': 'Clear sky',
            '1': 'Mainly clear',
            '2': 'Partly cloudy',
            '3': 'Overcast',
            '45': 'Fog',
            '48': 'Rime fog',
            '51': 'Light drizzle',
            '53': 'Moderate drizzle',
            '55': 'Dense drizzle',
            '56': 'Light freezing drizzle',
            '57': 'Dense freezing drizzle',
            '61': 'Slight rain',
            '63': 'Moderate rain',
            '65': 'Heavy rain',
            '66': 'Light freezing rain',
            '67': 'Heavy freezing rain',
            '71': 'Slight snow',
            '73': 'Moderate snow',
            '75': 'Heavy snow',
            '77': 'Snow grains',
            '80': 'Slight rain showers',
            '81': 'Moderate rain showers',
            '82': 'Violent rain showers',
            '85': 'Slight snow showers',
            '86': 'Heavy snow showers',
            '95': 'Thunderstorm',
            '96': 'Thunderstorm with hail',
            '99': 'Thunderstorm with heavy hail'
        };
        return descriptions[weatherCode.toString()] || 'Unknown';
    }

    generateMockWeather(city, startDate, endDate) {
        const weatherIcons = ['☀️', '⛅', '🌧️', '⛈️', '❄️', '🌤️'];
        const descriptions = ['Sunny', 'Partly Cloudy', 'Rainy', 'Stormy', 'Snowy', 'Cloudy'];
        const days = [];
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const randomIcon = weatherIcons[Math.floor(Math.random() * weatherIcons.length)];
            const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
            const randomTemp = Math.floor(Math.random() * 30) + 60; // 60-90°F
            
            days.push({
                date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                icon: randomIcon,
                temp: randomTemp,
                description: randomDesc
            });
        }
        
        return days;
    }

    // Export Functionality
    exportTripPDF(tripId) {
        const trip = this.trips.find(t => t.id === tripId);
        if (!trip) return;

        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                this.showNotification('PDF library not loaded. Please refresh the page and try again.', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set up fonts and colors
            doc.setFont('helvetica');
            doc.setFontSize(20);
            doc.setTextColor(102, 126, 234); // Brand color
            
            // Title
            doc.text('Bradley\'s Travel Planner', 20, 30);
            doc.setFontSize(16);
            doc.text('Trip Itinerary', 20, 40);
            
            // Company tagline
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('A product of Bradley Virtual Solutions, LLC', 20, 50);
            
            // Trip details
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            let yPosition = 70;
            
            doc.setFont('helvetica', 'bold');
            doc.text('Trip Details:', 20, yPosition);
            yPosition += 10;
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Trip Name: ${trip.name}`, 20, yPosition);
            yPosition += 8;
            doc.text(`Destination: ${trip.destination}`, 20, yPosition);
            yPosition += 8;
            doc.text(`Type: ${trip.type}`, 20, yPosition);
            yPosition += 8;
            doc.text(`Dates: ${this.formatDate(trip.startDate)} - ${this.formatDate(trip.endDate)}`, 20, yPosition);
            yPosition += 8;
            doc.text(`Budget: ${this.formatCurrency(trip.budget)}`, 20, yPosition);
            yPosition += 15;
            
            // Expenses section
            if (trip.expenses && trip.expenses.length > 0) {
                doc.setFont('helvetica', 'bold');
                doc.text('Expenses:', 20, yPosition);
                yPosition += 10;
                
                doc.setFont('helvetica', 'normal');
                trip.expenses.forEach(expense => {
                    if (yPosition > 250) { // Check if we need a new page
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(`• ${expense.description}: ${this.formatCurrency(expense.amount)}`, 25, yPosition);
                    yPosition += 6;
                });
                
                yPosition += 10;
                
                // Totals
                const totalSpent = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const remaining = trip.budget - totalSpent;
                
                doc.setFont('helvetica', 'bold');
                doc.text(`Total Spent: ${this.formatCurrency(totalSpent)}`, 20, yPosition);
                yPosition += 8;
                doc.text(`Remaining: ${this.formatCurrency(remaining)}`, 20, yPosition);
                yPosition += 15;
            }
            
            // Notes section
            if (trip.notes) {
                doc.setFont('helvetica', 'bold');
                doc.text('Notes:', 20, yPosition);
                yPosition += 10;
                
                doc.setFont('helvetica', 'normal');
                // Split long notes into multiple lines
                const splitNotes = doc.splitTextToSize(trip.notes, 170);
                doc.text(splitNotes, 20, yPosition);
            }
            
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${pageCount}`, 20, doc.internal.pageSize.height - 10);
                doc.text(`Generated on ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 10);
            }
            
            // Save the PDF
            const fileName = `${trip.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.pdf`;
            doc.save(fileName);
            
            this.showNotification('Trip itinerary exported as PDF successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showNotification('Error generating PDF. Please try again.', 'error');
        }
    }

    exportTripCSV(tripId) {
        const trip = this.trips.find(t => t.id === tripId);
        if (!trip) return;

        const csvContent = [
            ['Trip Name', 'Destination', 'Type', 'Start Date', 'End Date', 'Budget', 'Description', 'Amount', 'Category'],
            [trip.name, trip.destination, trip.type, trip.startDate, trip.endDate, trip.budget, '', '', ''],
            ...trip.expenses.map(expense => ['', '', '', '', '', '', expense.description, expense.amount, expense.category])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${trip.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_expenses.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Trip expenses exported to CSV!', 'success');
    }

    // Trip Templates
    getTripTemplates() {
        return [
            // Popular US Destinations
            {
                id: 'template_nyc',
                name: 'New York City Weekend',
                destination: 'New York City, USA',
                type: 'Leisure',
                duration: 3,
                budget: 800,
                description: 'The city that never sleeps - perfect for a quick urban escape',
                highlights: ['Central Park', 'Broadway Show', 'Times Square', 'Brooklyn Bridge', 'Statue of Liberty'],
                estimatedCosts: {
                    'Flight': 300,
                    'Hotel': 200,
                    'Food': 150,
                    'Activities': 100,
                    'Transportation': 50
                }
            },
            {
                id: 'template_los_angeles',
                name: 'Los Angeles Adventure',
                destination: 'Los Angeles, USA',
                type: 'Leisure',
                duration: 5,
                budget: 1200,
                description: 'Hollywood, beaches, and endless sunshine',
                highlights: ['Hollywood Walk of Fame', 'Santa Monica Pier', 'Griffith Observatory', 'Venice Beach', 'Universal Studios'],
                estimatedCosts: {
                    'Flight': 400,
                    'Hotel': 400,
                    'Food': 200,
                    'Activities': 150,
                    'Transportation': 50
                }
            },
            {
                id: 'template_miami',
                name: 'Miami Beach Paradise',
                destination: 'Miami, USA',
                type: 'Leisure',
                duration: 4,
                budget: 1000,
                description: 'Tropical vibes, art deco, and vibrant nightlife',
                highlights: ['South Beach', 'Art Deco District', 'Wynwood Walls', 'Everglades', 'Little Havana'],
                estimatedCosts: {
                    'Flight': 350,
                    'Hotel': 300,
                    'Food': 200,
                    'Activities': 100,
                    'Transportation': 50
                }
            },
            {
                id: 'template_las_vegas',
                name: 'Las Vegas Experience',
                destination: 'Las Vegas, USA',
                type: 'Leisure',
                duration: 3,
                budget: 900,
                description: 'Entertainment capital with shows, casinos, and dining',
                highlights: ['The Strip', 'Bellagio Fountains', 'Fremont Street', 'Shows', 'Grand Canyon Day Trip'],
                estimatedCosts: {
                    'Flight': 300,
                    'Hotel': 200,
                    'Food': 200,
                    'Activities': 150,
                    'Transportation': 50
                }
            },
            // International Destinations
            {
                id: 'template_paris',
                name: 'Paris Romance',
                destination: 'Paris, France',
                type: 'Leisure',
                duration: 7,
                budget: 2500,
                description: 'The City of Light - culture, cuisine, and romance',
                highlights: ['Eiffel Tower', 'Louvre Museum', 'Notre Dame', 'Seine River Cruise', 'Montmartre'],
                estimatedCosts: {
                    'Flight': 800,
                    'Hotel': 700,
                    'Food': 400,
                    'Activities': 300,
                    'Transportation': 100,
                    'Shopping': 200
                }
            },
            {
                id: 'template_london',
                name: 'London Royal Tour',
                destination: 'London, UK',
                type: 'Leisure',
                duration: 6,
                budget: 2200,
                description: 'Historic charm meets modern sophistication',
                highlights: ['Big Ben', 'Tower of London', 'British Museum', 'West End Show', 'Hyde Park'],
                estimatedCosts: {
                    'Flight': 700,
                    'Hotel': 600,
                    'Food': 350,
                    'Activities': 300,
                    'Transportation': 100,
                    'Shopping': 150
                }
            },
            {
                id: 'template_tokyo',
                name: 'Tokyo Discovery',
                destination: 'Tokyo, Japan',
                type: 'Leisure',
                duration: 8,
                budget: 2800,
                description: 'Futuristic metropolis with ancient traditions',
                highlights: ['Senso-ji Temple', 'Shibuya Crossing', 'Tsukiji Market', 'Tokyo Skytree', 'Harajuku'],
                estimatedCosts: {
                    'Flight': 1000,
                    'Hotel': 800,
                    'Food': 400,
                    'Activities': 300,
                    'Transportation': 150,
                    'Shopping': 150
                }
            },
            {
                id: 'template_rome',
                name: 'Rome Eternal City',
                destination: 'Rome, Italy',
                type: 'Leisure',
                duration: 5,
                budget: 1800,
                description: 'Ancient history and incredible Italian cuisine',
                highlights: ['Colosseum', 'Vatican City', 'Trevi Fountain', 'Roman Forum', 'Trastevere'],
                estimatedCosts: {
                    'Flight': 600,
                    'Hotel': 500,
                    'Food': 300,
                    'Activities': 200,
                    'Transportation': 100,
                    'Shopping': 100
                }
            },
            // Beach Destinations
            {
                id: 'template_cancun',
                name: 'Cancun Paradise',
                destination: 'Cancun, Mexico',
                type: 'Leisure',
                duration: 5,
                budget: 1200,
                description: 'All-inclusive beach resort with Mayan culture',
                highlights: ['Beach Resort', 'Chichen Itza', 'Snorkeling', 'Xcaret Park', 'Isla Mujeres'],
                estimatedCosts: {
                    'Flight': 400,
                    'Resort': 500,
                    'Activities': 200,
                    'Food': 100
                }
            },
            {
                id: 'template_bali',
                name: 'Bali Tropical Escape',
                destination: 'Bali, Indonesia',
                type: 'Leisure',
                duration: 8,
                budget: 1500,
                description: 'Island paradise with temples and rice terraces',
                highlights: ['Ubud Rice Terraces', 'Tegallalang', 'Uluwatu Temple', 'Seminyak Beach', 'Mount Batur'],
                estimatedCosts: {
                    'Flight': 600,
                    'Hotel': 400,
                    'Food': 200,
                    'Activities': 200,
                    'Transportation': 100
                }
            },
            // Adventure Destinations
            {
                id: 'template_iceland',
                name: 'Iceland Adventure',
                destination: 'Reykjavik, Iceland',
                type: 'Adventure',
                duration: 7,
                budget: 2000,
                description: 'Land of fire and ice with incredible natural wonders',
                highlights: ['Northern Lights', 'Blue Lagoon', 'Golden Circle', 'Glacier Hiking', 'Waterfalls'],
                estimatedCosts: {
                    'Flight': 500,
                    'Hotel': 600,
                    'Food': 300,
                    'Activities': 400,
                    'Transportation': 200
                }
            },
            // Business Destinations
            {
                id: 'template_san_francisco',
                name: 'San Francisco Tech',
                destination: 'San Francisco, USA',
                type: 'Business',
                duration: 4,
                budget: 1500,
                description: 'Tech hub with innovation and networking',
                highlights: ['Golden Gate Bridge', 'Alcatraz', 'Silicon Valley', 'Fisherman\'s Wharf', 'Cable Cars'],
                estimatedCosts: {
                    'Flight': 400,
                    'Hotel': 600,
                    'Conference': 300,
                    'Food': 150,
                    'Transportation': 50
                }
            },
            {
                id: 'template_singapore',
                name: 'Singapore Business',
                destination: 'Singapore',
                type: 'Business',
                duration: 5,
                budget: 1800,
                description: 'Global business hub with multicultural charm',
                highlights: ['Marina Bay Sands', 'Gardens by the Bay', 'Chinatown', 'Sentosa Island', 'Hawker Centers'],
                estimatedCosts: {
                    'Flight': 600,
                    'Hotel': 500,
                    'Food': 200,
                    'Activities': 300,
                    'Transportation': 100,
                    'Shopping': 200
                }
            }
        ];
    }

    showTripTemplates() {
        console.log('🎯 Opening Trip Templates...');
        const templates = this.getTripTemplates();
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'trip-templates-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3><i class="fas fa-magic"></i> Trip Templates</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="templates-intro">
                        <p>Choose from our curated trip templates to get started quickly:</p>
                        <div class="template-search">
                            <input type="text" id="template-search" placeholder="Search destinations or trip types..." onkeyup="travelPlanner.filterTemplates()">
                            <select id="template-type-filter" onchange="travelPlanner.filterTemplates()">
                                <option value="">All Types</option>
                                <option value="Leisure">Leisure</option>
                                <option value="Business">Business</option>
                                <option value="Adventure">Adventure</option>
                                <option value="Family">Family</option>
                                <option value="Romance">Romance</option>
                                <option value="Honeymoon">Honeymoon</option>
                                <option value="Solo">Solo Travel</option>
                                <option value="Group">Group Travel</option>
                                <option value="Backpacking">Backpacking</option>
                                <option value="Luxury">Luxury</option>
                                <option value="Budget">Budget</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Religious">Religious/Pilgrimage</option>
                                <option value="Sports">Sports/Active</option>
                                <option value="Wellness">Wellness/Health</option>
                                <option value="Educational">Educational</option>
                                <option value="Volunteer">Volunteer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="templates-grid" id="templates-grid">
                        ${templates.map(template => `
                            <div class="template-card">
                                <div class="template-header">
                                    <h4>${template.name}</h4>
                                    <div class="template-destination">${template.destination}</div>
                                </div>
                                <div class="template-details">
                                    <div class="template-duration">
                                        <i class="fas fa-calendar"></i> ${template.duration} days
                                    </div>
                                    <div class="template-budget">
                                        <i class="fas fa-dollar-sign"></i> ${this.formatCurrency(template.budget)}
                                    </div>
                                    <div class="template-type">
                                        <i class="fas fa-tag"></i> ${template.type}
                                    </div>
                                </div>
                                <div class="template-description">
                                    ${template.description}
                                </div>
                                <div class="template-highlights">
                                    <strong>Highlights:</strong>
                                    <div class="highlights-list">
                                        ${template.highlights.map(highlight => `<span class="highlight-tag">${highlight}</span>`).join('')}
                                    </div>
                                </div>
                                <div class="template-costs">
                                    <strong>Estimated Costs:</strong>
                                    <div class="costs-breakdown">
                                        ${Object.entries(template.estimatedCosts).map(([category, amount]) => 
                                            `<div class="cost-item">
                                                <span>${category}</span>
                                                <span>${this.formatCurrency(amount)}</span>
                                            </div>`
                                        ).join('')}
                                    </div>
                                </div>
                                <button class="btn btn-primary template-use-btn" onclick="event.stopPropagation(); travelPlanner.createFromTemplate('${template.id}')">
                                    <i class="fas fa-plus"></i> Use This Template
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="template-advanced-options">
                        <h4>Advanced Options</h4>
                        <div class="template-actions">
                            <button class="btn btn-secondary" onclick="travelPlanner.showAITemplateGenerator()">
                                <i class="fas fa-robot"></i> AI Generate Template
                            </button>
                            <button class="btn btn-secondary" onclick="travelPlanner.showCreateTemplate()">
                                <i class="fas fa-plus"></i> Create Custom Template
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        console.log('✅ Trip Templates Modal Created and Added to DOM');
    }

    filterTemplates() {
        const searchTerm = document.getElementById('template-search').value.toLowerCase();
        const typeFilter = document.getElementById('template-type-filter').value;
        const templates = this.getTripTemplates();
        
        const filteredTemplates = templates.filter(template => {
            const matchesSearch = template.name.toLowerCase().includes(searchTerm) || 
                                template.destination.toLowerCase().includes(searchTerm) ||
                                template.description.toLowerCase().includes(searchTerm);
            const matchesType = !typeFilter || template.type === typeFilter;
            return matchesSearch && matchesType;
        });
        
        const grid = document.getElementById('templates-grid');
        if (grid) {
            grid.innerHTML = filteredTemplates.map(template => `
                <div class="template-card">
                    <div class="template-header">
                        <h4>${template.name}</h4>
                        <div class="template-destination">${template.destination}</div>
                    </div>
                    <div class="template-details">
                        <div class="template-duration">
                            <i class="fas fa-calendar"></i> ${template.duration} days
                        </div>
                        <div class="template-budget">
                            <i class="fas fa-dollar-sign"></i> ${this.formatCurrency(template.budget)}
                        </div>
                        <div class="template-type">
                            <i class="fas fa-tag"></i> ${template.type}
                        </div>
                    </div>
                    <div class="template-description">
                        ${template.description}
                    </div>
                    <div class="template-highlights">
                        <strong>Highlights:</strong>
                        <div class="highlights-list">
                            ${template.highlights.map(highlight => `<span class="highlight-tag">${highlight}</span>`).join('')}
                        </div>
                    </div>
                    <div class="template-costs">
                        <strong>Estimated Costs:</strong>
                        <div class="costs-breakdown">
                            ${Object.entries(template.estimatedCosts).map(([category, amount]) => 
                                `<div class="cost-item">
                                    <span>${category}</span>
                                    <span>${this.formatCurrency(amount)}</span>
                                </div>`
                            ).join('')}
                        </div>
                    </div>
                    <button class="btn btn-primary template-use-btn" onclick="event.stopPropagation(); travelPlanner.createFromTemplate('${template.id}')">
                        <i class="fas fa-plus"></i> Use This Template
                    </button>
                </div>
            `).join('');
        }
    }

    createFromTemplate(templateId) {
        console.log('🎯 Creating trip from template:', templateId);
        const templates = this.getTripTemplates();
        const template = templates.find(t => t.id === templateId);
        if (!template) {
            console.log('❌ Template not found:', templateId);
            return;
        }
        console.log('✅ Template found:', template.name);

        // Pre-fill the create trip form with template data
        const tripNameField = document.getElementById('trip-name');
        const destinationField = document.getElementById('destination');
        const tripTypeField = document.getElementById('trip-type');
        const budgetField = document.getElementById('trip-budget');
        
        if (tripNameField) tripNameField.value = template.name;
        if (destinationField) destinationField.value = template.destination;
        if (tripTypeField) tripTypeField.value = template.type;
        if (budgetField) budgetField.value = template.budget;
        
        // Set dates (start from today, end based on duration)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + template.duration);
        
        const startDateField = document.getElementById('start-date');
        const endDateField = document.getElementById('end-date');
        const notesField = document.getElementById('notes');
        
        if (startDateField) startDateField.value = startDate.toISOString().split('T')[0];
        if (endDateField) endDateField.value = endDate.toISOString().split('T')[0];
        if (notesField) notesField.value = `${template.description}\n\nHighlights:\n${template.highlights.map(h => `• ${h}`).join('\n')}`;
        
        // Close templates modal
        const templatesModal = document.querySelector('.modal');
        if (templatesModal) {
            templatesModal.remove();
        }
        
        // Open create trip modal
        this.showCreateTripModal();
        
        this.showNotification(`Template "${template.name}" loaded!`, 'success');
    }

    // AI Template Generator
    showAITemplateGenerator() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'ai-template-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-robot"></i> AI Template Generator</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="ai-generator-form">
                        <div class="form-group">
                            <label for="ai-destination">Destination:</label>
                            <input type="text" id="ai-destination" placeholder="e.g., Tokyo, Japan" required>
                        </div>
                        <div class="form-group">
                            <label for="ai-duration">Duration (days):</label>
                            <input type="number" id="ai-duration" min="1" max="30" value="7" required>
                        </div>
                        <div class="form-group">
                            <label for="ai-budget">Budget ($):</label>
                            <input type="number" id="ai-budget" min="100" step="100" placeholder="e.g., 2000" required>
                        </div>
                        <div class="form-group">
                            <label for="ai-type">Trip Type:</label>
                            <select id="ai-type" required>
                                <option value="Leisure">Leisure</option>
                                <option value="Business">Business</option>
                                <option value="Adventure">Adventure</option>
                                <option value="Family">Family</option>
                                <option value="Romance">Romance</option>
                                <option value="Honeymoon">Honeymoon</option>
                                <option value="Solo">Solo Travel</option>
                                <option value="Group">Group Travel</option>
                                <option value="Backpacking">Backpacking</option>
                                <option value="Luxury">Luxury</option>
                                <option value="Budget">Budget</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Religious">Religious/Pilgrimage</option>
                                <option value="Sports">Sports/Active</option>
                                <option value="Wellness">Wellness/Health</option>
                                <option value="Educational">Educational</option>
                                <option value="Volunteer">Volunteer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ai-interests">Interests (comma-separated):</label>
                            <input type="text" id="ai-interests" placeholder="e.g., museums, food, nature, nightlife">
                        </div>
                        <button class="btn btn-primary" onclick="travelPlanner.generateAITemplate()">
                            <i class="fas fa-magic"></i> Generate Template
                        </button>
                    </div>
                    <div id="ai-generated-template" class="ai-generated-template" style="display: none;">
                        <!-- Generated template will appear here -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    generateAITemplate() {
        const destination = document.getElementById('ai-destination').value;
        const duration = parseInt(document.getElementById('ai-duration').value);
        const budget = parseInt(document.getElementById('ai-budget').value);
        const type = document.getElementById('ai-type').value;
        const interests = document.getElementById('ai-interests').value.split(',').map(i => i.trim()).filter(i => i);

        if (!destination || !duration || !budget) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Simulate AI generation with realistic data
        const template = this.generateAITemplateData(destination, duration, budget, type, interests);
        
        const templateContainer = document.getElementById('ai-generated-template');
        templateContainer.innerHTML = `
            <h4>🤖 AI Generated Template</h4>
            <div class="template-card ai-generated">
                <div class="template-header">
                    <h4>${template.name}</h4>
                    <div class="template-destination">${template.destination}</div>
                </div>
                <div class="template-details">
                    <div class="template-duration">
                        <i class="fas fa-calendar"></i> ${template.duration} days
                    </div>
                    <div class="template-budget">
                        <i class="fas fa-dollar-sign"></i> ${this.formatCurrency(template.budget)}
                    </div>
                    <div class="template-type">
                        <i class="fas fa-tag"></i> ${template.type}
                    </div>
                </div>
                <div class="template-description">
                    ${template.description}
                </div>
                <div class="template-highlights">
                    <strong>Highlights:</strong>
                    <div class="highlights-list">
                        ${template.highlights.map(highlight => `<span class="highlight-tag">${highlight}</span>`).join('')}
                    </div>
                </div>
                <div class="template-costs">
                    <strong>Estimated Costs:</strong>
                    <div class="costs-breakdown">
                        ${Object.entries(template.estimatedCosts).map(([category, amount]) => 
                            `<div class="cost-item">
                                <span>${category}</span>
                                <span>${this.formatCurrency(amount)}</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); travelPlanner.createFromAITemplate('${template.id}')">
                        <i class="fas fa-plus"></i> Use This Template
                    </button>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); travelPlanner.saveAITemplate('${template.id}')">
                        <i class="fas fa-save"></i> Save Template
                    </button>
                </div>
            </div>
        `;
        templateContainer.style.display = 'block';
    }

    generateAITemplateData(destination, duration, budget, type, interests) {
        const id = 'ai_template_' + Date.now();
        const city = destination.split(',')[0].trim();
        
        // Generate realistic highlights based on interests and destination
        const highlights = this.generateHighlights(city, type, interests);
        const description = this.generateDescription(city, type, duration, interests);
        const estimatedCosts = this.generateCostBreakdown(budget, type, duration);

        return {
            id: id,
            name: `${city} ${type} Adventure`,
            destination: destination,
            type: type,
            duration: duration,
            budget: budget,
            description: description,
            highlights: highlights,
            estimatedCosts: estimatedCosts
        };
    }

    generateHighlights(city, type, interests) {
        const baseHighlights = {
            'Leisure': ['City Center', 'Local Markets', 'Historic Sites', 'Restaurants'],
            'Business': ['Business District', 'Conference Centers', 'Networking Venues', 'Airport'],
            'Adventure': ['Hiking Trails', 'Outdoor Activities', 'Scenic Views', 'Adventure Sports'],
            'Romance': ['Romantic Restaurants', 'Scenic Spots', 'Couples Activities', 'Sunset Views'],
            'Family': ['Family Attractions', 'Parks', 'Museums', 'Kid-Friendly Activities']
        };

        let highlights = baseHighlights[type] || baseHighlights['Leisure'];
        
        // Add interest-based highlights
        if (interests.includes('food') || interests.includes('cuisine')) {
            highlights.push('Local Cuisine', 'Food Tours');
        }
        if (interests.includes('museums') || interests.includes('culture')) {
            highlights.push('Museums', 'Cultural Sites');
        }
        if (interests.includes('nature') || interests.includes('outdoor')) {
            highlights.push('Natural Attractions', 'Parks');
        }
        if (interests.includes('nightlife') || interests.includes('entertainment')) {
            highlights.push('Nightlife', 'Entertainment');
        }

        return highlights.slice(0, 6); // Limit to 6 highlights
    }

    generateDescription(city, type, duration, interests) {
        const typeDescriptions = {
            'Leisure': `A perfect ${duration}-day ${type.toLowerCase()} getaway to ${city}`,
            'Business': `Professional ${duration}-day ${type.toLowerCase()} trip to ${city}`,
            'Adventure': `An exciting ${duration}-day ${type.toLowerCase()} experience in ${city}`,
            'Romance': `A romantic ${duration}-day ${type.toLowerCase()} escape to ${city}`,
            'Family': `A fun-filled ${duration}-day ${type.toLowerCase()} trip to ${city}`
        };

        let description = typeDescriptions[type] || typeDescriptions['Leisure'];
        
        if (interests.length > 0) {
            description += `, featuring ${interests.slice(0, 3).join(', ')}`;
        }
        
        description += '.';
        return description;
    }

    generateCostBreakdown(budget, type, duration) {
        const baseAllocation = {
            'Leisure': { 'Flight': 0.3, 'Hotel': 0.4, 'Food': 0.15, 'Activities': 0.1, 'Transportation': 0.05 },
            'Business': { 'Flight': 0.4, 'Hotel': 0.35, 'Conference': 0.15, 'Food': 0.05, 'Transportation': 0.05 },
            'Adventure': { 'Flight': 0.25, 'Lodging': 0.3, 'Equipment': 0.2, 'Activities': 0.15, 'Food': 0.1 },
            'Romance': { 'Flight': 0.35, 'Hotel': 0.4, 'Food': 0.15, 'Activities': 0.05, 'Transportation': 0.05 },
            'Family': { 'Flight': 0.4, 'Hotel': 0.3, 'Food': 0.15, 'Activities': 0.1, 'Transportation': 0.05 }
        };

        const allocation = baseAllocation[type] || baseAllocation['Leisure'];
        const costs = {};

        Object.entries(allocation).forEach(([category, percentage]) => {
            costs[category] = Math.round(budget * percentage);
        });

        return costs;
    }

    createFromAITemplate(templateId) {
        console.log('🤖 Creating trip from AI template:', templateId);
        // This would use the same logic as createFromTemplate
        this.createFromTemplate(templateId);
    }

    saveAITemplate(templateId) {
        console.log('💾 Saving AI template:', templateId);
        // Find the AI template data and save it as custom template
        const aiTemplate = this.getAITemplateById(templateId);
        if (aiTemplate) {
            let customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
            customTemplates.push(aiTemplate);
            localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
            this.showNotification('AI template saved successfully!', 'success');
        }
    }

    getAITemplateById(templateId) {
        // This would need to store the AI template data temporarily
        // For now, we'll return null and handle this differently
        return null;
    }

    // Custom Template Creation
    showCreateTemplate() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-template-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Create Custom Template</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="create-template-form">
                        <div class="form-group">
                            <label for="template-name">Template Name:</label>
                            <input type="text" id="template-name" required>
                        </div>
                        <div class="form-group">
                            <label for="template-destination">Destination:</label>
                            <input type="text" id="template-destination" required>
                        </div>
                        <div class="form-group">
                            <label for="template-type">Trip Type:</label>
                            <select id="template-type" required>
                                <option value="Leisure">Leisure</option>
                                <option value="Business">Business</option>
                                <option value="Adventure">Adventure</option>
                                <option value="Family">Family</option>
                                <option value="Romance">Romance</option>
                                <option value="Honeymoon">Honeymoon</option>
                                <option value="Solo">Solo Travel</option>
                                <option value="Group">Group Travel</option>
                                <option value="Backpacking">Backpacking</option>
                                <option value="Luxury">Luxury</option>
                                <option value="Budget">Budget</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Religious">Religious/Pilgrimage</option>
                                <option value="Sports">Sports/Active</option>
                                <option value="Wellness">Wellness/Health</option>
                                <option value="Educational">Educational</option>
                                <option value="Volunteer">Volunteer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="template-duration">Duration (days):</label>
                            <input type="number" id="template-duration" min="1" max="30" required>
                        </div>
                        <div class="form-group">
                            <label for="template-budget">Budget ($):</label>
                            <input type="number" id="template-budget" min="100" step="100" required>
                        </div>
                        <div class="form-group">
                            <label for="template-description">Description:</label>
                            <textarea id="template-description" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="template-highlights">Highlights (one per line):</label>
                            <textarea id="template-highlights" rows="4" placeholder="Enter each highlight on a new line"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Cost Breakdown:</label>
                            <div id="cost-breakdown-inputs">
                                <div class="cost-input">
                                    <input type="text" placeholder="Category" class="cost-category">
                                    <input type="number" placeholder="Amount" class="cost-amount" step="10">
                                    <button type="button" onclick="this.parentElement.remove()">×</button>
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary" onclick="travelPlanner.addCostInput()">
                                <i class="fas fa-plus"></i> Add Cost Category
                            </button>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Template
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add form submission handler
        document.getElementById('create-template-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCustomTemplate();
        });
    }

    addCostInput() {
        const container = document.getElementById('cost-breakdown-inputs');
        const costInput = document.createElement('div');
        costInput.className = 'cost-input';
        costInput.innerHTML = `
            <input type="text" placeholder="Category" class="cost-category">
            <input type="number" placeholder="Amount" class="cost-amount" step="10">
            <button type="button" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(costInput);
    }

    saveCustomTemplate() {
        const name = document.getElementById('template-name').value;
        const destination = document.getElementById('template-destination').value;
        const type = document.getElementById('template-type').value;
        const duration = parseInt(document.getElementById('template-duration').value);
        const budget = parseInt(document.getElementById('template-budget').value);
        const description = document.getElementById('template-description').value;
        const highlightsText = document.getElementById('template-highlights').value;
        const highlights = highlightsText.split('\n').filter(h => h.trim());

        // Collect cost breakdown
        const costInputs = document.querySelectorAll('.cost-input');
        const estimatedCosts = {};
        costInputs.forEach(input => {
            const category = input.querySelector('.cost-category').value;
            const amount = parseFloat(input.querySelector('.cost-amount').value);
            if (category && amount) {
                estimatedCosts[category] = amount;
            }
        });

        if (!name || !destination || !duration || !budget || !description) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const template = {
            id: 'custom_template_' + Date.now(),
            name: name,
            destination: destination,
            type: type,
            duration: duration,
            budget: budget,
            description: description,
            highlights: highlights,
            estimatedCosts: estimatedCosts
        };

        // Save to localStorage
        let customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
        customTemplates.push(template);
        localStorage.setItem('customTemplates', JSON.stringify(customTemplates));

        this.showNotification('Custom template saved successfully!', 'success');
        this.closeAllModals();
    }

    // Utility Functions
    calculateTotalBudget() {
        return this.trips.reduce((sum, trip) => sum + trip.budget, 0);
    }

    calculateTripDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff;
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
        const modal = document.getElementById('create-trip-modal');
        if (!modal) {
            console.error('❌ Create trip modal not found in DOM');
            return;
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('✅ Create trip modal opened');
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
            if (trips) {
                return JSON.parse(trips);
            } else {
                // Load sample data if no trips exist
                return this.getSampleTrips();
            }
        } catch (error) {
            console.error('Error loading trips:', error);
            return this.getSampleTrips();
        }
    }

    getSampleTrips() {
        return [
            {
                id: 'trip_1',
                name: 'Summer Europe Adventure',
                destination: 'Paris, France',
                type: 'Leisure',
                startDate: '2024-06-15',
                endDate: '2024-06-25',
                budget: 3500.00,
                notes: 'First time visiting Europe! Excited to see the Eiffel Tower and try authentic French cuisine.',
                expenses: [
                    { id: 'exp_1', description: 'Flight to Paris', amount: 850.00, category: 'Transportation', date: '2024-06-15' },
                    { id: 'exp_2', description: 'Hotel booking', amount: 1200.00, category: 'Accommodation', date: '2024-06-15' },
                    { id: 'exp_3', description: 'Eiffel Tower tickets', amount: 45.00, category: 'Activities', date: '2024-06-16' },
                    { id: 'exp_4', description: 'Louvre Museum', amount: 25.00, category: 'Activities', date: '2024-06-17' },
                    { id: 'exp_5', description: 'French dinner', amount: 85.00, category: 'Food', date: '2024-06-18' }
                ],
                createdAt: '2024-05-01T10:00:00Z'
            },
            {
                id: 'trip_2',
                name: 'Business Conference NYC',
                destination: 'New York, USA',
                type: 'Business',
                startDate: '2024-07-10',
                endDate: '2024-07-12',
                budget: 2000.00,
                notes: 'Tech conference at Javits Center. Need to network and attend key sessions.',
                expenses: [
                    { id: 'exp_6', description: 'Conference registration', amount: 450.00, category: 'Business', date: '2024-07-10' },
                    { id: 'exp_7', description: 'Hotel near Javits', amount: 600.00, category: 'Accommodation', date: '2024-07-10' },
                    { id: 'exp_8', description: 'Uber rides', amount: 120.00, category: 'Transportation', date: '2024-07-11' }
                ],
                createdAt: '2024-06-15T14:30:00Z'
            },
            {
                id: 'trip_3',
                name: 'Beach Getaway Miami',
                destination: 'Miami, Florida',
                type: 'Leisure',
                startDate: '2024-08-20',
                endDate: '2024-08-25',
                budget: 1800.00,
                notes: 'Relaxing beach vacation with friends. Looking forward to South Beach and Cuban food!',
                expenses: [
                    { id: 'exp_9', description: 'Flight to Miami', amount: 320.00, category: 'Transportation', date: '2024-08-20' },
                    { id: 'exp_10', description: 'Airbnb rental', amount: 800.00, category: 'Accommodation', date: '2024-08-20' },
                    { id: 'exp_11', description: 'Beach equipment', amount: 75.00, category: 'Activities', date: '2024-08-21' }
                ],
                createdAt: '2024-07-01T09:15:00Z'
            }
        ];
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

    // Packing Lists Management
    loadPackingLists() {
        try {
            const lists = localStorage.getItem('travelPlannerPackingLists');
            if (lists) {
                return JSON.parse(lists);
            } else {
                // Load sample data if no packing lists exist
                return this.getSamplePackingLists();
            }
        } catch (error) {
            console.error('Error loading packing lists:', error);
            return this.getSamplePackingLists();
        }
    }

    getSamplePackingLists() {
        return [
            {
                id: 'pack_1',
                name: 'Summer Europe Trip',
                tripId: 'trip_1',
                categories: ['Clothes', 'Electronics', 'Toiletries', 'Documents'],
                items: [
                    { id: 'item_1', name: 'Passport', packed: true },
                    { id: 'item_2', name: 'Travel adapter', packed: true },
                    { id: 'item_3', name: 'Summer dresses (3)', packed: false },
                    { id: 'item_4', name: 'Comfortable walking shoes', packed: true },
                    { id: 'item_5', name: 'Camera and charger', packed: false },
                    { id: 'item_6', name: 'Toothbrush and toothpaste', packed: true },
                    { id: 'item_7', name: 'Sunscreen SPF 50', packed: false },
                    { id: 'item_8', name: 'Travel insurance documents', packed: true }
                ],
                createdAt: '2024-05-15T10:30:00Z'
            },
            {
                id: 'pack_2',
                name: 'Business Conference Pack',
                tripId: 'trip_2',
                categories: ['Business Attire', 'Electronics', 'Documents'],
                items: [
                    { id: 'item_9', name: 'Business suits (2)', packed: true },
                    { id: 'item_10', name: 'Laptop and charger', packed: true },
                    { id: 'item_11', name: 'Business cards', packed: true },
                    { id: 'item_12', name: 'Conference badge', packed: false },
                    { id: 'item_13', name: 'Notebook and pens', packed: true },
                    { id: 'item_14', name: 'Dress shoes', packed: true }
                ],
                createdAt: '2024-06-20T16:45:00Z'
            },
            {
                id: 'pack_3',
                name: 'Beach Vacation Essentials',
                tripId: 'trip_3',
                categories: ['Beach Gear', 'Summer Clothes', 'Sunscreen'],
                items: [
                    { id: 'item_15', name: 'Swimsuits (2)', packed: false },
                    { id: 'item_16', name: 'Beach towels', packed: false },
                    { id: 'item_17', name: 'Sunglasses', packed: true },
                    { id: 'item_18', name: 'Flip flops', packed: false },
                    { id: 'item_19', name: 'Beach hat', packed: false },
                    { id: 'item_20', name: 'Waterproof phone case', packed: true }
                ],
                createdAt: '2024-07-10T12:00:00Z'
            }
        ];
    }

    savePackingLists() {
        try {
            localStorage.setItem('travelPlannerPackingLists', JSON.stringify(this.packingLists));
        } catch (error) {
            console.error('Error saving packing lists:', error);
        }
    }

    createPackingList(event) {
        event.preventDefault();
        
        if (this.editingPackingListId) {
            // Update existing packing list
            const listIndex = this.packingLists.findIndex(l => l.id === this.editingPackingListId);
            if (listIndex !== -1) {
                this.packingLists[listIndex] = {
                    ...this.packingLists[listIndex],
                    name: document.getElementById('packing-list-name').value,
                    tripId: document.getElementById('packing-trip').value,
                    categories: document.getElementById('packing-categories').value.split(',').map(c => c.trim()).filter(c => c)
                };
                this.showNotification('Packing list updated successfully!', 'success');
            }
            this.editingPackingListId = null;
        } else {
            // Create new packing list
            const packingList = {
                id: this.generateId(),
                name: document.getElementById('packing-list-name').value,
                tripId: document.getElementById('packing-trip').value,
                categories: document.getElementById('packing-categories').value.split(',').map(c => c.trim()).filter(c => c),
                items: [],
                createdAt: new Date().toISOString()
            };
            this.packingLists.push(packingList);
            this.showNotification('Packing list created successfully!', 'success');
        }

        this.savePackingLists();
        this.closeCreatePackingListModal();
        this.updatePackingListsDisplay();
    }

    updatePackingListsDisplay() {
        const container = document.getElementById('packing-lists');
        
        if (this.packingLists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-suitcase"></i>
                    <h3>No packing lists yet</h3>
                    <p>Create your first packing list to get organized!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.packingLists.map(list => {
            const trip = this.trips.find(t => t.id === list.tripId);
            return `
                <div class="packing-list-card">
                    <div class="packing-list-header">
                        <div>
                            <div class="packing-list-title">${list.name}</div>
                            <div class="packing-list-trip">${trip ? trip.name : 'No trip associated'}</div>
                        </div>
                        <div class="packing-actions">
                            <button class="btn btn-secondary" onclick="travelPlanner.editPackingList('${list.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger" onclick="travelPlanner.deletePackingList('${list.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="packing-categories">
                        ${list.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                    </div>
                    <div class="packing-items">
                        ${list.items.map(item => `
                            <div class="packing-item ${item.packed ? 'completed' : ''}">
                                <input type="checkbox" ${item.packed ? 'checked' : ''} onchange="travelPlanner.togglePackingItem('${list.id}', '${item.id}')">
                                <input type="text" value="${item.name}" onchange="travelPlanner.updatePackingItem('${list.id}', '${item.id}', this.value)">
                            </div>
                        `).join('')}
                    </div>
                    <div class="add-item">
                        <input type="text" placeholder="Add new item..." onkeypress="travelPlanner.addPackingItem(event, '${list.id}')">
                    </div>
                </div>
            `;
        }).join('');
    }

    // Documents Management
    loadDocuments() {
        try {
            const docs = localStorage.getItem('travelPlannerDocuments');
            if (docs) {
                return JSON.parse(docs);
            } else {
                // Load sample data if no documents exist
                return this.getSampleDocuments();
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            return this.getSampleDocuments();
        }
    }

    getSampleDocuments() {
        return [
            {
                id: 'doc_1',
                name: 'Passport',
                type: 'Passport',
                tripId: 'trip_1',
                expiryDate: '2029-03-15',
                notes: 'Valid for 5 more years. Make sure to check visa requirements for France.',
                createdAt: '2024-05-01T08:00:00Z'
            },
            {
                id: 'doc_2',
                name: 'Travel Insurance Policy',
                type: 'Insurance',
                tripId: 'trip_1',
                expiryDate: '2024-07-15',
                notes: 'Covers medical emergencies and trip cancellation. Policy number: TI-2024-001234',
                createdAt: '2024-05-02T10:30:00Z'
            },
            {
                id: 'doc_3',
                name: 'Hotel Booking Confirmation',
                type: 'Accommodation',
                tripId: 'trip_1',
                expiryDate: null,
                notes: 'Hotel Le Marais, Paris. Confirmation code: HM-2024-5678. Check-in: June 15, 2024',
                createdAt: '2024-05-03T14:20:00Z'
            },
            {
                id: 'doc_4',
                name: 'Conference Registration',
                type: 'Business',
                tripId: 'trip_2',
                expiryDate: null,
                notes: 'TechConf 2024 at Javits Center. Badge pickup at registration desk.',
                createdAt: '2024-06-01T09:15:00Z'
            },
            {
                id: 'doc_5',
                name: 'Driver\'s License',
                type: 'ID',
                tripId: 'trip_3',
                expiryDate: '2026-12-31',
                notes: 'Valid for car rental in Miami. International driving permit not required for US.',
                createdAt: '2024-07-01T11:45:00Z'
            },
            {
                id: 'doc_6',
                name: 'Flight Booking',
                type: 'Transportation',
                tripId: 'trip_3',
                expiryDate: null,
                notes: 'American Airlines AA1234. Seat 12A. Check-in 24 hours before departure.',
                createdAt: '2024-07-02T16:30:00Z'
            }
        ];
    }

    saveDocuments() {
        try {
            localStorage.setItem('travelPlannerDocuments', JSON.stringify(this.documents));
        } catch (error) {
            console.error('Error saving documents:', error);
        }
    }

    addDocument(event) {
        event.preventDefault();
        
        if (this.editingDocumentId) {
            // Update existing document
            const docIndex = this.documents.findIndex(d => d.id === this.editingDocumentId);
            if (docIndex !== -1) {
                this.documents[docIndex] = {
                    ...this.documents[docIndex],
                    name: document.getElementById('document-name').value,
                    type: document.getElementById('document-type').value,
                    tripId: document.getElementById('document-trip').value || null,
                    expiryDate: document.getElementById('document-expiry').value,
                    notes: document.getElementById('document-notes').value
                };
                this.showNotification('Document updated successfully!', 'success');
            }
            this.editingDocumentId = null;
        } else {
            // Create new document
            const newDocument = {
                id: this.generateId(),
                name: document.getElementById('document-name').value,
                type: document.getElementById('document-type').value,
                tripId: document.getElementById('document-trip').value || null,
                expiryDate: document.getElementById('document-expiry').value,
                notes: document.getElementById('document-notes').value,
                createdAt: new Date().toISOString()
            };
            this.documents.push(newDocument);
            this.showNotification('Document added successfully!', 'success');
        }

        this.saveDocuments();
        this.closeAddDocumentModal();
        this.updateDocumentsDisplay();
    }

    updateDocumentsDisplay() {
        const container = document.getElementById('documents-grid');
        
        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No documents yet</h3>
                    <p>Add your travel documents to keep them organized!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.documents.map(doc => {
            const trip = doc.tripId ? this.trips.find(t => t.id === doc.tripId) : null;
            const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
            const isExpiringSoon = doc.expiryDate && new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            return `
                <div class="document-card">
                    <div class="document-icon ${doc.type}">
                        <i class="fas fa-${this.getDocumentIcon(doc.type)}"></i>
                    </div>
                    <div class="document-title">${doc.name}</div>
                    <div class="document-type">${doc.type}</div>
                    ${trip ? `<div class="document-trip">${trip.name}</div>` : ''}
                    ${doc.expiryDate ? `
                        <div class="document-expiry ${isExpired ? 'expired' : isExpiringSoon ? 'expiring-soon' : ''}">
                            <strong>Expires:</strong> ${this.formatDate(doc.expiryDate)}
                        </div>
                    ` : ''}
                    ${doc.notes ? `<div class="document-notes">${doc.notes}</div>` : ''}
                    <div class="document-actions">
                        <button class="btn btn-secondary" onclick="travelPlanner.editDocument('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="travelPlanner.deleteDocument('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getDocumentIcon(type) {
        const icons = {
            passport: 'passport',
            visa: 'stamp',
            insurance: 'shield-alt',
            ticket: 'ticket-alt',
            reservation: 'bed',
            other: 'file'
        };
        return icons[type] || 'file';
    }

    // Calendar Management
    updateCalendarDisplay() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const currentMonth = this.currentMonth.getMonth();
        const currentYear = this.currentMonth.getFullYear();
        
        document.getElementById('current-month').textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        this.renderCalendar(currentMonth, currentYear);
    }

    renderCalendar(month, year) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const calendarGrid = document.getElementById('calendar-grid');
        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const currentDate = new Date(year, month, day);
            const today = new Date();
            const isToday = currentDate.toDateString() === today.toDateString();
            
            if (isToday) {
                dayElement.classList.add('today');
            }
            
            // Check if there are trips on this day
            const tripsOnDay = this.trips.filter(trip => {
                const startDate = new Date(trip.startDate);
                const endDate = new Date(trip.endDate);
                return currentDate >= startDate && currentDate <= endDate;
            });
            
            if (tripsOnDay.length > 0) {
                dayElement.classList.add('has-trip');
            }
            
            dayElement.innerHTML = `
                <div class="day-number">${day}</div>
                ${tripsOnDay.map(trip => `
                    <a href="#" class="trip-indicator" onclick="travelPlanner.viewTrip('${trip.id}')">
                        ${trip.name}
                    </a>
                `).join('')}
            `;
            
            calendarGrid.appendChild(dayElement);
        }
    }

    previousMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.updateCalendarDisplay();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.updateCalendarDisplay();
    }

    // Service Worker Registration
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    // Modal Management Functions
    showCreatePackingListModal() {
        document.getElementById('create-packing-list-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Populate trip dropdown with enhanced information
        const tripSelect = document.getElementById('packing-trip');
        tripSelect.innerHTML = '<option value="">Select a trip</option>';
        
        if (this.trips.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No trips available - Create a trip first';
            option.disabled = true;
            tripSelect.appendChild(option);
        } else {
            // Sort trips by start date (upcoming first)
            const sortedTrips = [...this.trips].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            
            sortedTrips.forEach(trip => {
                const option = document.createElement('option');
                option.value = trip.id;
                
                // Format dates for display
                const startDate = new Date(trip.startDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                const endDate = new Date(trip.endDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                // Create enhanced display text
                const tripType = trip.type ? trip.type.charAt(0).toUpperCase() + trip.type.slice(1) : 'Trip';
                const duration = this.calculateTripDuration(trip.startDate, trip.endDate);
                
                option.textContent = `${trip.name} - ${trip.destination} (${startDate}-${endDate}, ${duration} days, ${tripType})`;
                tripSelect.appendChild(option);
            });
        }
    }

    closeCreatePackingListModal() {
        document.getElementById('create-packing-list-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('create-packing-list-form').reset();
    }

    showAddDocumentModal() {
        document.getElementById('add-document-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Populate trip dropdown with enhanced information
        const tripSelect = document.getElementById('document-trip');
        tripSelect.innerHTML = '<option value="">All Trips (General Document)</option>';
        
        if (this.trips.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No trips available - Document will be general';
            option.disabled = true;
            tripSelect.appendChild(option);
        } else {
            // Sort trips by start date (upcoming first)
            const sortedTrips = [...this.trips].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            
            sortedTrips.forEach(trip => {
                const option = document.createElement('option');
                option.value = trip.id;
                
                // Format dates for display
                const startDate = new Date(trip.startDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                const endDate = new Date(trip.endDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                // Create enhanced display text
                const tripType = trip.type ? trip.type.charAt(0).toUpperCase() + trip.type.slice(1) : 'Trip';
                const duration = this.calculateTripDuration(trip.startDate, trip.endDate);
                
                option.textContent = `${trip.name} - ${trip.destination} (${startDate}-${endDate}, ${duration} days, ${tripType})`;
                tripSelect.appendChild(option);
            });
        }
    }

    closeAddDocumentModal() {
        document.getElementById('add-document-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('add-document-form').reset();
    }

    closeWeatherModal() {
        document.getElementById('weather-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    editPackingList(listId) {
        const list = this.packingLists.find(l => l.id === listId);
        if (list) {
            document.getElementById('packing-list-name').value = list.name;
            document.getElementById('packing-trip').value = list.tripId;
            document.getElementById('packing-categories').value = list.categories.join(', ');
            this.editingPackingListId = listId;
            this.showCreatePackingListModal();
        }
    }

    deletePackingList(listId) {
        if (confirm('Are you sure you want to delete this packing list?')) {
            this.packingLists = this.packingLists.filter(l => l.id !== listId);
            this.savePackingLists();
            this.updatePackingListsDisplay();
        }
    }

    togglePackingItem(listId, itemId) {
        const list = this.packingLists.find(l => l.id === listId);
        if (list) {
            const item = list.items.find(i => i.id === itemId);
            if (item) {
                item.packed = !item.packed;
                this.savePackingLists();
                this.updatePackingListsDisplay();
            }
        }
    }

    updatePackingItem(listId, itemId, newName) {
        const list = this.packingLists.find(l => l.id === listId);
        if (list) {
            const item = list.items.find(i => i.id === itemId);
            if (item) {
                item.name = newName;
                this.savePackingLists();
            }
        }
    }

    addPackingItem(event, listId) {
        if (event.key === 'Enter') {
            const input = event.target;
            const itemName = input.value.trim();
            if (itemName) {
                const list = this.packingLists.find(l => l.id === listId);
                if (list) {
                    list.items.push({
                        id: this.generateId(),
                        name: itemName,
                        packed: false
                    });
                    this.savePackingLists();
                    this.updatePackingListsDisplay();
                    input.value = '';
                }
            }
        }
    }

    editDocument(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (doc) {
            document.getElementById('document-name').value = doc.name;
            document.getElementById('document-type').value = doc.type;
            document.getElementById('document-trip').value = doc.tripId || '';
            document.getElementById('document-expiry').value = doc.expiryDate || '';
            document.getElementById('document-notes').value = doc.notes || '';
            this.editingDocumentId = docId;
            this.showAddDocumentModal();
        }
    }

    deleteDocument(docId) {
        if (confirm('Are you sure you want to delete this document?')) {
            this.documents = this.documents.filter(d => d.id !== docId);
            this.saveDocuments();
            this.updateDocumentsDisplay();
        }
    }

    // PWA Management
    setupPWA() {
        this.deferredPrompt = null;
        this.setupInstallPrompt();
        this.setupOfflineDetection();
        this.setupBeforeInstallPrompt();
    }

    setupInstallPrompt() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is running in standalone mode');
            return;
        }

        // Show install prompt after a delay
        setTimeout(() => {
            if (!this.isAppInstalled()) {
                this.showInstallPrompt();
            }
        }, 5000);
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.hideOfflineIndicator();
        });

        window.addEventListener('offline', () => {
            this.showOfflineIndicator();
        });

        // Check initial connection status
        if (!navigator.onLine) {
            this.showOfflineIndicator();
        }
    }

    setupBeforeInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Don't prevent default - let the browser handle the prompt naturally
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
    }

    showInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        if (prompt && !this.isInstallPromptDismissed()) {
            prompt.classList.add('show');
        }
    }

    hideInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        if (prompt) {
            prompt.classList.remove('show');
        }
    }

    dismissInstallPrompt() {
        this.hideInstallPrompt();
        localStorage.setItem('travelPlannerInstallDismissed', 'true');
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.hideInstallPrompt();
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
        } else {
            // Fallback for browsers that don't support beforeinstallprompt
            this.showManualInstallInstructions();
        }
    }

    showManualInstallInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        let instructions = '';
        
        if (isIOS) {
            instructions = 'To install this app on your iOS device, tap the Share button and then "Add to Home Screen".';
        } else if (isAndroid) {
            instructions = 'To install this app on your Android device, tap the menu button and then "Add to Home Screen".';
        } else {
            instructions = 'To install this app, look for the install icon in your browser\'s address bar or menu.';
        }
        
        this.showNotification(instructions, 'info');
    }

    isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }

    isInstallPromptDismissed() {
        return localStorage.getItem('travelPlannerInstallDismissed') === 'true';
    }

    showOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.add('show');
        }
    }

    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }

    hideSplashScreen() {
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.classList.add('hide');
                setTimeout(() => {
                    splash.style.display = 'none';
                }, 500);
            }
        }, 2000);
    }

    // Additional PWA functionality
    addToHomeScreen() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                if (registration.active) {
                    console.log('Service Worker is active');
                }
            });
        }
    }

    // Background sync for offline data
    async syncOfflineData() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('background-sync');
                console.log('Background sync registered');
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }
    }

    // Push notification setup
    async setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Push notifications enabled');
                }
            }
        }
    }

    // Photo Gallery Management
    async loadPhotos() {
        try {
            // Try to load from Firestore first
            const photosSnapshot = await getDocs(collection(db, 'photos'));
            const firestorePhotos = photosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            if (firestorePhotos.length > 0) {
                this.photos = firestorePhotos;
                console.log(`📸 Loaded ${firestorePhotos.length} photos from Firestore`);
                return firestorePhotos;
            }
        } catch (error) {
            console.log('📸 Firestore not available, loading from localStorage');
        }
        
        // Fallback to localStorage
        const photos = localStorage.getItem('tripPhotos');
        const localPhotos = photos ? JSON.parse(photos) : [];
        this.photos = localPhotos;
        return localPhotos;
    }

    async savePhotos() {
        try {
            // Save to Firestore
            const batch = writeBatch(db);
            
            // Clear existing photos in Firestore
            const photosSnapshot = await getDocs(collection(db, 'photos'));
            photosSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Add all current photos
            this.photos.forEach(photo => {
                const photoRef = doc(collection(db, 'photos'), photo.id);
                batch.set(photoRef, {
                    tripId: photo.tripId,
                    caption: photo.caption,
                    date: photo.date,
                    fileName: photo.fileName,
                    size: photo.size,
                    originalSize: photo.originalSize || photo.size,
                    // Note: Not storing the actual image data (url) to save space
                    // Only storing metadata
                    hasImage: !!photo.url
                });
            });
            
            await batch.commit();
            console.log(`📸 Saved ${this.photos.length} photo records to Firestore`);
        } catch (error) {
            console.log('📸 Firestore not available, saving to localStorage');
            localStorage.setItem('tripPhotos', JSON.stringify(this.photos));
        }
    }

    renderTripPhotos(tripId) {
        const tripPhotos = this.photos.filter(photo => photo.tripId === tripId);
        if (tripPhotos.length === 0) {
            return '<div class="no-photos"><i class="fas fa-camera"></i><p>No photos yet. Add some memories!</p></div>';
        }
        
        return tripPhotos.slice(0, 6).map(photo => `
            <div class="photo-item" onclick="travelPlanner.viewPhoto('${photo.id}')">
                <img src="${photo.url}" alt="${photo.caption || 'Trip photo'}" loading="lazy">
                <div class="photo-overlay">
                    <i class="fas fa-eye"></i>
                </div>
            </div>
        `).join('') + (tripPhotos.length > 6 ? `<div class="photo-more">+${tripPhotos.length - 6} more</div>` : '');
    }

    openPhotoUpload(tripId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => this.handlePhotoUpload(e, tripId);
        input.click();
    }

    async handlePhotoUpload(event, tripId) {
        const files = Array.from(event.target.files);
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                // Check file size (limit to 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    this.showNotification('Photo too large. Please choose a file under 5MB.', 'error');
                    continue;
                }

                // Compress image before storing
                this.compressImage(file, async (compressedFile) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const photo = {
                            id: this.generateId(),
                            tripId: tripId,
                            url: e.target.result, // Keep Base64 for local display
                            caption: '',
                            date: new Date().toISOString(),
                            fileName: file.name,
                            size: compressedFile.size,
                            originalSize: file.size,
                            hasImage: true
                        };
                        this.photos.push(photo);
                        await this.savePhotos(); // Save metadata to Firestore
                        this.updateTripPhotos(tripId);
                        this.showNotification('Photo added successfully!', 'success');
                    };
                    reader.readAsDataURL(compressedFile);
                });
            }
        }
    }

    compressImage(file, callback) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions (max 1200px width)
            const maxWidth = 1200;
            const maxHeight = 1200;
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(callback, 'image/jpeg', 0.8); // 80% quality
        };
        
        img.src = URL.createObjectURL(file);
    }

    updateTripPhotos(tripId) {
        const photosGrid = document.getElementById(`photos-grid-${tripId}`);
        if (photosGrid) {
            photosGrid.innerHTML = this.renderTripPhotos(tripId);
        }
    }

    openPhotoGallery(tripId) {
        const tripPhotos = this.photos.filter(photo => photo.tripId === tripId);
        if (tripPhotos.length === 0) {
            this.showNotification('No photos to display', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'photo-gallery-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3><i class="fas fa-images"></i> Photo Gallery</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="gallery-grid">
                        ${tripPhotos.map(photo => `
                            <div class="gallery-item" onclick="travelPlanner.viewPhoto('${photo.id}')">
                                <img src="${photo.url}" alt="${photo.caption || 'Trip photo'}" loading="lazy">
                                <div class="gallery-overlay">
                                    <div class="gallery-actions">
                                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); travelPlanner.editPhoto('${photo.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); travelPlanner.deletePhoto('${photo.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="gallery-caption">${photo.caption || 'Untitled'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    viewPhoto(photoId) {
        const photo = this.photos.find(p => p.id === photoId);
        if (!photo) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'photo-viewer-modal';
        modal.innerHTML = `
            <div class="modal-content photo-viewer">
                <div class="modal-header">
                    <h3>${photo.caption || 'Trip Photo'}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="photo-viewer-container">
                        <img src="${photo.url}" alt="${photo.caption || 'Trip photo'}" class="photo-viewer-image">
                        <div class="photo-viewer-info">
                            <p><strong>Date:</strong> ${this.formatDate(photo.date)}</p>
                            <p><strong>File:</strong> ${photo.fileName}</p>
                            <p><strong>Size:</strong> ${this.formatFileSize(photo.size)}</p>
                            ${photo.caption ? `<p><strong>Caption:</strong> ${photo.caption}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    editPhoto(photoId) {
        const photo = this.photos.find(p => p.id === photoId);
        if (!photo) return;

        const caption = prompt('Edit photo caption:', photo.caption || '');
        if (caption !== null) {
            photo.caption = caption;
            this.savePhotos();
            this.showNotification('Photo caption updated!', 'success');
            // Refresh gallery if open
            const galleryModal = document.getElementById('photo-gallery-modal');
            if (galleryModal) {
                galleryModal.remove();
                this.openPhotoGallery(photo.tripId);
            }
        }
    }

    deletePhoto(photoId) {
        if (confirm('Are you sure you want to delete this photo?')) {
            this.photos = this.photos.filter(p => p.id !== photoId);
            this.savePhotos();
            this.showNotification('Photo deleted successfully!', 'success');
            // Refresh gallery if open
            const galleryModal = document.getElementById('photo-gallery-modal');
            if (galleryModal) {
                galleryModal.remove();
                const photo = this.photos.find(p => p.id === photoId);
                if (photo) {
                    this.openPhotoGallery(photo.tripId);
                }
            }
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Advanced Search Functionality
    performGlobalSearch(query) {
        if (!query || query.length < 2) {
            this.clearSearchResults();
            this.hideSearchSuggestions();
            this.updateClearButton();
            return;
        }

        const results = this.searchAllData(query);
        this.displaySearchResults(results, query);
        this.updateClearButton();
    }

    showSearchSuggestions() {
        const suggestions = [
            'Paris, France',
            'Tokyo, Japan',
            'New York, USA',
            'London, UK',
            'Sydney, Australia',
            'Packing List',
            'Passport',
            'Visa',
            'Hotel Booking',
            'Flight Tickets'
        ];

        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            const content = suggestionsContainer.querySelector('.search-dropdown-content');
            if (content) {
                content.innerHTML = suggestions.map(suggestion => 
                    `<div class="search-suggestion" onclick="travelPlanner.selectSuggestion('${suggestion}')">${suggestion}</div>`
                ).join('');
                suggestionsContainer.classList.add('show');
            }
        }
    }

    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('show');
        }
    }

    selectSuggestion(suggestion) {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.value = suggestion;
            this.performGlobalSearch(suggestion);
            this.hideSearchSuggestions();
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.value = '';
            this.clearSearchResults();
            this.hideSearchSuggestions();
            this.updateClearButton();
            searchInput.focus();
        }
    }

    updateClearButton() {
        const searchInput = document.getElementById('global-search');
        const clearButton = document.querySelector('.search-clear-btn');
        
        if (searchInput && clearButton) {
            if (searchInput.value.trim().length > 0) {
                clearButton.style.display = 'flex';
            } else {
                clearButton.style.display = 'none';
            }
        }
    }

    searchAllData(query) {
        const searchTerm = query.toLowerCase();
        const results = {
            trips: [],
            packingLists: [],
            documents: [],
            photos: []
        };

        // Search trips
        this.trips.forEach(trip => {
            const matches = [];
            if (trip.name.toLowerCase().includes(searchTerm)) matches.push('name');
            if (trip.destination.toLowerCase().includes(searchTerm)) matches.push('destination');
            if (trip.type.toLowerCase().includes(searchTerm)) matches.push('type');
            if (trip.notes && trip.notes.toLowerCase().includes(searchTerm)) matches.push('notes');
            
            if (matches.length > 0) {
                results.trips.push({
                    ...trip,
                    matches: matches,
                    relevance: this.calculateRelevance(trip, searchTerm, matches)
                });
            }
        });

        // Search packing lists
        this.packingLists.forEach(list => {
            const matches = [];
            if (list.name.toLowerCase().includes(searchTerm)) matches.push('name');
            if (list.categories.some(cat => cat.toLowerCase().includes(searchTerm))) matches.push('categories');
            
            if (matches.length > 0) {
                const trip = this.trips.find(t => t.id === list.tripId);
                results.packingLists.push({
                    ...list,
                    tripName: trip ? trip.name : 'Unknown Trip',
                    matches: matches,
                    relevance: this.calculateRelevance(list, searchTerm, matches)
                });
            }
        });

        // Search documents
        this.documents.forEach(doc => {
            const matches = [];
            if (doc.name.toLowerCase().includes(searchTerm)) matches.push('name');
            if (doc.type.toLowerCase().includes(searchTerm)) matches.push('type');
            if (doc.notes && doc.notes.toLowerCase().includes(searchTerm)) matches.push('notes');
            
            if (matches.length > 0) {
                const trip = this.trips.find(t => t.id === doc.tripId);
                results.documents.push({
                    ...doc,
                    tripName: trip ? trip.name : 'General',
                    matches: matches,
                    relevance: this.calculateRelevance(doc, searchTerm, matches)
                });
            }
        });

        // Search photos
        this.photos.forEach(photo => {
            const matches = [];
            if (photo.caption && photo.caption.toLowerCase().includes(searchTerm)) matches.push('caption');
            if (photo.fileName.toLowerCase().includes(searchTerm)) matches.push('fileName');
            
            if (matches.length > 0) {
                const trip = this.trips.find(t => t.id === photo.tripId);
                results.photos.push({
                    ...photo,
                    tripName: trip ? trip.name : 'Unknown Trip',
                    matches: matches,
                    relevance: this.calculateRelevance(photo, searchTerm, matches)
                });
            }
        });

        return results;
    }

    calculateRelevance(item, searchTerm, matches) {
        let score = 0;
        const searchLower = searchTerm.toLowerCase();
        
        matches.forEach(match => {
            const fieldValue = item[match] ? item[match].toString().toLowerCase() : '';
            if (fieldValue.startsWith(searchLower)) score += 10;
            else if (fieldValue.includes(searchLower)) score += 5;
        });

        return score;
    }

    displaySearchResults(results, query) {
        const totalResults = results.trips.length + results.packingLists.length + results.documents.length + results.photos.length;
        
        if (totalResults === 0) {
            this.showNotification(`No results found for "${query}"`, 'info');
            return;
        }

        // Create search results modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'search-results-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3><i class="fas fa-search"></i> Search Results for "${query}"</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-summary">
                        <p>Found ${totalResults} result${totalResults !== 1 ? 's' : ''} across all sections</p>
                    </div>
                    <div class="search-results">
                        ${this.renderSearchResults(results)}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    renderSearchResults(results) {
        let html = '';

        // Trips
        if (results.trips.length > 0) {
            html += `
                <div class="search-section">
                    <h4><i class="fas fa-map-marked-alt"></i> Trips (${results.trips.length})</h4>
                    <div class="search-items">
                        ${results.trips.sort((a, b) => b.relevance - a.relevance).map(trip => `
                            <div class="search-item" onclick="travelPlanner.showTripDetailsModal('${trip.id}'); this.closest('.modal').remove()">
                                <div class="search-item-header">
                                    <h5>${this.highlightSearchTerm(trip.name, this.getSearchTerm())}</h5>
                                    <span class="search-item-type">Trip</span>
                                </div>
                                <div class="search-item-details">
                                    <p><strong>Destination:</strong> ${this.highlightSearchTerm(trip.destination, this.getSearchTerm())}</p>
                                    <p><strong>Type:</strong> ${trip.type}</p>
                                    <p><strong>Dates:</strong> ${this.formatDate(trip.startDate)} - ${this.formatDate(trip.endDate)}</p>
                                </div>
                                <div class="search-item-matches">
                                    <small>Matched in: ${trip.matches.join(', ')}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Packing Lists
        if (results.packingLists.length > 0) {
            html += `
                <div class="search-section">
                    <h4><i class="fas fa-suitcase"></i> Packing Lists (${results.packingLists.length})</h4>
                    <div class="search-items">
                        ${results.packingLists.sort((a, b) => b.relevance - a.relevance).map(list => `
                            <div class="search-item" onclick="travelPlanner.showSection('packing'); this.closest('.modal').remove()">
                                <div class="search-item-header">
                                    <h5>${this.highlightSearchTerm(list.name, this.getSearchTerm())}</h5>
                                    <span class="search-item-type">Packing List</span>
                                </div>
                                <div class="search-item-details">
                                    <p><strong>Trip:</strong> ${list.tripName}</p>
                                    <p><strong>Categories:</strong> ${list.categories.join(', ')}</p>
                                </div>
                                <div class="search-item-matches">
                                    <small>Matched in: ${list.matches.join(', ')}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Documents
        if (results.documents.length > 0) {
            html += `
                <div class="search-section">
                    <h4><i class="fas fa-file-alt"></i> Documents (${results.documents.length})</h4>
                    <div class="search-items">
                        ${results.documents.sort((a, b) => b.relevance - a.relevance).map(doc => `
                            <div class="search-item" onclick="travelPlanner.showSection('documents'); this.closest('.modal').remove()">
                                <div class="search-item-header">
                                    <h5>${this.highlightSearchTerm(doc.name, this.getSearchTerm())}</h5>
                                    <span class="search-item-type">Document</span>
                                </div>
                                <div class="search-item-details">
                                    <p><strong>Type:</strong> ${doc.type}</p>
                                    <p><strong>Trip:</strong> ${doc.tripName}</p>
                                    ${doc.expiryDate ? `<p><strong>Expires:</strong> ${this.formatDate(doc.expiryDate)}</p>` : ''}
                                </div>
                                <div class="search-item-matches">
                                    <small>Matched in: ${doc.matches.join(', ')}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Photos
        if (results.photos.length > 0) {
            html += `
                <div class="search-section">
                    <h4><i class="fas fa-images"></i> Photos (${results.photos.length})</h4>
                    <div class="search-items">
                        ${results.photos.sort((a, b) => b.relevance - a.relevance).map(photo => `
                            <div class="search-item" onclick="travelPlanner.viewPhoto('${photo.id}'); this.closest('.modal').remove()">
                                <div class="search-item-header">
                                    <h5>${photo.caption || 'Untitled Photo'}</h5>
                                    <span class="search-item-type">Photo</span>
                                </div>
                                <div class="search-item-details">
                                    <p><strong>Trip:</strong> ${photo.tripName}</p>
                                    <p><strong>File:</strong> ${photo.fileName}</p>
                                    <p><strong>Date:</strong> ${this.formatDate(photo.date)}</p>
                                </div>
                                <div class="search-item-matches">
                                    <small>Matched in: ${photo.matches.join(', ')}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    }

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    getSearchTerm() {
        const searchInput = document.getElementById('global-search');
        return searchInput ? searchInput.value : '';
    }

    clearSearchResults() {
        const modal = document.getElementById('search-results-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Advanced Analytics
    updateAnalytics() {
        this.updateSpendingTrends();
        this.updateTopExpenses();
        this.updateBudgetEfficiency();
        this.updateMonthlySpending();
    }

    updateSpendingTrends() {
        const container = document.getElementById('spending-trends-chart');
        if (!container) return;

        const allExpenses = this.getAllExpenses();
        const trends = this.calculateSpendingTrends(allExpenses);
        
        container.innerHTML = `
            <div class="trends-summary">
                <div class="trend-item">
                    <span class="trend-label">Average per trip:</span>
                    <span class="trend-value">${this.formatCurrency(trends.averagePerTrip)}</span>
                </div>
                <div class="trend-item">
                    <span class="trend-label">Most expensive trip:</span>
                    <span class="trend-value">${this.formatCurrency(trends.mostExpensive)}</span>
                </div>
                <div class="trend-item">
                    <span class="trend-label">Total trips:</span>
                    <span class="trend-value">${trends.totalTrips}</span>
                </div>
            </div>
            <div class="trend-chart">
                ${this.generateTrendChart(trends.tripSpending)}
            </div>
        `;
    }

    updateTopExpenses() {
        const container = document.getElementById('top-expenses-list');
        if (!container) return;

        const allExpenses = this.getAllExpenses();
        const topExpenses = allExpenses
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        if (topExpenses.length === 0) {
            container.innerHTML = '<p class="no-data">No expenses yet</p>';
            return;
        }

        container.innerHTML = `
            <div class="expenses-list">
                ${topExpenses.map(expense => `
                    <div class="expense-item">
                        <div class="expense-info">
                            <span class="expense-description">${expense.description}</span>
                            <span class="expense-trip">${this.getTripName(expense.tripId)}</span>
                        </div>
                        <span class="expense-amount">${this.formatCurrency(expense.amount)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateBudgetEfficiency() {
        const container = document.getElementById('budget-efficiency-stats');
        if (!container) return;

        const efficiency = this.calculateBudgetEfficiency();
        
        container.innerHTML = `
            <div class="efficiency-stats">
                <div class="efficiency-item">
                    <div class="efficiency-label">Budget Utilization</div>
                    <div class="efficiency-bar">
                        <div class="efficiency-fill" style="width: ${efficiency.utilization}%"></div>
                    </div>
                    <div class="efficiency-value">${efficiency.utilization.toFixed(1)}%</div>
                </div>
                <div class="efficiency-item">
                    <div class="efficiency-label">Savings Rate</div>
                    <div class="efficiency-bar">
                        <div class="efficiency-fill savings" style="width: ${efficiency.savingsRate}%"></div>
                    </div>
                    <div class="efficiency-value">${efficiency.savingsRate.toFixed(1)}%</div>
                </div>
                <div class="efficiency-metrics">
                    <div class="metric">
                        <span class="metric-label">Over Budget Trips:</span>
                        <span class="metric-value">${efficiency.overBudgetTrips}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Under Budget Trips:</span>
                        <span class="metric-value">${efficiency.underBudgetTrips}</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateMonthlySpending() {
        const container = document.getElementById('monthly-spending-chart');
        if (!container) return;

        const monthlyData = this.calculateMonthlySpending();
        
        if (monthlyData.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-chart-bar"></i>
                    <p>No spending data available</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="monthly-chart">
                ${monthlyData.map(month => `
                    <div class="month-bar">
                        <div class="month-label">${month.month}</div>
                        <div class="month-amount">${this.formatCurrency(month.amount)}</div>
                        <div class="month-visual">
                            <div class="month-fill" style="height: ${month.percentage}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getAllExpenses() {
        const allExpenses = [];
        this.trips.forEach(trip => {
            trip.expenses.forEach(expense => {
                allExpenses.push({
                    ...expense,
                    tripId: trip.id,
                    tripName: trip.name
                });
            });
        });
        return allExpenses;
    }

    calculateSpendingTrends(expenses) {
        const tripTotals = {};
        this.trips.forEach(trip => {
            const tripTotal = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
            tripTotals[trip.name] = tripTotal;
        });

        const tripSpending = Object.entries(tripTotals).map(([name, amount]) => ({ name, amount }));
        const totalSpent = tripSpending.reduce((sum, trip) => sum + trip.amount, 0);
        const averagePerTrip = tripSpending.length > 0 ? totalSpent / tripSpending.length : 0;
        const mostExpensive = Math.max(...tripSpending.map(trip => trip.amount), 0);

        return {
            tripSpending,
            averagePerTrip,
            mostExpensive,
            totalTrips: tripSpending.length
        };
    }

    generateTrendChart(tripSpending) {
        if (tripSpending.length === 0) return '<p class="no-data">No spending data</p>';
        
        const maxAmount = Math.max(...tripSpending.map(trip => trip.amount));
        
        return tripSpending.map(trip => `
            <div class="trend-bar">
                <div class="trend-label">${trip.name}</div>
                <div class="trend-visual">
                    <div class="trend-fill" style="width: ${(trip.amount / maxAmount) * 100}%"></div>
                </div>
                <div class="trend-amount">${this.formatCurrency(trip.amount)}</div>
            </div>
        `).join('');
    }

    calculateBudgetEfficiency() {
        let totalBudget = 0;
        let totalSpent = 0;
        let overBudgetTrips = 0;
        let underBudgetTrips = 0;

        this.trips.forEach(trip => {
            totalBudget += trip.budget;
            const tripSpent = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
            totalSpent += tripSpent;
            
            if (tripSpent > trip.budget) {
                overBudgetTrips++;
            } else if (tripSpent < trip.budget) {
                underBudgetTrips++;
            }
        });

        const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        const savingsRate = totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 0;

        return {
            utilization: Math.min(utilization, 100),
            savingsRate: Math.max(savingsRate, 0),
            overBudgetTrips,
            underBudgetTrips
        };
    }

    calculateMonthlySpending() {
        const monthlyTotals = {};
        
        this.trips.forEach(trip => {
            trip.expenses.forEach(expense => {
                const date = new Date(expense.date);
                const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                
                if (!monthlyTotals[monthKey]) {
                    monthlyTotals[monthKey] = 0;
                }
                monthlyTotals[monthKey] += expense.amount;
            });
        });

        // Convert to array with proper date sorting
        const monthlyData = Object.entries(monthlyTotals)
            .map(([month, amount]) => {
                // Parse the month string back to a date for proper sorting
                const [monthName, year] = month.split(' ');
                const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
                const fullDate = new Date(year, monthIndex);
                
                return { 
                    month, 
                    amount, 
                    sortDate: fullDate 
                };
            })
            .sort((a, b) => a.sortDate - b.sortDate)
            .slice(-6) // Last 6 months
            .map(({ month, amount }) => ({ month, amount })); // Remove sortDate

        const maxAmount = Math.max(...monthlyData.map(month => month.amount), 1);
        
        return monthlyData.map(month => ({
            ...month,
            percentage: (month.amount / maxAmount) * 100
        }));
    }

    getTripName(tripId) {
        const trip = this.trips.find(t => t.id === tripId);
        return trip ? trip.name : 'Unknown Trip';
    }

    // Photo Storage Management
    getStorageUsage() {
        const photos = this.photos;
        const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
        const totalPhotos = photos.length;
        const averageSize = totalPhotos > 0 ? totalSize / totalPhotos : 0;
        
        return {
            totalSize: totalSize,
            totalPhotos: totalPhotos,
            averageSize: averageSize,
            storageUsed: this.formatFileSize(totalSize),
            averageSizeFormatted: this.formatFileSize(averageSize)
        };
    }

    cleanupOldPhotos() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const oldPhotos = this.photos.filter(photo => 
            new Date(photo.date) < thirtyDaysAgo
        );
        
        if (oldPhotos.length > 0) {
            const confirmCleanup = confirm(
                `Found ${oldPhotos.length} photos older than 30 days. ` +
                `This will free up ${this.formatFileSize(
                    oldPhotos.reduce((sum, photo) => sum + photo.size, 0)
                )} of storage. Remove old photos?`
            );
            
            if (confirmCleanup) {
                this.photos = this.photos.filter(photo => 
                    new Date(photo.date) >= thirtyDaysAgo
                );
                this.savePhotos();
                this.showNotification(`${oldPhotos.length} old photos removed!`, 'success');
                return true;
            }
        } else {
            this.showNotification('No old photos found to clean up.', 'info');
        }
        return false;
    }

    exportPhotos() {
        const photos = this.photos;
        if (photos.length === 0) {
            this.showNotification('No photos to export', 'info');
            return;
        }

        // Create a zip-like structure for export
        const exportData = {
            photos: photos.map(photo => ({
                id: photo.id,
                tripId: photo.tripId,
                tripName: this.getTripName(photo.tripId),
                caption: photo.caption,
                date: photo.date,
                fileName: photo.fileName,
                size: photo.size,
                originalSize: photo.originalSize || photo.size
            })),
            exportDate: new Date().toISOString(),
            totalPhotos: photos.length,
            totalSize: photos.reduce((sum, photo) => sum + photo.size, 0)
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `travel-photos-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Photo metadata exported successfully!', 'success');
    }

    showStorageInfo() {
        const usage = this.getStorageUsage();
        const firebaseCapacity = this.calculateFirebaseCapacity();
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'storage-info-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-hdd"></i> Photo Storage Information</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="storage-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total Photos:</span>
                            <span class="stat-value">${usage.totalPhotos}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Local Storage Used:</span>
                            <span class="stat-value">${usage.storageUsed}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Average Photo Size:</span>
                            <span class="stat-value">${usage.averageSizeFormatted}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Firebase Capacity:</span>
                            <span class="stat-value">${firebaseCapacity.maxPhotos.toLocaleString()} photos</span>
                        </div>
                    </div>
                    <div class="firebase-stats">
                        <h4><i class="fas fa-cloud"></i> Firebase Storage Analysis</h4>
                        <div class="stat-item">
                            <span class="stat-label">Metadata per photo:</span>
                            <span class="stat-value">~${firebaseCapacity.metadataSize} bytes</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Free tier storage:</span>
                            <span class="stat-value">1 GB</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Photos without images:</span>
                            <span class="stat-value">${firebaseCapacity.maxPhotos.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Current usage:</span>
                            <span class="stat-value">${firebaseCapacity.currentUsage} bytes</span>
                        </div>
                    </div>
                    <div class="storage-actions">
                        <button class="btn btn-primary" onclick="travelPlanner.cleanupOldPhotos(); this.closest('.modal').remove()">
                            <i class="fas fa-broom"></i> Clean Old Photos
                        </button>
                        <button class="btn btn-secondary" onclick="travelPlanner.exportPhotos(); this.closest('.modal').remove()">
                            <i class="fas fa-download"></i> Export Photo Data
                        </button>
                    </div>
                    <div class="storage-info">
                        <h4>Storage Details:</h4>
                        <ul>
                            <li><strong>Hybrid Storage:</strong> Images stored locally (Base64), metadata in Firebase</li>
                            <li><strong>Firebase Benefits:</strong> Cross-device sync, unlimited metadata storage</li>
                            <li><strong>Local Benefits:</strong> Fast loading, offline access, no API costs</li>
                            <li><strong>Capacity:</strong> ${firebaseCapacity.maxPhotos.toLocaleString()} photo records in Firebase</li>
                            <li><strong>Images:</strong> Stored locally for performance, metadata synced to cloud</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    calculateFirebaseCapacity() {
        // Firebase Firestore free tier: 1GB storage
        const freeTierBytes = 1024 * 1024 * 1024; // 1GB
        
        // Estimated metadata size per photo (without image data)
        const metadataSize = 150; // bytes per photo record
        
        // Current usage
        const currentUsage = this.photos.length * metadataSize;
        
        // Maximum photos possible
        const maxPhotos = Math.floor(freeTierBytes / metadataSize);
        
        return {
            maxPhotos: maxPhotos,
            metadataSize: metadataSize,
            currentUsage: currentUsage,
            freeTierBytes: freeTierBytes
        };
    }

    // Authentication Methods
    setupAuth() {
        // Listen for authentication state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('User signed in:', user.email);
                this.showApp();
                this.loadUserData();
            } else {
                console.log('User signed out');
                this.showLogin();
            }
        });
    }

    showLogin() {
        // Redirect to separate login page
        window.location.href = 'login.html';
    }

    showApp() {
        // User is authenticated, show the app
        document.getElementById('main-content').style.display = 'block';
    }

    async handleSignOut() {
        try {
            await signOut(auth);
            this.showNotification('Signed out successfully', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
            this.showNotification('Error signing out', 'error');
        }
    }

    loadUserData() {
        // Load user-specific data from Firebase
        console.log('Loading user data...');
        // This will be implemented when we add Firebase data sync
    }

    showLoading(message = 'Loading...') {
        // Create or update loading indicator
        let loading = document.getElementById('loading-indicator');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loading-indicator';
            loading.className = 'loading-overlay';
            loading.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            document.body.appendChild(loading);
        } else {
            loading.querySelector('p').textContent = message;
        }
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('loading-indicator');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showTerms() {
        alert('Terms of Service: By using Bradley\'s Travel Planner, you agree to our terms of service. This is a demo application.');
    }

    showPrivacy() {
        alert('Privacy Policy: Your data is stored securely and will not be shared with third parties. This is a demo application.');
    }
}

// Global functions for HTML onclick handlers

// Make signOut available immediately
function handleSignOut() {
    if (travelPlanner) {
        travelPlanner.handleSignOut();
    } else {
        console.log('TravelPlanner not initialized yet');
    }
}


function showCreateTripModal() {
    if (travelPlanner) {
        travelPlanner.showCreateTripModal();
    }
}

function closeCreateTripModal() {
    if (travelPlanner) {
        travelPlanner.closeCreateTripModal();
    }
}

function closeTripDetailsModal() {
    if (travelPlanner) {
        travelPlanner.closeTripDetailsModal();
    }
}

function createTrip(event) {
    if (travelPlanner) {
        travelPlanner.createTrip(event);
    }
}

function updateCurrency(currency) {
    if (travelPlanner) {
        travelPlanner.updateCurrency(currency);
    }
}

function exportData() {
    if (travelPlanner) {
        travelPlanner.exportData();
    }
}

function clearAllData() {
    if (travelPlanner) {
        travelPlanner.clearAllData();
    }
}


function closeCreatePackingListModal() {
    if (travelPlanner) {
        travelPlanner.closeCreatePackingListModal();
    }
}

function closeAddDocumentModal() {
    if (travelPlanner) {
        travelPlanner.closeAddDocumentModal();
    }
}

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (travelPlanner) {
        travelPlanner.cleanup();
    }
});

function closeWeatherModal() {
    if (travelPlanner) {
        travelPlanner.closeWeatherModal();
    }
}

function showTripTemplates() {
    if (travelPlanner) {
        travelPlanner.showTripTemplates();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    travelPlanner = new TravelPlanner();
    
    // Make TravelPlanner available globally for HTML onclick handlers
    window.TravelPlanner = TravelPlanner;
    window.travelPlanner = travelPlanner;
    
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


// Make all functions available globally for HTML onclick handlers
window.showSection = showSection;
window.showCreateTripModal = showCreateTripModal;
window.closeCreateTripModal = closeCreateTripModal;
window.closeTripDetailsModal = closeTripDetailsModal;
window.createTrip = createTrip;
window.updateCurrency = updateCurrency;
window.exportData = exportData;
window.clearAllData = clearAllData;
window.closeCreatePackingListModal = closeCreatePackingListModal;
window.closeAddDocumentModal = closeAddDocumentModal;
window.closeWeatherModal = closeWeatherModal;
window.showTripTemplates = showTripTemplates;
window.signOut = handleSignOut;
window.toggleMobileMenu = toggleMobileMenu;
window.showSearchSuggestions = function() {
    if (travelPlanner) travelPlanner.showSearchSuggestions();
};
window.hideSearchSuggestions = function() {
    if (travelPlanner) travelPlanner.hideSearchSuggestions();
};
window.clearSearch = function() {
    if (travelPlanner) travelPlanner.clearSearch();
};

// Mobile menu toggle function
function toggleMobileMenu() {
    console.log('toggleMobileMenu called');
    const nav = document.getElementById('main-nav');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    console.log('Nav element:', nav);
    console.log('Toggle element:', toggle);
    
    if (nav && toggle) {
        console.log('Before toggle - nav classes:', nav.className);
        nav.classList.toggle('mobile-open');
        console.log('After toggle - nav classes:', nav.className);
        
        // Update aria-expanded for accessibility
        const isOpen = nav.classList.contains('mobile-open');
        toggle.setAttribute('aria-expanded', isOpen);
        
        // Update icon
        const icon = toggle.querySelector('i');
        if (icon) {
            icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
            console.log('Icon updated to:', icon.className);
        }
    } else {
        console.error('Nav or toggle element not found');
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const nav = document.getElementById('main-nav');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    if (nav && toggle && nav.classList.contains('mobile-open')) {
        if (!nav.contains(e.target) && !toggle.contains(e.target)) {
            nav.classList.remove('mobile-open');
            toggle.setAttribute('aria-expanded', 'false');
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    }
});

// Close mobile menu when section is selected
function showSection(sectionName) {
    if (travelPlanner) {
        travelPlanner.showSection(sectionName);
        
        // Close mobile menu on mobile devices
        const nav = document.getElementById('main-nav');
        const toggle = document.querySelector('.mobile-menu-toggle');
        
        if (nav && toggle && window.innerWidth <= 768) {
            nav.classList.remove('mobile-open');
            toggle.setAttribute('aria-expanded', 'false');
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    } else {
        console.log('TravelPlanner not initialized yet');
    }
}

// PWA wrapper functions
window.dismissInstallPrompt = function() {
    if (window.travelPlanner) {
        window.travelPlanner.dismissInstallPrompt();
    } else {
        console.log('TravelPlanner not initialized yet');
    }
};

window.installApp = function() {
    if (window.travelPlanner) {
        window.travelPlanner.installApp();
    } else {
        console.log('TravelPlanner not initialized yet');
    }
};
