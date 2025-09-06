// Authentication Script for Login Page
// By Bradley Virtual Solutions, LLC

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

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Listen for authentication state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('User signed in:', user.email);
                // Redirect to main app
                window.location.href = 'index.html';
            } else {
                console.log('User signed out');
                // Stay on login page
            }
        });

        // Setup login form event listeners
        this.setupLoginEventListeners();
    }

    setupLoginEventListeners() {
        // Sign in form
        const signinForm = document.getElementById('signin-form-element');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignIn(e);
            });
        }

        // Sign up form
        const signupForm = document.getElementById('signup-form-element');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignUp(e);
            });
        }

        // Password strength checker
        const signupPassword = document.getElementById('signup-password');
        if (signupPassword) {
            signupPassword.addEventListener('input', () => {
                this.checkPasswordStrength(signupPassword.value);
            });
        }
    }


    async handleSignIn(e) {
        try {
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            if (!this.validateInput(email, 'email')) {
                this.showNotification('Please enter a valid email address', 'error');
                return;
            }

            if (!password || password.length < 6) {
                this.showNotification('Password must be at least 6 characters', 'error');
                return;
            }

            this.showLoading('Signing in...');

            await signInWithEmailAndPassword(auth, email, password);
            this.showNotification('Welcome back!', 'success');

        } catch (error) {
            console.error('Sign in error:', error);
            this.handleAuthError(error);
        } finally {
            this.hideLoading();
        }
    }

    async handleSignUp(e) {
        try {
            const firstName = document.getElementById('signup-firstname').value;
            const lastName = document.getElementById('signup-lastname').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            const termsAgreed = document.getElementById('terms-agreement').checked;

            // Validation
            if (!this.validateInput(firstName, 'text', 50)) {
                this.showNotification('Please enter a valid first name', 'error');
                return;
            }

            if (!this.validateInput(lastName, 'text', 50)) {
                this.showNotification('Please enter a valid last name', 'error');
                return;
            }

        if (!this.validateInput(email, 'email')) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        if (!password || password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

            if (password !== confirmPassword) {
                this.showNotification('Passwords do not match', 'error');
                return;
            }

            if (!termsAgreed) {
                this.showNotification('Please agree to the terms and conditions', 'error');
                return;
            }

            this.showLoading('Creating account...');

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update user profile
            await updateProfile(userCredential.user, {
                displayName: `${firstName} ${lastName}`
            });

            this.showNotification('Account created successfully!', 'success');

        } catch (error) {
            console.error('Sign up error:', error);
            this.handleAuthError(error);
        } finally {
            this.hideLoading();
        }
    }

    async signInWithGoogle() {
        try {
            this.showLoading('Signing in with Google...');
            
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            
            this.showNotification('Signed in with Google!', 'success');

        } catch (error) {
            console.error('Google sign in error:', error);
            this.handleAuthError(error);
        } finally {
            this.hideLoading();
        }
    }

    async signUpWithGoogle() {
        // Same as sign in for Google
        await this.signInWithGoogle();
    }

    async showForgotPassword() {
        const email = prompt('Enter your email address to reset password:');
        if (email && this.validateInput(email, 'email')) {
            try {
                this.showLoading('Sending reset email...');
                await sendPasswordResetEmail(auth, email);
                this.showNotification('Password reset email sent!', 'success');
            } catch (error) {
                console.error('Password reset error:', error);
                this.handleAuthError(error);
            } finally {
                this.hideLoading();
            }
        }
    }

    handleAuthError(error) {
        let message = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                message = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password. Please try again.';
                break;
            case 'auth/email-already-in-use':
                message = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/invalid-email':
                message = 'Invalid email address.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your connection.';
                break;
        }
        
        this.showNotification(message, 'error');
    }

    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;

        let strength = 0;
        let strengthLabel = '';

        // Length check
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 25;

        // Character variety checks
        if (/[a-z]/.test(password)) strength += 10;
        if (/[A-Z]/.test(password)) strength += 10;
        if (/[0-9]/.test(password)) strength += 10;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;

        // Update UI
        strengthBar.className = 'strength-fill';
        if (strength < 25) {
            strengthBar.classList.add('weak');
            strengthLabel = 'Weak';
        } else if (strength < 50) {
            strengthBar.classList.add('fair');
            strengthLabel = 'Fair';
        } else if (strength < 75) {
            strengthBar.classList.add('good');
            strengthLabel = 'Good';
        } else {
            strengthBar.classList.add('strong');
            strengthLabel = 'Strong';
        }

        strengthText.textContent = strengthLabel;
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

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    validateInput(input, type = 'text', maxLength = 255) {
        if (!input || typeof input !== 'string') return false;
        
        const sanitized = this.sanitizeInput(input);
        if (sanitized.length === 0 || sanitized.length > maxLength) return false;
        
        switch (type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(sanitized);
            case 'text':
                return sanitized.length > 0;
            case 'number':
                return !isNaN(parseFloat(sanitized)) && isFinite(sanitized);
            case 'date':
                return !isNaN(Date.parse(sanitized));
            case 'currency':
                return !isNaN(parseFloat(sanitized)) && parseFloat(sanitized) >= 0;
            default:
                return true;
        }
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    showTerms() {
        this.showModal('Terms of Service', `
            <div style="max-height: 60vh; overflow-y: auto; padding: 1rem 0;">
                <h3 style="color: #1e293b; margin-bottom: 1rem; font-size: 1.5rem;">Terms of Service</h3>
                <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.9rem;">Last updated: ${new Date().toLocaleDateString()}</p>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">1. Acceptance of Terms</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        By accessing and using Bradley's Travel Planner ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">2. Use License</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        Permission is granted to temporarily use Bradley's Travel Planner for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">3. User Accounts</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">4. Prohibited Uses</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        You may not use our Service for any unlawful purpose or to solicit others to perform unlawful acts. You may not violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">5. Disclaimer</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        The information on this Service is provided on an "as is" basis. To the fullest extent permitted by law, Bradley Virtual Solutions, LLC excludes all representations, warranties, conditions and terms.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">6. Contact Information</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        If you have any questions about these Terms of Service, please contact us at Bradley Virtual Solutions, LLC.
                    </p>
                </div>
            </div>
        `);
    }

    showPrivacy() {
        this.showModal('Privacy Policy', `
            <div style="max-height: 60vh; overflow-y: auto; padding: 1rem 0;">
                <h3 style="color: #1e293b; margin-bottom: 1rem; font-size: 1.5rem;">Privacy Policy</h3>
                <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.9rem;">Last updated: ${new Date().toLocaleDateString()}</p>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">1. Information We Collect</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include your name, email address, and travel planning data.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">2. How We Use Your Information</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">3. Information Sharing</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with service providers who assist us in operating our service.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">4. Data Security</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted and stored securely using industry-standard practices.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">5. Data Retention</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">6. Your Rights</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us. To exercise these rights, please contact us.
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">7. Contact Us</h4>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 1rem;">
                        If you have any questions about this Privacy Policy, please contact us at Bradley Virtual Solutions, LLC.
                    </p>
                </div>
            </div>
        `);
    }

    showModal(title, content) {
        // Remove existing modal if any
        const existingModal = document.querySelector('.legal-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'legal-modal';
        modal.innerHTML = `
            <div class="legal-modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="legal-modal-content">
                <div class="legal-modal-header">
                    <h2>${title}</h2>
                    <button class="legal-modal-close" onclick="this.closest('.legal-modal').remove()">&times;</button>
                </div>
                <div class="legal-modal-body">
                    ${content}
                </div>
                <div class="legal-modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.legal-modal').remove()">Close</button>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(modal);

        // Add styles if not already added
        if (!document.querySelector('#legal-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'legal-modal-styles';
            styles.textContent = `
                .legal-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    box-sizing: border-box;
                }

                .legal-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .legal-modal-content {
                    position: relative;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                    max-width: 600px;
                    width: 100%;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .legal-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #e5e7eb;
                    background: #f9fafb;
                }

                .legal-modal-header h2 {
                    margin: 0;
                    color: #1f2937;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .legal-modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .legal-modal-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .legal-modal-body {
                    padding: 0;
                    overflow-y: auto;
                    flex: 1;
                }

                .legal-modal-footer {
                    padding: 1.5rem 2rem;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                    text-align: right;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: #3b82f6;
                    color: white;
                }

                .btn-primary:hover {
                    background: #2563eb;
                }

                @media (max-width: 768px) {
                    .legal-modal-content {
                        margin: 0.5rem;
                        max-height: 90vh;
                    }
                    
                    .legal-modal-header,
                    .legal-modal-footer {
                        padding: 1rem 1.5rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
}


// Initialize authentication manager
let authManager;

// Define global functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function signInWithGoogle() {
    if (authManager) {
        authManager.signInWithGoogle();
    }
}

function signUpWithGoogle() {
    if (authManager) {
        authManager.signUpWithGoogle();
    }
}

function showForgotPassword() {
    if (authManager) {
        authManager.showForgotPassword();
    }
}

function showTerms() {
    if (authManager) {
        authManager.showTerms();
    }
}

function showPrivacy() {
    if (authManager) {
        authManager.showPrivacy();
    }
}

// Make functions available globally immediately
window.togglePassword = togglePassword;
window.signInWithGoogle = signInWithGoogle;
window.signUpWithGoogle = signUpWithGoogle;
window.showForgotPassword = showForgotPassword;
window.showTerms = showTerms;
window.showPrivacy = showPrivacy;

document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// Add notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        padding: 1rem 1.5rem;
        z-index: 10002;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 400px;
    }

    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .notification-content i {
        font-size: 1.2rem;
    }

    .notification-success {
        border-left: 4px solid #28a745;
    }

    .notification-success i {
        color: #28a745;
    }

    .notification-error {
        border-left: 4px solid #dc3545;
    }

    .notification-error i {
        color: #dc3545;
    }

    .notification-info {
        border-left: 4px solid #17a2b8;
    }

    .notification-info i {
        color: #17a2b8;
    }

    .notification-content span {
        color: #333;
        font-weight: 500;
    }
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
