// Simplified i18n implementation for debugging
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = 'user_language';

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
    'register.success.canStartUsing': 'Your account has been created successfully! You can now start using TrackPay.',

    'login.title': 'Welcome Back',
    'login.subtitle': 'Sign in to your TrackPay account',
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
  },
  'es-US': {
    'lang.english': 'English',
    'lang.spanish': 'Español',
    'welcome.title': 'Registra horas. Solicita pagos. Cóbalo más rápido.',
    'welcome.subtitle': 'La forma simple de registrar tu trabajo y que te paguen los clientes.',
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
    'register.success.canStartUsing': '¡Tu cuenta ha sido creada exitosamente! Ahora puedes comenzar a usar TrackPay.',

    'login.title': 'Bienvenido de Vuelta',
    'login.subtitle': 'Inicia sesión en tu cuenta TrackPay',
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
    'inviteClaim.success.joinedWorkspace': 'Te has unido exitosamente al espacio de trabajo de {{clientName}}'
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

export const simpleT = (key: string): string => {
  try {
    const lang = currentLanguage as keyof typeof translations;
    const langTranslations = translations[lang] || translations['en-US'];
    return langTranslations[key as keyof typeof langTranslations] || key;
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