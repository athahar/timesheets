// Simplified i18n implementation for debugging
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = 'user_language';

// Get app display name from env or use default
const APP_DISPLAY_NAME = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'TrackPay';

// Simple translations
const translations = {
  'en-US': {
    'lang.english': 'English',
    'lang.spanish': 'Español',
    'welcome.title': 'Track time. Request payments. Get paid faster.',
    'welcome.subtitle': 'The simple way to track your work and get paid by clients.',
    'welcome.create': 'Create Account',
    'welcome.signin': 'Sign In',
    'welcome.invite': 'Have an invite code?',
    // USP Features
    'usp.timeTracking.title': 'Time Tracking',
    'usp.timeTracking.subtitle': 'Start and stop sessions with precision timing',
    'usp.paymentRequests.title': 'Payment Requests',
    'usp.paymentRequests.subtitle': 'Request payment and get notified when clients confirm',
    'usp.inviteClients.title': 'Invite Your Clients',
    'usp.inviteClients.subtitle': 'Share a workspace where they see hours and requests',

    // Auth Screens
    'register.title': 'Create Account',
    'register.subtitle': 'Track your time and get paid faster',
    'register.fullName': 'Full Name',
    'register.email': 'Email',
    'register.password': 'Password',
    'register.confirmPassword': 'Confirm Password',
    'register.accountType': 'Account Type',
    'register.roleProvider': 'Service Provider',
    'register.roleClient': 'Client',
    'register.roleProviderDescription': 'Baby-sitter, house cleaner, tutor, and more',
    'register.roleClientDescription': 'Hire providers and view their work',
    'register.hourlyRate': 'Hourly Rate (Optional)',
    'register.createButton': 'Create Account',
    'register.creating': 'Creating Account...',
    'register.hasAccount': 'Already have an account?',
    'register.signIn': 'Sign In',
    'register.inviteJoiningAs': 'You\'re joining as a {{role}} (invited by {{inviterName}})',

    // Form placeholders
    'register.fullNamePlaceholder': 'Enter your full name',
    'register.emailPlaceholder': 'your@email.com',
    'register.passwordPlaceholder': 'Create a secure password',
    'register.confirmPasswordPlaceholder': 'Confirm your password',

    // Form validation errors
    'register.errors.displayNameRequired': 'Please enter your full name',
    'register.errors.emailRequired': 'Please enter your email address',
    'register.errors.emailInvalid': 'Please enter a valid email address',
    'register.errors.passwordRequired': 'Please enter a password',
    'register.errors.passwordTooShort': 'Password must be at least 6 characters long',
    'register.errors.confirmPasswordRequired': 'Please confirm your password',
    'register.errors.passwordMismatch': 'Passwords do not match',
    'register.errors.roleRequired': 'Please select your account type',
    'register.errors.failed': 'Registration Failed',
    'register.errors.error': 'Error',
    'register.errors.unexpected': 'An unexpected error occurred. Please try again.',

    // Success messages
    'register.success.welcome': 'Welcome!',
    'register.success.accountCreated': 'Account Created',
    'register.success.joinedWorkspace': 'Your account has been created and you\'ve successfully joined {{inviterName}}\'s workspace!',
    'register.success.useInviteAgain': 'Your account has been created successfully! Please use your invite code again to join the workspace.',
    'register.success.canStartUsing': `Your account has been created successfully! You can now start using ${APP_DISPLAY_NAME}.`,

    'login.title': 'Welcome Back',
    'login.subtitle': `Sign in to your ${APP_DISPLAY_NAME} account`,
    'login.back': 'Back',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.signInButton': 'Sign In',
    'login.signingIn': 'Signing In...',
    'login.forgotPassword': 'Forgot Password?',
    'login.noAccount': 'Don\'t have an account?',
    'login.createAccount': 'Create Account',

    // Login form placeholders
    'login.emailPlaceholder': 'your@email.com',
    'login.passwordPlaceholder': 'Enter your password',

    // Login validation errors
    'login.errors.emailRequired': 'Please enter your email address',
    'login.errors.emailInvalid': 'Please enter a valid email address',
    'login.errors.passwordRequired': 'Please enter your password',
    'login.errors.failed': 'Sign In Failed',
    'login.errors.error': 'Error',
    'login.errors.unexpected': 'An unexpected error occurred. Please try again.',

    'forgotPassword.title': 'Reset Password',
    'forgotPassword.subtitle': 'We\'ll email you a reset link',
    'forgotPassword.back': 'Back',
    'forgotPassword.email': 'Email Address',
    'forgotPassword.emailPlaceholder': 'your@email.com',
    'forgotPassword.sendButton': 'Send Reset Link',
    'forgotPassword.sending': 'Sending...',
    'forgotPassword.rememberPassword': 'Remember your password?',
    'forgotPassword.signIn': 'Sign In',
    'forgotPassword.checkEmail': 'Check Your Email',
    'forgotPassword.emailSent': 'We\'ve sent a password reset link to {{email}}. Check your email and follow the instructions to reset your password.',
    'forgotPassword.didntReceive': 'Didn\'t receive the email? Check your spam folder or try again.',
    'forgotPassword.tryAgain': 'Try Again',
    'forgotPassword.backToSignIn': 'Back to Sign In',

    // ForgotPassword errors
    'forgotPassword.errors.validationError': 'Validation Error',
    'forgotPassword.errors.emailRequired': 'Please enter your email address',
    'forgotPassword.errors.emailInvalid': 'Please enter a valid email address',
    'forgotPassword.errors.resetFailed': 'Reset Failed',
    'forgotPassword.errors.error': 'Error',
    'forgotPassword.errors.unexpected': 'An unexpected error occurred. Please try again.',

    'inviteClaim.title': 'Claim Your Invite',
    'inviteClaim.subtitle': 'Enter your invite code to get started',
    'inviteClaim.inviteCode': 'Invite Code',
    'inviteClaim.placeholder': 'ABC123',
    'inviteClaim.helperText': 'Enter the 6-8 character code from your provider',
    'inviteClaim.validating': 'Validating code...',
    'inviteClaim.validCode': 'Valid invite code',
    'inviteClaim.wantsToWork': '{{clientName}} wants to work with you',
    'inviteClaim.invitedBy': 'Invited by {{clientName}}',
    'inviteClaim.noCode': 'Don\'t have an invite code? Ask your service provider.',
    'inviteClaim.joinButton': 'Join Workspace',

    // InviteClaim errors
    'inviteClaim.errors.codeRequired': 'Please enter an invite code',
    'inviteClaim.errors.invalidCode': 'Please enter a valid invite code',
    'inviteClaim.errors.invalidFormat': 'Invalid invite code format',
    'inviteClaim.errors.validationError': 'Error validating invite code',
    'inviteClaim.errors.error': 'Error',
    'inviteClaim.errors.claimFailed': 'Failed to claim invite. Please try again.',

    // InviteClaim success messages
    'inviteClaim.success.title': 'Success!',
    'inviteClaim.success.continue': 'Continue',
    'inviteClaim.success.acceptedWork': 'You\'ve accepted the work opportunity with {{clientName}}',
    'inviteClaim.success.joinedWorkspace': 'You\'ve successfully joined {{clientName}}\'s workspace',

    // Settings Screen
    'settings.title': 'Settings',
    'settings.name': 'Name',
    'settings.email': 'Email',
    'settings.language': 'Language',
    'settings.languageDescription': 'Choose your preferred language',
    'settings.signOut': 'Sign Out',
    'settings.signOutConfirm': 'Are you sure you want to sign out?',
    'settings.cancel': 'Cancel',
    'settings.back': 'Back',
    'settings.successUpdated': 'Settings updated successfully',
    'settings.errorUpdateFailed': 'Failed to update settings',
    'settings.namePlaceholder': 'Enter your name',

    // SimpleClientListScreen
    'clientList.loading': 'Loading...',
    'clientList.welcome': 'Welcome!',
    'clientList.addClient': 'Add Client',
    'clientList.addNewClient': '+ Add New Client',
    'clientList.logout': 'Logout',
    'clientList.totalOutstanding': 'Total Outstanding',
    'clientList.statusPaidUp': 'Paid up',
    'clientList.statusDue': 'Due {{amount}}',
    'clientList.statusRequested': '{{amount}} Requested',
    'clientList.statusActive': 'Active • {{timer}}',
    'clientList.invite': 'Invite',
    'clientList.errorTitle': 'Error',
    'clientList.noInviteCode': 'No invite code found for this client',
    'clientList.inviteLoadError': 'Failed to load invite code',
    'clientList.logoutError': 'Failed to logout. Please try again.',
    'clientList.workInProgress': 'Work In Progress',
    'clientList.myClients': 'My Clients',
    'clientList.errorLoadClients': 'Failed to load clients',
    'clientList.errorClientName': 'Please enter a client name',
    'clientList.errorHourlyRate': 'Please enter a valid hourly rate',
    'clientList.errorAddClient': 'Failed to add client',
    'clientList.errorStartSession': 'Failed to start session',
    'clientList.errorNoActiveSession': 'No active session found',
    'clientList.errorStopSession': 'Failed to stop session',

    // Zero State Content
    'clientList.howItWorks': 'How it works',
    'clientList.step1.title': 'Add a Client',
    'clientList.step1.description': 'Name and hourly rate. That\'s it.',
    'clientList.step2.title': 'Track Hours',
    'clientList.step2.description': 'Start and stop sessions with precision timing.',
    'clientList.step3.title': 'Invite & Request Payment',
    'clientList.step3.description': 'Share your workspace, send requests, get notified when they confirm.',
    'clientList.cta.title': 'Let\'s Set You Up',
    'clientList.cta.subtitle': 'Track hours, request payment, and invite clients to a shared workspace.',
    'clientList.cta.addClient': 'Add Client',

    // ServiceProviderListScreen
    'providerList.logout': 'Logout',
    'providerList.logoutError': 'Failed to logout. Please try again.',
    'providerList.errorTitle': 'Error',
    'providerList.serviceProvider': 'Service Provider',
    'providerList.paymentRequested': 'Payment Requested',
    'providerList.paymentRequestedAmount': 'Payment requested: ${{amount}}',
    'providerList.youOwe': 'You owe: ${{amount}}',
    'providerList.youOweWithRequested': 'You owe: ${{total}} (${{requested}} requested)',
    'providerList.unpaidHours': '{{hours}} unpaid',
    'providerList.requestedHours': '{{hours}} requested',
    'providerList.unpaidAndRequested': '{{unpaid}} unpaid, {{requested}} requested',
    'providerList.allPaidUp': 'All paid up',
    'providerList.title': 'Service Providers',
    'providerList.totalYouOwe': 'Total You Owe',
    'providerList.emptyTitle': 'No service providers yet',
    'providerList.emptySubtitle': 'You\'ll see providers you work with here',

    // ClientWelcomeModal (post-invite claim success)
    'clientWelcome.title': 'Welcome to TrackPay',
    'clientWelcome.subtitle': 'You\'ve joined {{providerName}}\'s workspace.',
    'clientWelcome.cta': 'Continue',

    // Client home empty state
    'clientList.emptyTitle': 'No providers yet',
    'clientList.emptySubtitle': 'Ask your service provider for your invite code.',

    // ClientHistoryScreen
    'clientHistory.loading': 'Loading...',
    'clientHistory.clientNotFound': 'Client not found',
    'clientHistory.errorTitle': 'Error',
    'clientHistory.loadError': 'Failed to load client data',
    'clientHistory.sessionStartError': 'Failed to start session',
    'clientHistory.sessionEndError': 'Failed to end session',
    'clientHistory.noUnpaidSessions': 'There are no unpaid sessions to request payment for.',
    'clientHistory.pendingRequestExists': 'A payment request for this client is already pending.',
    'clientHistory.requestFailed': 'Unable to send payment request. Please try again.',
    'clientHistory.paymentRequested': 'Payment request for {{amount}} sent to {{clientName}}',
    'clientHistory.invitePending': 'Invite pending',
    'clientHistory.clients': 'Clients',
    'clientHistory.profile': 'Profile',
    'clientHistory.balanceDue': 'Balance due: ',
    'clientHistory.requestPayment': 'Request Payment',
    'clientHistory.startSession': 'Start Session',
    'clientHistory.endSession': 'End Session',
    'clientHistory.activityTimeline': 'Activity Timeline',
    'clientHistory.today': 'Today',
    'clientHistory.yesterday': 'Yesterday',
    'clientHistory.paymentRequestedActivity': 'Payment requested',
    'clientHistory.workSession': 'Work Session',
    'clientHistory.unpaid': 'unpaid',
    'clientHistory.activeSince': 'Active since {{time}}',
    'clientHistory.crewSize': 'Crew size',
    'clientHistory.crewSetBefore': 'Set before starting',
    'clientHistory.crewApplies': 'Applies to the entire session',
    'clientHistory.persons': 'Person(s)',
    'clientHistory.errorUpdateCrewSize': 'Unable to update crew size. Please try again.',
    'clientHistory.total': 'Total',
    'clientHistory.session': 'session',
    'clientHistory.sessions': 'sessions',

    // ClientProfileScreen
    'clientProfile.loading': 'Loading Client Profile...',
    'clientProfile.clientNotFound': 'Client not found',
    'clientProfile.errorLoadData': 'Failed to load client data',
    'clientProfile.invalidEmail': 'Invalid Email',
    'clientProfile.invalidEmailMessage': 'Please enter a valid email address',
    'clientProfile.invalidRate': 'Invalid Rate',
    'clientProfile.invalidRateMessage': 'Please enter a valid hourly rate',
    'clientProfile.successUpdated': 'Client profile updated successfully',
    'clientProfile.errorUpdateFailed': 'Failed to update client profile',
    'clientProfile.clientName': 'Client Name',
    'clientProfile.emailOptional': 'Email (Optional)',
    'clientProfile.emailPlaceholder': 'client@example.com',
    'clientProfile.namePlaceholder': 'Enter client name',
    'clientProfile.hourlyRate': 'Hourly Rate',
    'clientProfile.ratePlaceholder': '0.00',
    'clientProfile.saveChanges': 'Save Changes',
    'clientProfile.hourlyRateInfo': 'This is your current hourly rate for working with {{clientName}}. The rate is used to calculate earnings for all work sessions.',
    'clientProfile.inviteCodeTitle': 'Invite Code',
    'clientProfile.inviteCodeDescription': '{{clientName}} hasn\'t claimed their account yet. Share this invite code with them:',
    'clientProfile.shareCode': 'Share Code',
    'clientProfile.deleteClient': 'Delete Client',
    'clientProfile.cannotDeleteTitle': 'Cannot Delete',
    'clientProfile.activeSessionMessage': '{{clientName}} has an active session running. Stop the session before deleting.',
    'clientProfile.unpaidBalanceMessage': '{{clientName}} has an outstanding balance of {{amount}}. Resolve this before deleting.',
    'clientProfile.paymentRequestMessage': '{{clientName}} has outstanding payment requests. Resolve these before deleting.',
    'clientProfile.viewSessions': 'View Sessions',
    'clientProfile.deleteConfirmTitle': 'Delete Client',
    'clientProfile.deleteConfirmMessage': 'Remove your connection with {{clientName}}? This will not delete their account or work history.',
    'clientProfile.successDeleted': '{{clientName}} removed from your clients',
    'clientProfile.alreadyDeleted': 'This client was already removed',
    'clientProfile.errorDeleteFailed': 'Please resolve active sessions or unpaid items before deleting.',
    'clientProfile.offlineWarning': 'No internet connection',

    // ProviderProfileScreen
    'providerProfile.hourlyRate': 'Hourly Rate',
    'providerProfile.hourlyRateInfo': 'This is the hourly rate {{providerName}} charges for work. All sessions are calculated using this rate.',

    // Empty state messages
    'emptyState.noWork': 'No work yet',
    'emptyState.workWillAppear': 'Work sessions and payments will appear here.',
    'emptyState.startFirst': 'Start your first session',
    'emptyState.noSessions': 'No sessions yet',
    'emptyState.firstSessionHint': 'Start your first session to see it here',

    // StyledSessionTrackingScreen
    'sessionTracking.loading': 'Loading...',
    'sessionTracking.clientNotFound': 'Client not found',
    'sessionTracking.errorTitle': 'Error',
    'sessionTracking.loadError': 'Failed to load client data',
    'sessionTracking.startError': 'Failed to start session',
    'sessionTracking.endError': 'Failed to end session',
    'sessionTracking.startSession': 'Start Session',
    'sessionTracking.endSession': 'End Session',
    'sessionTracking.pause': 'Pause',
    'sessionTracking.resume': 'Resume',
    'sessionTracking.sessionActive': 'Session Active',
    'sessionTracking.sessionPaused': 'Session Paused',
    'sessionTracking.hourlyRate': '${{rate}}/hour',
    'sessionTracking.totalEarned': 'Total Earned: {{amount}}',

    // AddClientModal
    'addClient.title': 'Add New Client',
    'addClient.clientName': 'Client Name',
    'addClient.emailOptional': 'Email (Optional)',
    'addClient.emailPlaceholder': 'client@example.com',
    'addClient.namePlaceholder': 'Enter client name',
    'addClient.hourlyRate': 'Hourly Rate',
    'addClient.ratePlaceholder': '0.00',
    'addClient.perHour': '/hour',
    'addClient.rateHint': 'Enter hourly rate (USD)',
    'addClient.cancel': 'Cancel',
    'addClient.addClient': 'Add Client',
    'addClient.adding': 'Adding...',
    'addClient.nameRequired': 'Please enter a client name',
    'addClient.rateRequired': 'Hourly rate is required',
    'addClient.rateInvalid': 'Please enter a valid hourly rate',
    'addClient.errorTitle': 'Validation Error',
    'addClient.addError': 'Failed to add client. Please try again.',
    'addClient.success': 'Client added successfully',
    'addClient.successWithInvite': '{{clientName}} has been added as a client with invite code: {{inviteCode}}',
    'addClient.successMessage': '{{clientName}} has been added as a client',

    // ServiceProviderSummaryScreen
    'providerSummary.loading': 'Loading...',
    'providerSummary.loadingProviderSummary': 'Loading...',
    'providerSummary.providerNotFound': 'Provider not found',
    'providerSummary.errorTitle': 'Error',
    'providerSummary.loadError': 'Failed to load provider data',
    'providerSummary.back': 'Back',
    'providerSummary.workSummary': 'Work Summary',
    'providerSummary.totalOwed': 'Total Owed: {{amount}}',
    'providerSummary.hoursWorked': 'Hours Worked: {{hours}}',
    'providerSummary.lastSession': 'Last Session: {{date}}',
    'providerSummary.markPaid': 'Mark as Paid',
    'providerSummary.paymentHistory': 'Payment History',
    'providerSummary.balanceDue': 'Balance due: ',
    'providerSummary.recordPayment': 'Record Payment',
    'providerSummary.paidUp': 'Paid up',
    'providerSummary.activityTimeline': 'Activity Timeline',
    'providerSummary.noActivity': 'No activity yet',
    'providerSummary.noActivitySubtext': 'Work sessions and payments will appear here',
    'providerSummary.today': 'Today',
    'providerSummary.yesterday': 'Yesterday',
    'providerSummary.workSession': 'Work session',
    'providerSummary.activeSession': 'Active session • Started at {{time}}',
    'providerSummary.paymentSent': 'Payment sent',
    'providerSummary.paymentRequested': 'Payment requested',
    'providerSummary.pending': 'Pending',
    'providerSummary.session': 'session',
    'providerSummary.sessions': 'sessions',
    'providerSummary.activeSessionHint': 'Active session time isn\'t included. End session to add it.',
    'providerSummary.paymentReceived': 'Payment received',
    'providerSummary.requestedOn': 'Requested on {{date}} • {{amount}} pending',
    'providerSummary.activeSessionTitle': '⏱️ Active Session',
    'providerSummary.activeSessionInProgress': 'Active Session - In Progress',

    // StatusPill Component
    'statusPill.paid': 'Paid',
    'statusPill.unpaid': 'Unpaid',
    'statusPill.requested': 'Requested',
    'statusPill.active': 'Active',
    'statusPill.unknown': 'Unknown',
    // Legacy StatusPill entries for client status displays
    'statusPill.paidUp': 'Paid up',
    'statusPill.due': 'Due ${{amount}}',
    'statusPill.overdue': 'Overdue',

    // Toast Messages
    'toast.success': 'Success',
    'toast.error': 'Error',
    'toast.warning': 'Warning',
    'toast.paymentRecorded': 'Payment recorded',
    'toast.errorRetry': 'Pull to refresh to retry',
    'toast.info': 'Info',

    // ConfirmationModal
    'confirmation.confirm': 'Confirm',
    'confirmation.cancel': 'Cancel',
    'confirmation.title': 'Confirm Action',
    'confirmation.message': 'Are you sure you want to proceed?',
    'confirmation.processing': 'Processing...',
    'confirmation.requesting': 'Requesting...',

    // MarkAsPaidModal
    'markAsPaidModal.title': 'Mark as Paid',
    'markAsPaidModal.subtitle': 'Record payment to {{providerName}}',
    'markAsPaidModal.cancel': 'Cancel',
    'markAsPaidModal.save': 'Save',
    'markAsPaidModal.payingTo': 'Paying to',
    'markAsPaidModal.personHoursOutstanding': 'person-hours outstanding',
    'markAsPaidModal.requestedAmount': 'Requested Amount',
    'markAsPaidModal.paidAmount': 'Paid Amount',
    'markAsPaidModal.paymentAmount': 'Payment Amount',
    'markAsPaidModal.paymentDate': 'Payment Date',
    'markAsPaidModal.paymentMethod': 'Payment Method',
    'markAsPaidModal.amountPlaceholder': '0.00',
    'markAsPaidModal.datePlaceholder': 'YYYY-MM-DD',
    'markAsPaidModal.dateHint': 'Format: YYYY-MM-DD (e.g., 2024-01-15)',
    'markAsPaidModal.maximumAmount': 'Maximum: ${{amount}}',
    'markAsPaidModal.markPaid': 'Mark as Paid',
    'markAsPaidModal.recording': 'Recording...',
    'markAsPaidModal.paymentMethods.cash': 'Cash',
    'markAsPaidModal.paymentMethods.zelle': 'Zelle',
    'markAsPaidModal.paymentMethods.paypal': 'PayPal',
    'markAsPaidModal.paymentMethods.bankTransfer': 'Bank Transfer',
    'markAsPaidModal.paymentMethods.other': 'Other',

    // MarkAsPaidModal Errors
    'markAsPaidModal.errors.invalidAmount': 'Invalid Amount',
    'markAsPaidModal.errors.validAmount': 'Please enter a valid payment amount.',
    'markAsPaidModal.errors.amountTooHigh': 'Amount Too High',
    'markAsPaidModal.errors.exceedsBalance': 'Payment amount cannot exceed the unpaid balance of ${{amount}}.',
    'markAsPaidModal.errors.noSessions': 'No Sessions',
    'markAsPaidModal.errors.noSessionsAvailable': 'No sessions available for payment.',
    'markAsPaidModal.errors.noUnpaidSessions': 'No Unpaid Sessions',
    'markAsPaidModal.errors.allPaid': 'All sessions are already paid.',
    'markAsPaidModal.errors.clientError': 'Error',
    'markAsPaidModal.errors.clientNotFound': 'Unable to identify client for payment.',
    'markAsPaidModal.errors.paymentFailed': 'Failed to record payment. Please try again.',

    // MarkAsPaidModal Success
    'markAsPaidModal.success.title': 'Payment Recorded',
    'markAsPaidModal.success.message': 'Payment of ${{amount}} to {{providerName}} has been recorded.',

    // RequestPaymentModal (for inline request payment functionality)
    'requestPaymentModal.title': 'Request Payment',
    'requestPaymentModal.confirmMessage': 'Send a payment request to {{clientName}} for {{amount}}?',
    'requestPaymentModal.sendRequest': 'Send Request',
    'requestPaymentModal.cancel': 'Cancel',
    'requestPaymentModal.requesting': 'Requesting...',

    // RequestPayment Errors
    'requestPaymentModal.errors.noUnpaidSessions': 'There are no unpaid sessions to request payment for.',
    'requestPaymentModal.errors.pendingExists': 'A payment request for this client is already pending.',
    'requestPaymentModal.errors.requestFailed': 'Unable to send payment request. Please try again.',
    'requestPaymentModal.errors.failed': 'Failed to request payment',

    // RequestPayment Success
    'requestPaymentModal.success.requested': 'Payment request for {{amount}} sent to {{clientName}}',

    // ErrorBoundary
    'errorBoundary.title': 'Something went wrong',
    'errorBoundary.message': 'We\'re sorry for the inconvenience. Please try again.',
    'errorBoundary.retry': 'Try Again',

    // Form Validation Errors
    'validation.required': 'This field is required',
    'validation.emailInvalid': 'Please enter a valid email address',
    'validation.passwordTooShort': 'Password must be at least 6 characters',
    'validation.passwordMismatch': 'Passwords do not match',
    'validation.numberInvalid': 'Please enter a valid number',
    'validation.rateInvalid': 'Please enter a valid hourly rate',

    // ActivityFeedItem texts
    'activity.startedWorking': '{{clientName}} started working',
    'activity.finishedWorking': '{{clientName}} finished working',
    'activity.sessionDuration': 'Session: {{duration}} hours',
    'activity.amountDue': 'Amount due: ${{amount}}',
    'activity.paymentRequest': 'Payment request from {{clientName}}',
    'activity.amount': 'Amount: ${{amount}}',
    'activity.paymentCompleted': 'Payment completed',
    'activity.paidAmount': '${{amount}} via {{method}}',
    'activity.sessionsIncluded': '{{count}} session{{plural}} included',
    'activity.sessionsIncludedInPayment': 'Sessions included in this payment:',
    'activity.sessionNumber': 'Session #{{number}}: {{id}}...',
    'activity.tapToViewDetails': 'Tap to view session details',
    'activity.unknownActivity': 'Unknown activity',

    // ClientCard texts
    'clientCard.unpaidHours': '{{hours}} unpaid hours',
    'clientCard.noUnpaidHours': 'No unpaid hours',
    'clientCard.paidUp': 'Paid up',

    // Invite Growth Loop
    'inviteModal.sessionStoppedTitle': 'Session stopped',
    'inviteModal.requestPaymentTitle': 'Request payment',
    'inviteModal.shareHoursMessage': 'Share your hours and invite {{firstName}} to connect.',
    'inviteModal.sharePaymentMessage': '{{firstName}} isn\'t on {{appName}} yet. Share your payment request and invite them to connect.',
    'inviteModal.shareInvite': 'Share Invite',
    'inviteModal.close': 'Close',

    // Common terms
    'common.appName': APP_DISPLAY_NAME,
    'common.due': 'Due',
    'common.hrs': 'hrs',
    'common.person': 'person',
    'common.people': 'people',
    'common.crew': 'Crew',
    'common.totalOutstanding': 'Total Outstanding',
    'common.requestPayment': 'Request Payment',
    'common.hoursUnpaid': '{{count}} hours unpaid',
    'common.start': 'Start',
    'common.stop': 'Stop',
    'common.sessionStarted': 'Session started',
    'common.sessionEnded': 'Session ended',
    'common.today': 'Today',
    'common.edit': 'Edit',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.done': 'Done',
    'common.delete': 'Delete',
    'common.deleting': 'Deleting...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',

    // Date formatting
    'date.today': 'Today',
    'date.yesterday': 'Yesterday',

    // Duration formatting
    'duration.hoursMinutes': '{{hours}}hr{{minutes}}',
    'duration.hours': '{{hours}}hr',
    'duration.minutes': '{{minutes}}min',

    // SessionCard texts
    'sessionCard.unknownClient': 'Unknown Client',
    'sessionCard.startTime': 'Start Time',
    'sessionCard.endTime': 'End Time',
    'sessionCard.duration': 'Duration',
    'sessionCard.durationHours': '{{hours}} hours',
    'sessionCard.rate': 'Rate',
    'sessionCard.ratePerHour': '${{rate}}/hr',
    'sessionCard.amount': 'Amount',

    // Hamburger Menu
    'hamburger.menu.title': 'Menu',
    'hamburger.menu.help': 'Help',
    'hamburger.menu.contact': 'Contact',
    'hamburger.menu.share': 'Share',
    'hamburger.menu.cancel': 'Cancel',

    // Help Screen
    'help.title': 'Help & FAQs',
    'help.hero': 'Answers to your most common TrackPay questions.',
    'help.intro.provider': 'Browse quick answers tailored for providers. Need more help? Reach out from the Contact tab.',
    'help.intro.client': 'Browse quick answers tailored for clients. Need more help? Reach out from the Contact tab.',
    'help.section.sessions': 'Sessions',
    'help.section.invites': 'Invites',
    'help.section.payments': 'Payments',
    'help.section.general': 'General',
    'help.emptyState': 'We\'re adding more tips soon. Email support if you don\'t see your question.',

    // Contact Modal
    'contact.title': 'Contact TrackPay',
    'contact.hero': 'We\'d love to hear from you.',
    'contact.body': 'Send us a note with any questions, feedback, or ideas. Our team usually replies within one business day.',
    'contact.emailButton': 'Email Support',
    'contact.emailLabel': 'Support Email',
    'contact.footer': 'Include screenshots when possible so we can help faster.',
    'contact.emailSubject': 'TrackPay Support Request',
    'contact.emailBody': 'Hi TrackPay Team,\n\n[Please describe your question or issue here.]\n\nApp version: {{version}}',

    // Share Modal
    'share.title': 'Spread the Word',
    'share.hero': 'Help other families and providers discover TrackPay.',
    'share.body': 'Share your referral message below or send it through your favourite app. Every introduction helps us support more relationships.',
    'share.shareButton': 'Share TrackPay',
    'share.copyLabel': 'Referral Message',
    'share.fallback': 'Copy the message above and paste it wherever you like to share.',
    'share.message': 'TrackPay helps me stay on top of sessions and payments. Download it here: {{link}}',
  },
  'es-US': {
    'lang.english': 'English',
    'lang.spanish': 'Español',
    'welcome.title': 'Registra horas. Solicita pagos. Cóbalo más rápido.',
    'welcome.subtitle': 'Registra trabajo y recibe pagos de clientes.',
    'welcome.create': 'Crear Cuenta',
    'welcome.signin': 'Iniciar Sesión',
    'welcome.invite': '¿Tienes un código de invitación?',
    // USP Features (Spanish)
    'usp.timeTracking.title': 'Registro de Horas',
    'usp.timeTracking.subtitle': 'Inicia y detén sesiones con cronómetro de precisión',
    'usp.paymentRequests.title': 'Solicitudes de Pago',
    'usp.paymentRequests.subtitle': 'Solicita pagos y recibe notificaciones cuando confirmen',
    'usp.inviteClients.title': 'Invita a Tus Clientes',
    'usp.inviteClients.subtitle': 'Comparte un espacio donde ven las horas y solicitudes',

    // Auth Screens (Spanish)
    'register.title': 'Crear Cuenta',
    'register.subtitle': 'Registra horas y cobra más rápido',
    'register.fullName': 'Nombre Completo',
    'register.email': 'Correo Electrónico',
    'register.password': 'Contraseña',
    'register.confirmPassword': 'Confirmar Contraseña',
    'register.accountType': 'Tipo de Cuenta',
    'register.roleProvider': 'Proveedor de Servicios',
    'register.roleClient': 'Cliente',
    'register.roleProviderDescription': 'Niñera, limpieza doméstica, tutor, y más',
    'register.roleClientDescription': 'Contrata proveedores y ve su trabajo',
    'register.hourlyRate': 'Tarifa por Hora (Opcional)',
    'register.createButton': 'Crear Cuenta',
    'register.creating': 'Creando Cuenta...',
    'register.hasAccount': '¿Ya tienes una cuenta?',
    'register.signIn': 'Iniciar Sesión',
    'register.inviteJoiningAs': 'Te unes como {{role}} (invitado por {{inviterName}})',

    // Form placeholders (Spanish)
    'register.fullNamePlaceholder': 'Ingresa tu nombre completo',
    'register.emailPlaceholder': 'tu@email.com',
    'register.passwordPlaceholder': 'Crea una contraseña segura',
    'register.confirmPasswordPlaceholder': 'Confirma tu contraseña',

    // Form validation errors (Spanish)
    'register.errors.displayNameRequired': 'Por favor ingresa tu nombre completo',
    'register.errors.emailRequired': 'Por favor ingresa tu correo electrónico',
    'register.errors.emailInvalid': 'Por favor ingresa un correo electrónico válido',
    'register.errors.passwordRequired': 'Por favor ingresa una contraseña',
    'register.errors.passwordTooShort': 'La contraseña debe tener al menos 6 caracteres',
    'register.errors.confirmPasswordRequired': 'Por favor confirma tu contraseña',
    'register.errors.passwordMismatch': 'Las contraseñas no coinciden',
    'register.errors.roleRequired': 'Por favor selecciona tu tipo de cuenta',
    'register.errors.failed': 'Registro Fallido',
    'register.errors.error': 'Error',
    'register.errors.unexpected': 'Ocurrió un error inesperado. Por favor intenta de nuevo.',

    // Success messages (Spanish)
    'register.success.welcome': '¡Bienvenido!',
    'register.success.accountCreated': 'Cuenta Creada',
    'register.success.joinedWorkspace': '¡Tu cuenta ha sido creada y te has unido exitosamente al espacio de trabajo de {{inviterName}}!',
    'register.success.useInviteAgain': '¡Tu cuenta ha sido creada exitosamente! Por favor usa tu código de invitación de nuevo para unirte al espacio de trabajo.',
    'register.success.canStartUsing': `¡Tu cuenta ha sido creada exitosamente! Ahora puedes comenzar a usar ${APP_DISPLAY_NAME}.`,

    'login.title': 'Bienvenido de Vuelta',
    'login.subtitle': `Inicia sesión en tu cuenta ${APP_DISPLAY_NAME}`,
    'login.back': 'Atrás',
    'login.email': 'Correo Electrónico',
    'login.password': 'Contraseña',
    'login.signInButton': 'Iniciar Sesión',
    'login.signingIn': 'Iniciando Sesión...',
    'login.forgotPassword': '¿Olvidaste tu contraseña?',
    'login.noAccount': '¿No tienes una cuenta?',
    'login.createAccount': 'Crear Cuenta',

    // Login form placeholders (Spanish)
    'login.emailPlaceholder': 'tu@email.com',
    'login.passwordPlaceholder': 'Ingresa tu contraseña',

    // Login validation errors (Spanish)
    'login.errors.emailRequired': 'Por favor ingresa tu correo electrónico',
    'login.errors.emailInvalid': 'Por favor ingresa un correo electrónico válido',
    'login.errors.passwordRequired': 'Por favor ingresa tu contraseña',
    'login.errors.failed': 'Inicio de Sesión Fallido',
    'login.errors.error': 'Error',
    'login.errors.unexpected': 'Ocurrió un error inesperado. Por favor intenta de nuevo.',

    'forgotPassword.title': 'Restablecer Contraseña',
    'forgotPassword.subtitle': 'Te enviaremos un enlace de restablecimiento',
    'forgotPassword.back': 'Atrás',
    'forgotPassword.email': 'Dirección de Correo',
    'forgotPassword.emailPlaceholder': 'tu@email.com',
    'forgotPassword.sendButton': 'Enviar Enlace de Restablecimiento',
    'forgotPassword.sending': 'Enviando...',
    'forgotPassword.rememberPassword': '¿Recuerdas tu contraseña?',
    'forgotPassword.signIn': 'Iniciar Sesión',
    'forgotPassword.checkEmail': 'Revisa Tu Correo',
    'forgotPassword.emailSent': 'Hemos enviado un enlace de restablecimiento de contraseña a {{email}}. Revisa tu correo y sigue las instrucciones para restablecer tu contraseña.',
    'forgotPassword.didntReceive': '¿No recibiste el correo? Revisa tu carpeta de spam o intenta de nuevo.',
    'forgotPassword.tryAgain': 'Intentar de Nuevo',
    'forgotPassword.backToSignIn': 'Volver a Iniciar Sesión',

    // ForgotPassword errors (Spanish)
    'forgotPassword.errors.validationError': 'Error de Validación',
    'forgotPassword.errors.emailRequired': 'Por favor ingresa tu correo electrónico',
    'forgotPassword.errors.emailInvalid': 'Por favor ingresa un correo electrónico válido',
    'forgotPassword.errors.resetFailed': 'Restablecimiento Fallido',
    'forgotPassword.errors.error': 'Error',
    'forgotPassword.errors.unexpected': 'Ocurrió un error inesperado. Por favor intenta de nuevo.',

    'inviteClaim.title': 'Reclamar Tu Invitación',
    'inviteClaim.subtitle': 'Ingresa tu código de invitación para comenzar',
    'inviteClaim.inviteCode': 'Código de Invitación',
    'inviteClaim.placeholder': 'ABC123',
    'inviteClaim.helperText': 'Ingresa el código de 6-8 caracteres de tu proveedor',
    'inviteClaim.validating': 'Validando código...',
    'inviteClaim.validCode': 'Código de invitación válido',
    'inviteClaim.wantsToWork': '{{clientName}} quiere trabajar contigo',
    'inviteClaim.invitedBy': 'Invitado por {{clientName}}',
    'inviteClaim.noCode': '¿No tienes código de invitación? Pregunta a tu proveedor de servicios.',
    'inviteClaim.joinButton': 'Unirse al Espacio',

    // InviteClaim errors (Spanish)
    'inviteClaim.errors.codeRequired': 'Por favor ingresa un código de invitación',
    'inviteClaim.errors.invalidCode': 'Por favor ingresa un código de invitación válido',
    'inviteClaim.errors.invalidFormat': 'Formato de código de invitación inválido',
    'inviteClaim.errors.validationError': 'Error validando código de invitación',
    'inviteClaim.errors.error': 'Error',
    'inviteClaim.errors.claimFailed': 'Falló al reclamar invitación. Por favor intenta de nuevo.',

    // InviteClaim success messages (Spanish)
    'inviteClaim.success.title': '¡Éxito!',
    'inviteClaim.success.continue': 'Continuar',
    'inviteClaim.success.acceptedWork': 'Has aceptado la oportunidad de trabajo con {{clientName}}',
    'inviteClaim.success.joinedWorkspace': 'Te has unido exitosamente al espacio de trabajo de {{clientName}}',

    // Settings Screen (Spanish)
    'settings.title': 'Configuración',
    'settings.name': 'Nombre',
    'settings.email': 'Correo Electrónico',
    'settings.language': 'Idioma',
    'settings.languageDescription': 'Elige tu idioma preferido',
    'settings.signOut': 'Cerrar Sesión',
    'settings.signOutConfirm': '¿Estás seguro de que quieres cerrar sesión?',
    'settings.cancel': 'Cancelar',
    'settings.back': 'Atrás',
    'settings.successUpdated': 'Configuración actualizada exitosamente',
    'settings.errorUpdateFailed': 'Error al actualizar configuración',
    'settings.namePlaceholder': 'Ingresa tu nombre',

    // SimpleClientListScreen (Spanish)
    'clientList.loading': 'Cargando...',
    'clientList.welcome': '¡Bienvenido!',
    'clientList.addClient': 'Agregar Cliente',
    'clientList.addNewClient': '+ Agregar Nuevo Cliente',
    'clientList.logout': 'Cerrar Sesión',
    'clientList.totalOutstanding': 'Total Pendiente',
    'clientList.statusPaidUp': 'Al día',
    'clientList.statusDue': 'Debe {{amount}}',
    'clientList.statusRequested': '{{amount}} Solicitado',
    'clientList.statusActive': 'Activo • {{timer}}',
    'clientList.invite': 'Invitar',
    'clientList.errorTitle': 'Error',
    'clientList.noInviteCode': 'No se encontró código de invitación para este cliente',
    'clientList.inviteLoadError': 'Error al cargar código de invitación',
    'clientList.logoutError': 'Error al cerrar sesión. Por favor intenta de nuevo.',
    'clientList.workInProgress': 'Trabajo en Progreso',
    'clientList.myClients': 'Mis Clientes',
    'clientList.errorLoadClients': 'Error al cargar clientes',
    'clientList.errorClientName': 'Por favor ingresa el nombre del cliente',
    'clientList.errorHourlyRate': 'Por favor ingresa una tarifa por hora válida',
    'clientList.errorAddClient': 'Error al agregar cliente',
    'clientList.errorStartSession': 'Error al iniciar sesión',
    'clientList.errorNoActiveSession': 'No se encontró sesión activa',
    'clientList.errorStopSession': 'Error al detener sesión',

    // Zero State Content (Spanish)
    'clientList.howItWorks': 'Cómo funciona',
    'clientList.step1.title': 'Agrega un Cliente',
    'clientList.step1.description': 'Nombre y tarifa por hora. Eso es todo.',
    'clientList.step2.title': 'Registra Horas',
    'clientList.step2.description': 'Inicia y detén sesiones con cronómetro de precisión.',
    'clientList.step3.title': 'Invita y Solicita Pago',
    'clientList.step3.description': 'Comparte tu espacio, envía solicitudes, recibe notificaciones cuando confirmen.',
    'clientList.cta.title': 'Vamos a Configurarte',
    'clientList.cta.subtitle': 'Registra horas, solicita pagos, e invita clientes a un espacio compartido.',
    'clientList.cta.addClient': 'Agregar Cliente',

    // ServiceProviderListScreen (Spanish)
    'providerList.logout': 'Cerrar Sesión',
    'providerList.logoutError': 'Error al cerrar sesión. Por favor intenta de nuevo.',
    'providerList.errorTitle': 'Error',
    'providerList.serviceProvider': 'Proveedor de Servicios',
    'providerList.paymentRequested': 'Pago Solicitado',
    'providerList.paymentRequestedAmount': 'Pago solicitado: ${{amount}}',
    'providerList.youOwe': 'Debes: ${{amount}}',
    'providerList.youOweWithRequested': 'Debes: ${{total}} (${{requested}} solicitado)',
    'providerList.unpaidHours': '{{hours}} sin pagar',
    'providerList.requestedHours': '{{hours}} solicitadas',
    'providerList.unpaidAndRequested': '{{unpaid}} sin pagar, {{requested}} solicitadas',
    'providerList.allPaidUp': 'Todo pagado',
    'providerList.title': 'Proveedores de Servicios',
    'providerList.totalYouOwe': 'Total Que Debes',
    'providerList.emptyTitle': 'Aún no hay proveedores de servicios',
    'providerList.emptySubtitle': 'Verás aquí a los proveedores con los que trabajas',

    // ClientWelcomeModal (Spanish)
    'clientWelcome.title': 'Bienvenido a TrackPay',
    'clientWelcome.subtitle': 'Te has unido al espacio de trabajo de {{providerName}}.',
    'clientWelcome.cta': 'Continuar',

    // Client home empty state (Spanish)
    'clientList.emptyTitle': 'Aún no hay proveedores',
    'clientList.emptySubtitle': 'Pídele a tu proveedor de servicios tu código de invitación.',

    // ClientHistoryScreen (Spanish)
    'clientHistory.loading': 'Cargando...',
    'clientHistory.clientNotFound': 'Cliente no encontrado',
    'clientHistory.errorTitle': 'Error',
    'clientHistory.loadError': 'Error al cargar datos del cliente',
    'clientHistory.sessionStartError': 'Error al iniciar sesión',
    'clientHistory.sessionEndError': 'Error al terminar sesión',
    'clientHistory.noUnpaidSessions': 'No hay sesiones sin pagar para solicitar pago.',
    'clientHistory.pendingRequestExists': 'Ya existe una solicitud de pago pendiente para este cliente.',
    'clientHistory.requestFailed': 'No se pudo enviar la solicitud de pago. Por favor intenta de nuevo.',
    'clientHistory.paymentRequested': 'Solicitud de pago por {{amount}} enviada a {{clientName}}',
    'clientHistory.invitePending': 'Invitación pendiente',
    'clientHistory.clients': 'Clientes',
    'clientHistory.profile': 'Perfil',
    'clientHistory.balanceDue': 'Saldo adeudado: ',
    'clientHistory.requestPayment': 'Solicitar Pago',
    'clientHistory.startSession': 'Iniciar Sesión',
    'clientHistory.endSession': 'Terminar Sesión',
    'clientHistory.activityTimeline': 'Cronología de Actividad',
    'clientHistory.today': 'Hoy',
    'clientHistory.yesterday': 'Ayer',
    'clientHistory.paymentRequestedActivity': 'Pago solicitado',
    'clientHistory.workSession': 'Sesión de Trabajo',
    'clientHistory.unpaid': 'sin pagar',
    'clientHistory.activeSince': 'Activo desde {{time}}',
    'clientHistory.crewSize': 'Tamaño del equipo',
    'clientHistory.crewSetBefore': 'Configurar antes de iniciar',
    'clientHistory.crewApplies': 'Aplica a toda la sesión',
    'clientHistory.persons': 'Persona(s)',
    'clientHistory.errorUpdateCrewSize': 'No se puede actualizar el tamaño del equipo. Por favor intenta de nuevo.',
    'clientHistory.total': 'Total',
    'clientHistory.session': 'sesión',
    'clientHistory.sessions': 'sesiones',

    // ClientProfileScreen (Spanish)
    'clientProfile.loading': 'Cargando Perfil del Cliente...',
    'clientProfile.clientNotFound': 'Cliente no encontrado',
    'clientProfile.errorLoadData': 'Error al cargar datos del cliente',
    'clientProfile.invalidEmail': 'Correo Inválido',
    'clientProfile.invalidEmailMessage': 'Por favor ingresa una dirección de correo válida',
    'clientProfile.invalidRate': 'Tarifa Inválida',
    'clientProfile.invalidRateMessage': 'Por favor ingresa una tarifa por hora válida',
    'clientProfile.successUpdated': 'Perfil del cliente actualizado exitosamente',
    'clientProfile.errorUpdateFailed': 'Error al actualizar perfil del cliente',
    'clientProfile.clientName': 'Nombre del Cliente',
    'clientProfile.emailOptional': 'Correo (Opcional)',
    'clientProfile.emailPlaceholder': 'cliente@ejemplo.com',
    'clientProfile.namePlaceholder': 'Ingresa el nombre del cliente',
    'clientProfile.hourlyRate': 'Tarifa por Hora',
    'clientProfile.ratePlaceholder': '0.00',
    'clientProfile.saveChanges': 'Guardar Cambios',
    'clientProfile.hourlyRateInfo': 'Esta es tu tarifa actual por hora para trabajar con {{clientName}}. La tarifa se usa para calcular ganancias de todas las sesiones de trabajo.',
    'clientProfile.inviteCodeTitle': 'Código de Invitación',
    'clientProfile.inviteCodeDescription': '{{clientName}} aún no ha reclamado su cuenta. Comparte este código de invitación con ellos:',
    'clientProfile.shareCode': 'Compartir Código',
    'clientProfile.deleteClient': 'Eliminar Cliente',
    'clientProfile.cannotDeleteTitle': 'No se Puede Eliminar',
    'clientProfile.activeSessionMessage': '{{clientName}} tiene una sesión activa en curso. Detén la sesión antes de eliminar.',
    'clientProfile.unpaidBalanceMessage': '{{clientName}} tiene un saldo pendiente de {{amount}}. Resuelve esto antes de eliminar.',
    'clientProfile.paymentRequestMessage': '{{clientName}} tiene solicitudes de pago pendientes. Resuelve estas antes de eliminar.',
    'clientProfile.viewSessions': 'Ver Sesiones',
    'clientProfile.deleteConfirmTitle': 'Eliminar Cliente',
    'clientProfile.deleteConfirmMessage': '¿Eliminar tu conexión con {{clientName}}? Esto no eliminará su cuenta o historial de trabajo.',
    'clientProfile.successDeleted': '{{clientName}} eliminado de tus clientes',
    'clientProfile.alreadyDeleted': 'Este cliente ya fue eliminado',
    'clientProfile.errorDeleteFailed': 'Por favor resuelve sesiones activas o elementos sin pagar antes de eliminar.',
    'clientProfile.offlineWarning': 'Sin conexión a internet',

    // ProviderProfileScreen (Spanish)
    'providerProfile.hourlyRate': 'Tarifa por Hora',
    'providerProfile.hourlyRateInfo': 'Esta es la tarifa por hora que {{providerName}} cobra por el trabajo. Todas las sesiones se calculan usando esta tarifa.',

    // Empty state messages (Spanish)
    'emptyState.noWork': 'Sin trabajo aún',
    'emptyState.workWillAppear': 'Las sesiones de trabajo y pagos aparecerán aquí.',
    'emptyState.startFirst': 'Inicia tu primera sesión',
    'emptyState.noSessions': 'Sin sesiones aún',
    'emptyState.firstSessionHint': 'Inicia tu primera sesión para verla aquí',

    // StyledSessionTrackingScreen (Spanish)
    'sessionTracking.loading': 'Cargando...',
    'sessionTracking.clientNotFound': 'Cliente no encontrado',
    'sessionTracking.errorTitle': 'Error',
    'sessionTracking.loadError': 'Error al cargar datos del cliente',
    'sessionTracking.startError': 'Error al iniciar sesión',
    'sessionTracking.endError': 'Error al terminar sesión',
    'sessionTracking.startSession': 'Iniciar Sesión',
    'sessionTracking.endSession': 'Terminar Sesión',
    'sessionTracking.pause': 'Pausar',
    'sessionTracking.resume': 'Reanudar',
    'sessionTracking.sessionActive': 'Sesión Activa',
    'sessionTracking.sessionPaused': 'Sesión Pausada',
    'sessionTracking.hourlyRate': '${{rate}}/hora',
    'sessionTracking.totalEarned': 'Total Ganado: {{amount}}',

    // AddClientModal (Spanish)
    'addClient.title': 'Agregar Nuevo Cliente',
    'addClient.clientName': 'Nombre del Cliente',
    'addClient.emailOptional': 'Correo (Opcional)',
    'addClient.emailPlaceholder': 'cliente@ejemplo.com',
    'addClient.namePlaceholder': 'Ingresa nombre del cliente',
    'addClient.hourlyRate': 'Tarifa por Hora',
    'addClient.ratePlaceholder': '0.00',
    'addClient.perHour': '/hora',
    'addClient.rateHint': 'Ingresa tarifa por hora (USD)',
    'addClient.cancel': 'Cancelar',
    'addClient.addClient': 'Agregar Cliente',
    'addClient.adding': 'Agregando...',
    'addClient.nameRequired': 'Por favor ingresa el nombre del cliente',
    'addClient.rateRequired': 'La tarifa por hora es requerida',
    'addClient.rateInvalid': 'Por favor ingresa una tarifa por hora válida',
    'addClient.errorTitle': 'Error de Validación',
    'addClient.addError': 'Error al agregar cliente. Por favor intenta de nuevo.',
    'addClient.success': 'Cliente agregado exitosamente',
    'addClient.successWithInvite': '{{clientName}} ha sido agregado como cliente con código de invitación: {{inviteCode}}',
    'addClient.successMessage': '{{clientName}} ha sido agregado como cliente',

    // ServiceProviderSummaryScreen (Spanish)
    'providerSummary.loading': 'Cargando...',
    'providerSummary.loadingProviderSummary': 'Cargando...',
    'providerSummary.providerNotFound': 'Proveedor no encontrado',
    'providerSummary.errorTitle': 'Error',
    'providerSummary.loadError': 'Error al cargar datos del proveedor',
    'providerSummary.back': 'Atrás',
    'providerSummary.workSummary': 'Resumen de Trabajo',
    'providerSummary.totalOwed': 'Total Adeudado: {{amount}}',
    'providerSummary.hoursWorked': 'Horas Trabajadas: {{hours}}',
    'providerSummary.lastSession': 'Última Sesión: {{date}}',
    'providerSummary.markPaid': 'Marcar como Pagado',
    'providerSummary.paymentHistory': 'Historial de Pagos',
    'providerSummary.balanceDue': 'Saldo adeudado: ',
    'providerSummary.recordPayment': 'Registrar Pago',
    'providerSummary.paidUp': 'Al día',
    'providerSummary.activityTimeline': 'Cronología de Actividad',
    'providerSummary.noActivity': 'Aún no hay actividad',
    'providerSummary.noActivitySubtext': 'Las sesiones de trabajo y pagos aparecerán aquí',
    'providerSummary.today': 'Hoy',
    'providerSummary.yesterday': 'Ayer',
    'providerSummary.workSession': 'Sesión de trabajo',
    'providerSummary.activeSession': 'Sesión activa • Iniciada a las {{time}}',
    'providerSummary.paymentSent': 'Pago enviado',
    'providerSummary.paymentRequested': 'Pago solicitado',
    'providerSummary.pending': 'Pendiente',
    'providerSummary.session': 'sesión',
    'providerSummary.sessions': 'sesiones',
    'providerSummary.activeSessionHint': 'El tiempo de sesión activa no está incluido. Termina la sesión para agregarlo.',
    'providerSummary.paymentReceived': 'Pago recibido',
    'providerSummary.requestedOn': 'Solicitado el {{date}} • {{amount}} pendiente',
    'providerSummary.activeSessionTitle': '⏱️ Sesión Activa',
    'providerSummary.activeSessionInProgress': 'Sesión Activa - En Progreso',

    // StatusPill Component (Spanish)
    'statusPill.paid': 'Pagado',
    'statusPill.unpaid': 'No pagado',
    'statusPill.requested': 'Solicitado',
    'statusPill.active': 'Activa',
    'statusPill.unknown': 'Desconocido',
    // Legacy StatusPill entries for client status displays
    'statusPill.paidUp': 'Al día',
    'statusPill.due': 'Debe ${{amount}}',
    'statusPill.overdue': 'Vencido',

    // Toast Messages (Spanish)
    'toast.success': 'Éxito',
    'toast.error': 'Error',
    'toast.warning': 'Advertencia',
    'toast.paymentRecorded': 'Pago registrado',
    'toast.errorRetry': 'Desliza para actualizar y reintentar',
    'toast.info': 'Información',

    // ConfirmationModal (Spanish)
    'confirmation.confirm': 'Confirmar',
    'confirmation.cancel': 'Cancelar',
    'confirmation.title': 'Confirmar Acción',
    'confirmation.message': '¿Estás seguro de que quieres proceder?',
    'confirmation.processing': 'Procesando...',
    'confirmation.requesting': 'Solicitando...',

    // MarkAsPaidModal (Spanish)
    'markAsPaidModal.title': 'Marcar como Pagado',
    'markAsPaidModal.subtitle': 'Registrar pago a {{providerName}}',
    'markAsPaidModal.cancel': 'Cancelar',
    'markAsPaidModal.save': 'Guardar',
    'markAsPaidModal.payingTo': 'Pagando a',
    'markAsPaidModal.personHoursOutstanding': 'horas-persona pendientes',
    'markAsPaidModal.requestedAmount': 'Monto Solicitado',
    'markAsPaidModal.paidAmount': 'Monto Pagado',
    'markAsPaidModal.paymentAmount': 'Monto del Pago',
    'markAsPaidModal.paymentDate': 'Fecha de Pago',
    'markAsPaidModal.paymentMethod': 'Método de Pago',
    'markAsPaidModal.amountPlaceholder': '0.00',
    'markAsPaidModal.datePlaceholder': 'AAAA-MM-DD',
    'markAsPaidModal.dateHint': 'Formato: AAAA-MM-DD (ej., 2024-01-15)',
    'markAsPaidModal.maximumAmount': 'Máximo: ${{amount}}',
    'markAsPaidModal.markPaid': 'Marcar como Pagado',
    'markAsPaidModal.recording': 'Registrando...',
    'markAsPaidModal.paymentMethods.cash': 'Efectivo',
    'markAsPaidModal.paymentMethods.zelle': 'Zelle',
    'markAsPaidModal.paymentMethods.paypal': 'PayPal',
    'markAsPaidModal.paymentMethods.bankTransfer': 'Transferencia Bancaria',
    'markAsPaidModal.paymentMethods.other': 'Otro',

    // MarkAsPaidModal Errors (Spanish)
    'markAsPaidModal.errors.invalidAmount': 'Monto Inválido',
    'markAsPaidModal.errors.validAmount': 'Por favor ingresa un monto de pago válido.',
    'markAsPaidModal.errors.amountTooHigh': 'Monto Demasiado Alto',
    'markAsPaidModal.errors.exceedsBalance': 'El monto del pago no puede exceder el saldo impago de ${{amount}}.',
    'markAsPaidModal.errors.noSessions': 'Sin Sesiones',
    'markAsPaidModal.errors.noSessionsAvailable': 'No hay sesiones disponibles para pago.',
    'markAsPaidModal.errors.noUnpaidSessions': 'Sin Sesiones Impagas',
    'markAsPaidModal.errors.allPaid': 'Todas las sesiones ya están pagadas.',
    'markAsPaidModal.errors.clientError': 'Error',
    'markAsPaidModal.errors.clientNotFound': 'No se puede identificar el cliente para el pago.',
    'markAsPaidModal.errors.paymentFailed': 'Error al registrar el pago. Por favor intenta de nuevo.',

    // MarkAsPaidModal Success (Spanish)
    'markAsPaidModal.success.title': 'Pago Registrado',
    'markAsPaidModal.success.message': 'El pago de ${{amount}} a {{providerName}} ha sido registrado.',

    // RequestPaymentModal (Spanish - for inline request payment functionality)
    'requestPaymentModal.title': 'Solicitar Pago',
    'requestPaymentModal.confirmMessage': '¿Enviar una solicitud de pago a {{clientName}} por {{amount}}?',
    'requestPaymentModal.sendRequest': 'Enviar Solicitud',
    'requestPaymentModal.cancel': 'Cancelar',
    'requestPaymentModal.requesting': 'Solicitando...',

    // RequestPayment Errors (Spanish)
    'requestPaymentModal.errors.noUnpaidSessions': 'No hay sesiones sin pagar para solicitar pago.',
    'requestPaymentModal.errors.pendingExists': 'Ya existe una solicitud de pago pendiente para este cliente.',
    'requestPaymentModal.errors.requestFailed': 'No se pudo enviar la solicitud de pago. Por favor intenta de nuevo.',
    'requestPaymentModal.errors.failed': 'Error al solicitar pago',

    // RequestPayment Success (Spanish)
    'requestPaymentModal.success.requested': 'Solicitud de pago por {{amount}} enviada a {{clientName}}',

    // ErrorBoundary (Spanish)
    'errorBoundary.title': 'Algo salió mal',
    'errorBoundary.message': 'Lo sentimos por las molestias. Por favor, inténtalo de nuevo.',
    'errorBoundary.retry': 'Intentar de Nuevo',

    // Form Validation Errors (Spanish)
    'validation.required': 'Este campo es requerido',
    'validation.emailInvalid': 'Por favor ingresa una dirección de correo válida',
    'validation.passwordTooShort': 'La contraseña debe tener al menos 6 caracteres',
    'validation.passwordMismatch': 'Las contraseñas no coinciden',
    'validation.numberInvalid': 'Por favor ingresa un número válido',
    'validation.rateInvalid': 'Por favor ingresa una tarifa por hora válida',

    // ActivityFeedItem texts (Spanish)
    'activity.startedWorking': '{{clientName}} comenzó a trabajar',
    'activity.finishedWorking': '{{clientName}} terminó de trabajar',
    'activity.sessionDuration': 'Sesión: {{duration}} horas',
    'activity.amountDue': 'Monto adeudado: ${{amount}}',
    'activity.paymentRequest': 'Solicitud de pago de {{clientName}}',
    'activity.amount': 'Monto: ${{amount}}',
    'activity.paymentCompleted': 'Pago completado',
    'activity.paidAmount': '${{amount}} vía {{method}}',
    'activity.sessionsIncluded': '{{count}} sesión{{plural}} incluida{{plural}}',
    'activity.sessionsIncludedInPayment': 'Sesiones incluidas en este pago:',
    'activity.sessionNumber': 'Sesión #{{number}}: {{id}}...',
    'activity.tapToViewDetails': 'Toca para ver detalles de la sesión',
    'activity.unknownActivity': 'Actividad desconocida',

    // ClientCard texts (Spanish)
    'clientCard.unpaidHours': '{{hours}} horas sin pagar',
    'clientCard.noUnpaidHours': 'Sin horas pendientes',
    'clientCard.paidUp': 'Al día',

    // Invite Growth Loop (Spanish)
    'inviteModal.sessionStoppedTitle': 'Sesión detenida',
    'inviteModal.requestPaymentTitle': 'Solicitar pago',
    'inviteModal.shareHoursMessage': 'Comparte tus horas e invita a {{firstName}} a conectarse.',
    'inviteModal.sharePaymentMessage': '{{firstName}} aún no está en {{appName}}. Comparte tu solicitud de pago e invítalo a conectarse.',
    'inviteModal.shareInvite': 'Compartir Invitación',
    'inviteModal.close': 'Cerrar',

    // Common terms (Spanish)
    'common.appName': APP_DISPLAY_NAME,
    'common.due': 'Pendiente',
    'common.hrs': 'hrs',
    'common.person': 'persona',
    'common.people': 'personas',
    'common.crew': 'Equipo',
    'common.totalOutstanding': 'Total Pendiente',
    'common.requestPayment': 'Solicitar Pago',
    'common.hoursUnpaid': '{{count}} horas sin pagar',
    'common.start': 'Iniciar',
    'common.stop': 'Detener',
    'common.sessionStarted': 'Sesión iniciada',
    'common.sessionEnded': 'Sesión terminada',
    'common.today': 'Hoy',
    'common.edit': 'Editar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.saving': 'Guardando...',
    'common.done': 'Listo',
    'common.delete': 'Eliminar',
    'common.deleting': 'Eliminando...',
    'common.success': 'Éxito',
    'common.error': 'Error',
    'common.loading': 'Cargando...',

    // Date formatting (Spanish)
    'date.today': 'Hoy',
    'date.yesterday': 'Ayer',

    // Duration formatting (Spanish)
    'duration.hoursMinutes': '{{hours}} h{{minutes}}',
    'duration.hours': '{{hours}} h',
    'duration.minutes': '{{minutes}} min',

    // SessionCard texts (Spanish)
    'sessionCard.unknownClient': 'Cliente Desconocido',
    'sessionCard.startTime': 'Hora de Inicio',
    'sessionCard.endTime': 'Hora de Fin',
    'sessionCard.duration': 'Duración',
    'sessionCard.durationHours': '{{hours}} horas',
    'sessionCard.rate': 'Tarifa',
    'sessionCard.ratePerHour': '${{rate}}/hora',
    'sessionCard.amount': 'Monto',

    // Hamburger Menu (Spanish)
    'hamburger.menu.title': 'Menú',
    'hamburger.menu.help': 'Ayuda',
    'hamburger.menu.contact': 'Contacto',
    'hamburger.menu.share': 'Compartir',
    'hamburger.menu.cancel': 'Cancelar',

    // Help Screen (Spanish)
    'help.title': 'Ayuda y Preguntas Frecuentes',
    'help.hero': 'Respuestas a tus preguntas más comunes sobre TrackPay.',
    'help.intro.provider': 'Explora respuestas rápidas adaptadas para proveedores. ¿Necesitas más ayuda? Contáctanos desde la pestaña de Contacto.',
    'help.intro.client': 'Explora respuestas rápidas adaptadas para clientes. ¿Necesitas más ayuda? Contáctanos desde la pestaña de Contacto.',
    'help.section.sessions': 'Sesiones',
    'help.section.invites': 'Invitaciones',
    'help.section.payments': 'Pagos',
    'help.section.general': 'General',
    'help.emptyState': 'Pronto añadiremos más consejos. Envía un correo a soporte si no encuentras tu pregunta.',

    // Contact Modal (Spanish)
    'contact.title': 'Contactar a TrackPay',
    'contact.hero': 'Nos encantaría saber de ti.',
    'contact.body': 'Envíanos una nota con cualquier pregunta, comentario o idea. Nuestro equipo generalmente responde en un día hábil.',
    'contact.emailButton': 'Enviar Correo a Soporte',
    'contact.emailLabel': 'Correo de Soporte',
    'contact.footer': 'Incluye capturas de pantalla cuando sea posible para que podamos ayudarte más rápido.',
    'contact.emailSubject': 'Solicitud de Soporte TrackPay',
    'contact.emailBody': 'Hola Equipo TrackPay,\n\n[Por favor describe tu pregunta o problema aquí.]\n\nVersión de la aplicación: {{version}}',

    // Share Modal (Spanish)
    'share.title': 'Comparte la Aplicación',
    'share.hero': 'Ayuda a otras familias y proveedores a descubrir TrackPay.',
    'share.body': 'Comparte tu mensaje de referido a continuación o envíalo a través de tu aplicación favorita. Cada introducción nos ayuda a apoyar más relaciones.',
    'share.shareButton': 'Compartir TrackPay',
    'share.copyLabel': 'Mensaje de Referido',
    'share.fallback': 'Copia el mensaje de arriba y pégalo donde quieras compartir.',
    'share.message': 'TrackPay me ayuda a mantenerme al día con sesiones y pagos. Descárgalo aquí: {{link}}',
  }
};

let currentLanguage = 'en-US';

export const initSimpleI18n = async (): Promise<void> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && ['en-US', 'es-US'].includes(savedLanguage)) {
      currentLanguage = savedLanguage;
    } else {
      // Default to English
      currentLanguage = 'en-US';
    }

    if (__DEV__) {
      if (__DEV__) console.log(`✅ Simple i18n initialized with language: ${currentLanguage}`);
    }
  } catch (error) {
    if (__DEV__) {
      if (__DEV__) console.warn('Simple i18n initialization failed, using English:', error);
    }
    currentLanguage = 'en-US';
  }
};

export const simpleT = (key: string, variables?: Record<string, string | number>): string => {
  try {
    const lang = currentLanguage as keyof typeof translations;
    const langTranslations = translations[lang] || translations['en-US'];
    let translation = langTranslations[key as keyof typeof langTranslations] || key;

    // Handle variable interpolation
    if (variables && typeof translation === 'string') {
      Object.keys(variables).forEach(variableKey => {
        const placeholder = `{{${variableKey}}}`;
        translation = translation.replace(new RegExp(placeholder, 'g'), String(variables[variableKey]));
      });
    }

    return translation;
  } catch (error) {
    if (__DEV__) {
      if (__DEV__) console.warn('Translation error:', error);
    }
    return key;
  }
};

export const getCurrentLanguageSimple = (): string => {
  return currentLanguage;
};

export const changeLanguageSimple = async (language: string): Promise<void> => {
  try {
    if (['en-US', 'es-US'].includes(language)) {
      currentLanguage = language;
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);

      if (__DEV__) {
        if (__DEV__) console.log(`✅ Simple language changed to: ${language}`);
      }
    }
  } catch (error) {
    if (__DEV__) {
      if (__DEV__) console.warn('Failed to change simple language:', error);
    }
  }
};

export const isSpanishSimple = (): boolean => {
  return currentLanguage === 'es-US';
};

// Helper function to translate payment method values from stored data
export const translatePaymentMethod = (method: string): string => {
  const methodKey = `markAsPaidModal.paymentMethods.${method}`;
  return simpleT(methodKey);
};