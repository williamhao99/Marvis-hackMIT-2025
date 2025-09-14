export function languageToLocale(localeString: string): string {
    switch (localeString) {
        case "Afrikaans":
        case "Afrikaans (South Africa)":
            return "af-ZA";
        case "Amharic":
        case "Amharic (Ethiopia)":
            return "am-ET";
        case "Arabic":
        case "Standard Arabic":
        case "Arabic (United Arab Emirates)":
            return "ar-AE";
        case "Arabic (Bahrain)":
            return "ar-BH";
        case "Arabic (Algeria)":
            return "ar-DZ";
        case "Arabic (Egypt)":
            return "ar-EG";
        case "Arabic (Israel)":
            return "ar-IL";
        case "Arabic (Iraq)":
            return "ar-IQ";
        case "Arabic (Jordan)":
            return "ar-JO";
        case "Arabic (Kuwait)":
            return "ar-KW";
        case "Arabic (Lebanon)":
            return "ar-LB";
        case "Arabic (Libya)":
            return "ar-LY";
        case "Arabic (Morocco)":
            return "ar-MA";
        case "Arabic (Oman)":
            return "ar-OM";
        case "Arabic (Palestinian Authority)":
            return "ar-PS";
        case "Arabic (Qatar)":
            return "ar-QA";
        case "Arabic (Saudi Arabia)":
            return "ar-SA";
        case "Arabic (Syria)":
            return "ar-SY";
        case "Arabic (Tunisia)":
            return "ar-TN";
        case "Arabic (Yemen)":
            return "ar-YE";
        case "Azerbaijani":
        case "Azerbaijani (Latin, Azerbaijan)":
            return "az-AZ";
        case "Bulgarian":
        case "Bulgarian (Bulgaria)":
            return "bg-BG";
        case "Bengali":
        case "Bengali (India)":
            return "bn-IN";
        case "Bosnian":
        case "Bosnian (Bosnia and Herzegovina)":
            return "bs-BA";
        case "Catalan":
            return "ca-ES";
        case "Czech":
        case "Czech (Czechia)":
            return "cs-CZ";
        case "Welsh":
            return "cy-GB";
        case "Danish":
        case "Danish (Denmark)":
            return "da-DK";
        case "German (Austria)":
            return "de-AT";
        case "German (Switzerland)":
            return "de-CH";
        case "German":
        case "German (Germany)":
            return "de-DE";
        case "Greek":
        case "Greek (Greece)":
            return "el-GR";
        case "English (Australia)":
            return "en-AU";
        case "English (Canada)":
            return "en-CA";
        case "English (United Kingdom)":
            return "en-GB";
        case "English (Ghana)":
            return "en-GH";
        case "English (Hong Kong SAR)":
            return "en-HK";
        case "English (Ireland)":
            return "en-IE";
        case "English (India)":
            return "en-IN";
        case "English (Kenya)":
            return "en-KE";
        case "English (Nigeria)":
            return "en-NG";
        case "English (New Zealand)":
            return "en-NZ";
        case "English (Philippines)":
            return "en-PH";
        case "English (Singapore)":
            return "en-SG";
        case "English (Tanzania)":
            return "en-TZ";
        case "English":
        case "English (United States)":
            return "en-US";
        case "English (South Africa)":
            return "en-ZA";
        case "Spanish (Argentina)":
            return "es-AR";
        case "Spanish (Bolivia)":
            return "es-BO";
        case "Spanish (Chile)":
            return "es-CL";
        case "Spanish (Colombia)":
            return "es-CO";
        case "Spanish (Costa Rica)":
            return "es-CR";
        case "Spanish (Cuba)":
            return "es-CU";
        case "Spanish (Dominican Republic)":
            return "es-DO";
        case "Spanish (Ecuador)":
            return "es-EC";
        case "Spanish (Spain)":
            return "es-ES";
        case "Spanish (Equatorial Guinea)":
            return "es-GQ";
        case "Spanish (Guatemala)":
            return "es-GT";
        case "Spanish (Honduras)":
            return "es-HN";
        case "Spanish":
        case "Spanish (Mexico)":
            return "es-MX";
        case "Spanish (Nicaragua)":
            return "es-NI";
        case "Spanish (Panama)":
            return "es-PA";
        case "Spanish (Peru)":
            return "es-PE";
        case "Spanish (Puerto Rico)":
            return "es-PR";
        case "Spanish (Paraguay)":
            return "es-PY";
        case "Spanish (El Salvador)":
            return "es-SV";
        case "Spanish (United States)":
            return "es-US";
        case "Spanish (Uruguay)":
            return "es-UY";
        case "Spanish (Venezuela)":
            return "es-VE";
        case "Estonian":
        case "Estonian (Estonia)":
            return "et-EE";
        case "Basque":
            return "eu-ES";
        case "Persian":
        case "Persian (Iran)":
            return "fa-IR";
        case "Finnish":
        case "Finnish (Finland)":
            return "fi-FI";
        case "Filipino":
        case "Filipino (Philippines)":
            return "fil-PH";
        case "French (Belgium)":
            return "fr-BE";
        case "French (Canada)":
            return "fr-CA";
        case "French (Switzerland)":
            return "fr-CH";
        case "French":
        case "French (France)":
            return "fr-FR";
        case "Irish":
        case "Irish (Ireland)":
            return "ga-IE";
        case "Galician":
            return "gl-ES";
        case "Gujarati":
        case "Gujarati (India)":
            return "gu-IN";
        case "Hebrew":
        case "Hebrew (Israel)":
            return "he-IL";
        case "Hindi":
        case "Hindi (India)":
            return "hi-IN";
        case "Croatian":
            return "hr-HR";
        case "Hungarian":
        case "Hungarian (Hungary)":
            return "hu-HU";
        case "Armenian":
        case "Armenian (Armenia)":
            return "hy-AM";
        case "Indonesian":
        case "Indonesian (Indonesia)":
            return "id-ID";
        case "Icelandic":
        case "Icelandic (Iceland)":
            return "is-IS";
        case "Italian (Switzerland)":
            return "it-CH";
        case "Italian":
        case "Italian (Italy)":
            return "it-IT";
        case "Japanese":
        case "Japanese (Japan)":
            return "ja-JP";
        case "Javanese":
        case "Javanese (Latin, Indonesia)":
            return "jv-ID";
        case "Georgian":
        case "Georgian (Georgia)":
            return "ka-GE";
        case "Kazakh":
        case "Kazakh (Kazakhstan)":
            return "kk-KZ";
        case "Khmer":
        case "Khmer (Cambodia)":
            return "km-KH";
        case "Kannada":
        case "Kannada (India)":
            return "kn-IN";
        case "Korean":
        case "Korean (Korea)":
            return "ko-KR";
        case "Lao":
        case "Lao (Laos)":
            return "lo-LA";
        case "Lithuanian":
        case "Lithuanian (Lithuania)":
            return "lt-LT";
        case "Latvian":
        case "Latvian (Latvia)":
            return "lv-LV";
        case "Macedonian":
        case "Macedonian (North Macedonia)":
            return "mk-MK";
        case "Malayalam":
        case "Malayalam (India)":
            return "ml-IN";
        case "Mongolian":
        case "Mongolian (Mongolia)":
            return "mn-MN";
        case "Marathi":
        case "Marathi (India)":
            return "mr-IN";
        case "Malay":
        case "Malay (Malaysia)":
            return "ms-MY";
        case "Maltese":
        case "Maltese (Malta)":
            return "mt-MT";
        case "Burmese":
        case "Burmese (Myanmar)":
            return "my-MM";
        case "Norwegian Bokmål":
        case "Norwegian Bokmål (Norway)":
            return "nb-NO";
        case "Nepali":
        case "Nepali (Nepal)":
            return "ne-NP";
        case "Dutch":
        case "Dutch (Belgium)":
            return "nl-BE";
        case "Dutch (Netherlands)":
            return "nl-NL";
        case "Punjabi":
            return "pa-IN";
        case "Polish":
        case "Polish (Poland)":
            return "pl-PL";
        case "Pashto":
        case "Pashto (Afghanistan)":
            return "ps-AF";
        case "Portuguese":
        case "Portuguese (Brazil)":
            return "pt-BR";
        case "Portuguese (Portugal)":
            return "pt-PT";
        case "Romanian":
        case "Romanian (Romania)":
            return "ro-RO";
        case "Russian":
        case "Russian (Russia)":
            return "ru-RU";
        case "Sinhala":
        case "Sinhala (Sri Lanka)":
            return "si-LK";
        case "Slovak":
        case "Slovak (Slovakia)":
            return "sk-SK";
        case "Slovenian":
        case "Slovenian (Slovenia)":
            return "sl-SI";
        case "Somali":
        case "Somali (Somalia)":
            return "so-SO";
        case "Albanian":
        case "Albanian (Albania)":
            return "sq-AL";
        case "Serbian":
            return "sr-RS";
        case "Swedish":
        case "Swedish (Sweden)":
            return "sv-SE";
        case "Swahili":
        case "Swahili (Kenya)":
            return "sw-KE";
        case "Swahili (Tanzania)":
            return "sw-TZ";
        case "Tamil":
        case "Tamil (India)":
            return "ta-IN";
        case "Telugu":
            return "te-IN";
        case "Thai":
        case "Thai (Thailand)":
            return "th-TH";
        case "Turkish":
        case "Turkish (Türkiye)":
            return "tr-TR";
        case "Ukrainian":
        case "Ukrainian (Ukraine)":
            return "uk-UA";
        case "Urdu":
        case "Urdu (India)":
            return "ur-IN";
        case "Uzbek":
        case "Uzbek (Latin, Uzbekistan)":
            return "uz-UZ";
        case "Vietnamese":
        case "Vietnamese (Vietnam)":
            return "vi-VN";
        case "Chinese (Wu, Simplified)":
            return "wuu-CN";
        case "Chinese (Cantonese, Simplified)":
            return "yue-CN";
        case "Chinese":
        case "Chinese (Pinyin)":
        case "Chinese (Hanzi)":
        case "Chinese (Mandarin, Simplified)":
            return "zh-CN";
        case "Chinese (Jilu Mandarin, Simplified)":
            return "zh-CN-shandong";
        case "Chinese (Southwestern Mandarin, Simplified)":
            return "zh-CN-sichuan";
        case "Chinese (Cantonese, Traditional)":
            return "zh-HK";
        case "Chinese (Taiwanese Mandarin, Traditional)":
            return "zh-TW";
        case "Zulu":
        case "Zulu (South Africa)":
            return "zu-ZA";
        case "Hausa":
            return "ha-NG";
        case "Odia":
            return "or-IN";
        case "Tagalog":
            return "fil-PH";
        case "Yoruba":
            return "yo-NG";
        case "Igbo":
            return "ig-NG";
        case "Bhojpuri":
            return "hi-IN";
        case "Assamese":
            return "as-IN";
        case "isiZulu":
            return "zu-ZA";
        default:
            return "en-US";
    }
  }