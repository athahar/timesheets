/**
 * About Page - Additional Translations
 */

const aboutTranslations = {
  en: {
    'about.title': 'About Us - TrackPay',
    'about.back': '← Back to Home',
    'about.backBottom': '← Back to Home',
    'about.heading': 'About TrackPay',
    'about.mission': '"Time tracked. Payments sorted. Relationships respected."',

    'about.story.title': 'Our Story',
    'about.story.p1': 'TrackPay was born from a simple observation: independent professionals and small teams spend too much time managing what should be the simplest part of their work — tracking hours and getting paid.',
    'about.story.p2': 'We saw talented people sending awkward text messages, maintaining messy spreadsheets, and dealing with payment delays not because clients didn\'t want to pay, but because there was no shared, transparent record of work done.',
    'about.story.p3': 'So we built TrackPay — a bilingual app designed to give both service providers and clients a single source of truth. No confusion. No chasing. Just clarity and respect.',

    'about.why.title': 'Why TrackPay?',
    'about.why.p1': 'Built for both sides. Unlike most time tracking apps that only think about the service provider, TrackPay gives clients visibility and control too. When both parties see the same information, trust grows naturally.',
    'about.why.p2': 'Bilingual from day one. We serve communities that speak English and Spanish, and we believe your tools should speak your language — fluently.',
    'about.why.p3': 'Simple by design. We stripped away everything that doesn\'t serve the core mission: track time, request payment, stay transparent. The result is an app that feels natural from the first tap.',

    'about.values.title': 'Our Values',
    'about.values.p1': 'Transparency: Both providers and clients deserve to see the same truth at the same time.',
    'about.values.p2': 'Respect: Getting paid shouldn\'t require awkward conversations or uncomfortable follow-ups.',
    'about.values.p3': 'Simplicity: The best tools are the ones you don\'t have to think about.',
    'about.values.p4': 'Accessibility: Professional tools should be available to everyone, in their language, at a fair price.',

    'about.team.title': 'Who We Are',
    'about.team.p1': 'We\'re a small team of builders who care deeply about creating tools that respect your time and your relationships. We\'ve been independent contractors, freelancers, and small business owners ourselves — we know what it\'s like to need better systems.',

    'about.contact.title': 'Get in Touch',
    'about.contact.p1': 'We\'d love to hear from you. Whether you have questions, feedback, or just want to say hello:',
  },
  es: {
    'about.title': 'Sobre Nosotros - TrackPay',
    'about.back': '← Volver al inicio',
    'about.backBottom': '← Volver al inicio',
    'about.heading': 'Sobre TrackPay',
    'about.mission': '"Tiempo registrado. Pagos al día. Relaciones respetadas."',

    'about.story.title': 'Nuestra Historia',
    'about.story.p1': 'TrackPay nació de una simple observación: los profesionales independientes y equipos pequeños pasan demasiado tiempo gestionando lo que debería ser la parte más simple de su trabajo — registrar horas y recibir pagos.',
    'about.story.p2': 'Vimos personas talentosas enviando mensajes de texto incómodos, manteniendo hojas de cálculo desordenadas, y lidiando con retrasos de pago no porque los clientes no quisieran pagar, sino porque no había un registro compartido y transparente del trabajo realizado.',
    'about.story.p3': 'Así que construimos TrackPay — una app bilingüe diseñada para dar a proveedores de servicios y clientes una única fuente de verdad. Sin confusión. Sin persecuciones. Solo claridad y respeto.',

    'about.why.title': '¿Por qué TrackPay?',
    'about.why.p1': 'Diseñado para ambos lados. A diferencia de la mayoría de las apps de seguimiento de tiempo que solo piensan en el proveedor de servicios, TrackPay también da visibilidad y control a los clientes. Cuando ambas partes ven la misma información, la confianza crece naturalmente.',
    'about.why.p2': 'Bilingüe desde el día uno. Servimos a comunidades que hablan inglés y español, y creemos que tus herramientas deben hablar tu idioma — con fluidez.',
    'about.why.p3': 'Simple por diseño. Eliminamos todo lo que no sirve a la misión central: registrar tiempo, solicitar pago, mantener transparencia. El resultado es una app que se siente natural desde el primer toque.',

    'about.values.title': 'Nuestros Valores',
    'about.values.p1': 'Transparencia: Tanto proveedores como clientes merecen ver la misma verdad al mismo tiempo.',
    'about.values.p2': 'Respeto: Recibir pagos no debería requerir conversaciones incómodas o seguimientos desagradables.',
    'about.values.p3': 'Simplicidad: Las mejores herramientas son aquellas en las que no tienes que pensar.',
    'about.values.p4': 'Accesibilidad: Las herramientas profesionales deberían estar disponibles para todos, en su idioma, a un precio justo.',

    'about.team.title': 'Quiénes Somos',
    'about.team.p1': 'Somos un pequeño equipo de constructores que se preocupan profundamente por crear herramientas que respeten tu tiempo y tus relaciones. Hemos sido contratistas independientes, freelancers y dueños de pequeños negocios — sabemos lo que es necesitar mejores sistemas.',

    'about.contact.title': 'Contáctanos',
    'about.contact.p1': 'Nos encantaría saber de ti. Ya sea que tengas preguntas, comentarios o solo quieras saludar:',
  }
};

// Extend the main translations object from i18n.js
if (typeof translations !== 'undefined') {
  Object.keys(aboutTranslations).forEach(lang => {
    translations[lang] = { ...translations[lang], ...aboutTranslations[lang] };
  });
}
