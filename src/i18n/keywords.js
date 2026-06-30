// Multilingual invite keywords. Matching is case-insensitive and substring-based.
// Romanized (Hinglish/regional) terms are kept lowercase; native-script terms
// are matched as-is. Keep this list focused on high-signal invite words.

export const INVITE_KEYWORDS = {
  // English
  en: [
    'invite', 'invited', 'inviting', 'invitation', 'rsvp', 'save the date',
    'join us', 'join me', 'party', 'celebration', 'celebrate', 'get-together',
    'gathering', 'birthday', 'anniversary', 'wedding', 'reception', 'engagement',
    'housewarming', 'dinner', 'lunch', 'brunch', 'potluck', 'meetup', 'meet up',
    'hangout', 'function', 'event', 'ceremony', 'farewell', 'reunion',
    'see you there', 'are you coming',
  ],

  // Hinglish / romanized Hindi & common Indian-English event words
  hinglish: [
    'nimantran', 'aamantran', 'amantran', 'shaadi', 'shadi', 'vivah', 'sagai',
    'sangeet', 'mehndi', 'mehendi', 'haldi', 'roka', 'tilak', 'reception',
    'janmdin', 'janamdin', 'birthday', 'salgirah', 'griha pravesh', 'grah pravesh',
    'pooja', 'puja', 'havan', 'satsang', 'bhandara', 'kirtan', 'jagran',
    'dawat', 'daawat', 'samaroh', 'utsav', 'function', 'aana hai', 'aaiye',
    'aap aamantrit', 'padhaar', 'padharein', 'zaroor aana', 'jaroor aana',
  ],

  // Hindi (Devanagari)
  hi: [
    'निमंत्रण', 'आमंत्रण', 'आमंत्रित', 'न्योता', 'शादी', 'विवाह', 'सगाई',
    'संगीत', 'मेहंदी', 'हल्दी', 'रोका', 'तिलक', 'जन्मदिन', 'सालगिरह',
    'गृह प्रवेश', 'गृहप्रवेश', 'पूजा', 'हवन', 'सत्संग', 'भंडारा', 'कीर्तन',
    'दावत', 'समारोह', 'उत्सव', 'पधारें', 'पधारिए', 'अवश्य आएं', 'ज़रूर आना',
    'स्वागत', 'आयोजन', 'जश्न', 'विवाह समारोह',
  ],

  // Marathi
  mr: ['लग्न', 'विवाह', 'आमंत्रण', 'निमंत्रण', 'वाढदिवस', 'सत्यनारायण', 'समारंभ', 'स्वागत'],

  // Bengali
  bn: ['নিমন্ত্রণ', 'আমন্ত্রণ', 'বিয়ে', 'বিবাহ', 'জন্মদিন', 'অনুষ্ঠান', 'পূজা', 'নেমন্তন্ন'],

  // Gujarati
  gu: ['આમંત્રણ', 'નિમંત્રણ', 'લગ્ન', 'જન્મદિવસ', 'કંકોત્રી', 'સમારંભ', 'પ્રસંગ'],

  // Tamil
  ta: ['அழைப்பு', 'திருமணம்', 'பிறந்தநாள்', 'விழா', 'வரவேற்பு', 'நிகழ்ச்சி'],

  // Telugu
  te: ['ఆహ్వానం', 'పెళ్లి', 'వివాహం', 'పుట్టినరోజు', 'వేడుక', 'కార్యక్రమం'],

  // Kannada
  kn: ['ಆಹ್ವಾನ', 'ಮದುವೆ', 'ಹುಟ್ಟುಹಬ್ಬ', 'ಸಮಾರಂಭ', 'ಕಾರ್ಯಕ್ರಮ'],

  // Malayalam
  ml: ['ക്ഷണം', 'വിവാഹം', 'കല്യാണം', 'പിറന്നാൾ', 'ചടങ്ങ്', 'പരിപാടി'],

  // Punjabi (Gurmukhi)
  pa: ['ਸੱਦਾ', 'ਵਿਆਹ', 'ਜਨਮਦਿਨ', 'ਸਮਾਗਮ', 'ਅਨੰਦ ਕਾਰਜ', 'ਪ੍ਰੋਗਰਾਮ'],
};

// Flattened set for quick scanning.
export const ALL_KEYWORDS = Object.values(INVITE_KEYWORDS).flat();

// Field labels in multiple languages (used to extract location/host/title).
export const FIELD_LABELS = {
  location: [
    'location', 'venue', 'address', 'where', 'place',
    'jagah', 'sthal', 'sthan', 'pata', 'pataa', // hinglish
    'स्थान', 'स्थल', 'पता', 'जगह', 'कहाँ', 'कहां', // hindi
    'ठिकाण', 'स्थळ', // marathi
    'ঠিকানা', 'স্থান', // bengali
    'સ્થળ', 'સરનામું', // gujarati
    'இடம்', 'முகவரி', // tamil
    'స్థలం', 'చిరునామా', // telugu
    'ಸ್ಥಳ', 'ವಿಳಾಸ', // kannada
    'സ്ഥലം', 'വിലാസം', // malayalam
    'ਥਾਂ', 'ਪਤਾ', // punjabi
  ],
  host: [
    'host', 'hosted by', 'from', 'by',
    'mezban', 'meziban', 'ki or se', 'ki taraf se', // hinglish
    'मेज़बान', 'मेजबान', 'की ओर से', 'की तरफ से', 'द्वारा', // hindi
  ],
  title: [
    'title', 'event', 'occasion',
    'avsar', 'samaroh', 'karyakram', // hinglish
    'अवसर', 'समारोह', 'कार्यक्रम', 'आयोजन', // hindi
  ],
};
