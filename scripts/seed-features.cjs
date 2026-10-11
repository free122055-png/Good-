const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc, getDocs } = require("firebase/firestore");
const config = require("../firebase-applet-config.json");

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const INITIAL_BIODATAS = [
  {
    id: "bio_1001",
    biodataCode: "MB-1001",
    userId: "admin_seed_1",
    gender: "groom",
    status: "active",
    isVerified: true,
    isFeatured: true,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
    fullName: "মুহাম্মাদ আবদুল্লাহ",
    maritalStatus: "অবিবাহিত",
    age: 25,
    height: "৫ ফুট ৭ ইঞ্চি",
    weight: "৬৮ কেজি",
    complexion: "উজ্জ্বল ফর্সা",
    bloodGroup: "B+",
    presentDistrict: "সিলেট",
    presentUpazila: "জিন্দাবাজার",
    permanentDistrict: "সিলেট",
    educationMethod: "সাধারণ শিক্ষা",
    highestDegree: "বিএসসি ইন সিএসই",
    institute: "শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়",
    occupation: "প্রভাষক ও গবেষক",
    monthlyIncome: "৬০,০০০ - ৮০,০০০ টাকা",
    fatherOccupation: "ব্যবসায়ী",
    motherOccupation: "গৃহিণী",
    brothersCount: 1,
    sistersCount: 1,
    familyDetails: "দ্বীনি ও মার্জিত মধ্যবিত্ত পরিবার।",
    familyStatus: "দ্বীনি মধ্যবিত্ত",
    salahRegularity: "৫ ওয়াক্ত জামাতে",
    hijabOrBeard: "সুন্নতি দাড়ি ও টাখনুর উপরে কাপড়",
    quranRecitation: "সহিহভাবে প্রতিদিন তিলাওয়াত করি",
    mahramNonMahramCompliance: "কঠোরভাবে মেনে চলি",
    aboutSelf: "আমি সুন্নাহসম্মত জীবনযাপনে অভ্যস্ত। প্রফেশনাল লাইফের পাশাপাশি দ্বীনি জ্ঞানার্জনে মনোযোগী।",
    expectedAgeRange: "১৮ - ২২ বছর",
    expectedHeight: "৫ ফুট ২ ইঞ্চি - ৫ ফুট ৫ ইঞ্চি",
    expectedEducation: "এইচএসসি / স্নাতক / আলেমা",
    expectedReligiousQualities: "নিয়মিত সালাত আদায়কারী, পর্দা মেইনটেইন করেন এমন চরিত্রবান পাত্রী।",
    guardianName: "হাজী আব্দুর রহমান",
    guardianRelation: "বাবা",
    guardianPhone: "01711000000",
    photoBlurred: true
  },
  {
    id: "bio_1002",
    biodataCode: "MB-1002",
    userId: "admin_seed_2",
    gender: "bride",
    status: "active",
    isVerified: true,
    isFeatured: true,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    fullName: "ফাতিমা তুয যাহরা",
    maritalStatus: "অবিবাহিত",
    age: 21,
    height: "৫ ফুট ৩ ইঞ্চি",
    weight: "৫২ কেজি",
    complexion: "ফর্সা",
    bloodGroup: "O+",
    presentDistrict: "ঢাকা",
    presentUpazila: "মিরপুর",
    permanentDistrict: "কুমিল্লা",
    educationMethod: "মাদরাসা শিক্ষা",
    highestDegree: "দাওরায়ে হাদিস (মাস্টার্স সমমান)",
    institute: "মারকাযুদ্দীন আল ইসলামিয়া",
    occupation: "শিক্ষিকা (মহিলা মাদরাসা)",
    monthlyIncome: "১৫,০০০ - ২৫,০০০ টাকা",
    fatherOccupation: "অবসরপ্রাপ্ত সরকারি কর্মকর্তা",
    motherOccupation: "গৃহিণী",
    brothersCount: 2,
    sistersCount: 0,
    familyDetails: "পরহেজগার ও পর্দানশীন সুশিক্ষিত পরিবার।",
    familyStatus: "দ্বীনি উচ্চ-মধ্যবিত্ত",
    salahRegularity: "ওয়াক্তমতো সর্বদা",
    hijabOrBeard: "নিকাব ও হাত-পায়ের মোজাসহ পূর্ণ শরয়ী পর্দা",
    quranRecitation: "হাফেজা ও প্রতিদিন তিলাওয়াতকারী",
    mahramNonMahramCompliance: "কঠোরভাবে শরয়ী পর্দা রক্ষা করি",
    aboutSelf: "শান্ত স্বভাবের, কোরআন ও সুন্নাহর আলোকে সংসার গড়ার মনোভাব রাখি।",
    expectedAgeRange: "২৪ - ২৮ বছর",
    expectedHeight: "৫ ফুট ৬ ইঞ্চি - ৫ ফুট ১০ ইঞ্চি",
    expectedEducation: "গ্র্যাজুয়েট / ইঞ্জিনিয়ার / ব্যবসায়ী / আলেম",
    expectedReligiousQualities: "হালাল উপার্জনকারী ও সুন্নাহ অনুসরণকারী পাত্র কাম্য।",
    guardianName: "মোহাম্মদ রফিকুল ইসলাম",
    guardianRelation: "বাবা",
    guardianPhone: "01819000000",
    photoBlurred: true
  },
  {
    id: "bio_1003",
    biodataCode: "MB-1003",
    userId: "admin_seed_3",
    gender: "groom",
    status: "active",
    isVerified: true,
    isFeatured: false,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    fullName: "তানভীর হাসান",
    maritalStatus: "অবিবাহিত",
    age: 27,
    height: "৫ ফুট ৮ ইঞ্চি",
    weight: "৭২ কেজি",
    complexion: "শ্যামলা",
    bloodGroup: "A+",
    presentDistrict: "চট্টগ্রাম",
    presentUpazila: "পাঁচলাইশ",
    permanentDistrict: "চট্টগ্রাম",
    educationMethod: "সাধারণ শিক্ষা",
    highestDegree: "এমবিএ (মার্কেটিং)",
    institute: "চট্টগ্রাম বিশ্ববিদ্যালয়",
    occupation: "সিনিয়র এক্সিকিউটিভ (বহুজাতিক কোম্পানি)",
    monthlyIncome: "৭০,০০০ - ৯০,০০০ টাকা",
    fatherOccupation: "ব্যবসায়ী",
    motherOccupation: "গৃহিণী",
    brothersCount: 1,
    sistersCount: 2,
    familyDetails: "সম্মানিত ও ধার্মিক বনেদি পরিবার।",
    familyStatus: "উচ্চ-মধ্যবিত্ত",
    salahRegularity: "৫ ওয়াক্ত সালাত আদায় করি",
    hijabOrBeard: "সুন্নতি দাড়ি রয়েছে",
    quranRecitation: "সহিহভাবে নিয়মিত তিলাওয়াত",
    mahramNonMahramCompliance: "মেনে চলার সর্বোচ্চ চেষ্টা করি",
    aboutSelf: "সৎ, কর্মঠ এবং সুন্নাহ মেনে চলা আধুনিক মানসিকতার দ্বীনি মানুষ।",
    expectedAgeRange: "২০ - ২৪ বছর",
    expectedHeight: "৫ ফুট ১ ইঞ্চি - ৫ ফুট ৫ ইঞ্চি",
    expectedEducation: "স্নাতক / অনার্সে অধ্যয়নরত",
    expectedReligiousQualities: "পর্দাশীল ও দ্বীনদার পাত্রী।",
    guardianName: "আলহাজ্ব শামসুল আলম",
    guardianRelation: "বাবা",
    guardianPhone: "01912000000",
    photoBlurred: true
  },
  {
    id: "bio_1004",
    biodataCode: "MB-1004",
    userId: "admin_seed_4",
    gender: "bride",
    status: "active",
    isVerified: true,
    isFeatured: false,
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
    fullName: "মরিয়ম আক্তার",
    maritalStatus: "অবিবাহিত",
    age: 22,
    height: "৫ ফুট ২ ইঞ্চি",
    weight: "৫০ কেজি",
    complexion: "উজ্জ্বল শ্যামলা",
    bloodGroup: "AB+",
    presentDistrict: "রাজশাহী",
    presentUpazila: "বোয়ালিয়া",
    permanentDistrict: "রাজশাহী",
    educationMethod: "সমন্বিত শিক্ষা",
    highestDegree: "বিবিএ শেষ বর্ষ",
    institute: "রাজশাহী বিশ্ববিদ্যালয়",
    occupation: "শিক্ষার্থী ও ফ্রিল্যান্স কনটেন্ট রাইটার",
    monthlyIncome: "২০,০০০ - ৩০,০০০ টাকা",
    fatherOccupation: "কলেজ শিক্ষক",
    motherOccupation: "গৃহিণী",
    brothersCount: 0,
    sistersCount: 1,
    familyDetails: "শিক্ষিত ও দ্বীনি সচেতন আদর্শ পরিবার।",
    familyStatus: "মধ্যবিত্ত",
    salahRegularity: "৫ ওয়াক্ত সালাত আদায় করি",
    hijabOrBeard: "বোরকা ও হিজাব পরিধান করি",
    quranRecitation: "প্রতিদিন সকালে তিলাওয়াত করি",
    mahramNonMahramCompliance: "সচেতনভাবে মেনে চলি",
    aboutSelf: "পারিবারিক মূল্যবোধ ও ইসলামী অনুশাসনে বিশ্বাসী একনিষ্ঠ তরুণী।",
    expectedAgeRange: "২৬ - ৩০ বছর",
    expectedHeight: "৫ ফুট ৫ ইঞ্চি+",
    expectedEducation: "স্নাতকোত্তর / প্রকৌশলী / বিসিএস ক্যাডার / ভালো চাকরি",
    expectedReligiousQualities: "ধূমপানমুক্ত, সালাতী ও চরিত্রবান পাত্র।",
    guardianName: "প্রফেসর ড. আমিনুল ইসলাম",
    guardianRelation: "বাবা",
    guardianPhone: "01720000000",
    photoBlurred: true
  }
];

const INITIAL_OFFERS = [
  {
    id: 'off_1',
    operator: 'Grameenphone',
    category: 'internet',
    name: '1 GB ইন্টারনেট প্যাক',
    amount: '1 GB',
    validity: '৩ দিন',
    price: 29,
    logo: 'https://www.grameenphone.com/sites/default/files/gp-logo-social.png',
    description: '১ জিবি ইন্টারনেট, মেয়াদ ৩ দিন। সকল প্রিপেইড গ্রাহকদের জন্য প্রযোজ্য। দ্রুতগতির ফোরজি ইন্টারনেট উপভোগ করুন।',
    loanRule: 'allowed',
    loanNote: 'অফারে কোনো লোন বা আউটস্ট্যান্ডিং থাকলেও এই অফারটি নেওয়া যাবে।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'প্রিপেইড সিম',
    activationNote: 'বিকাশ/নগদ পেমেন্ট করার পর ট্রানজাকশন আইডি দিয়ে অর্ডার কনফার্ম করুন। ১০-১৫ মিনিটের মধ্যে অফারটি আপনার নম্বরে চলে যাবে।',
    extraInfo: 'ব্যালেন্স জানতে ডায়াল করুন *১২১*১#',
    isActive: true,
    createdAt: Date.now() - 86400000 * 5
  },
  {
    id: 'off_2',
    operator: 'Robi',
    category: 'internet',
    name: '2 GB ইন্টারনেট প্যাক',
    amount: '2 GB',
    validity: '৭ দিন',
    price: 49,
    logo: 'https://images.seeklogo.com/logo-png/38/2/robi-axiata-logo-png_seeklogo-389334.png',
    description: '২ জিবি ইন্টারনেট, মেয়াদ ৭ দিন। রবি প্রিপেইড গ্রাহকদের জন্য সেরা অফার।',
    loanRule: 'allowed',
    loanNote: 'লোন থাকলেও এই অফার নেওয়া যাবে।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'সব সার্কেল',
    activationNote: 'পেমেন্ট সফল হওয়ার পর সঠিক ট্রানজাকশন আইডি প্রদান করুন।',
    extraInfo: 'ইন্টারনেট ব্যালেন্স জানতে *৩# ডায়াল করুন।',
    isActive: true,
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: 'off_3',
    operator: 'Banglalink',
    category: 'internet',
    name: '1.5 GB ইন্টারনেট প্যাক',
    amount: '1.5 GB',
    validity: '৭ দিন',
    price: 45,
    logo: 'https://images.seeklogo.com/logo-png/38/2/banglalink-logo-png_seeklogo-389332.png',
    description: '১.৫ জিবি ইন্টারনেট, মেয়াদ ৭ দিন। বাংলালিংক গ্রাহকদের জন্য দারুন ইন্টারনেট প্যাক।',
    loanRule: 'not_allowed',
    loanNote: 'সিম এ কোনো ধরনের ঋণ বা লোন থাকলে এই অফারটি প্রযোজ্য হবে না।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'প্রিপেইড সিম',
    activationNote: 'অর্ডার করার সময় সঠিক বাংলালিংক নম্বর দিন।',
    extraInfo: 'ব্যালেন্স চেক করতে *১২১২*১# ডায়াল করুন।',
    isActive: true,
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: 'off_4',
    operator: 'Teletalk',
    category: 'internet',
    name: '3 GB ইন্টারনেট প্যাক',
    amount: '3 GB',
    validity: '৭ দিন',
    price: 69,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Teletalk_Logo.svg',
    description: '৩ জিবি ইন্টারনেট, মেয়াদ ৭ দিন। সাশ্রয়ী মূল্যে টেলিটক ইন্টারনেট।',
    loanRule: 'allowed',
    loanNote: 'লোন থাকলেও সমস্যা নেই।',
    prepaidPostpaid: 'both',
    targetSim: 'সকল সিম',
    activationNote: 'সফল পেমেন্টের পর অ্যাডমিন যাচাই করে অফার সক্রিয় করবেন।',
    extraInfo: 'এমবি চেক করতে *১৫২# ডায়াল করুন।',
    isActive: true,
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'off_5',
    operator: 'Grameenphone',
    category: 'internet',
    name: '5 GB ইন্টারনেট প্যাক',
    amount: '5 GB',
    validity: '১৫ দিন',
    price: 115,
    logo: 'https://www.grameenphone.com/sites/default/files/gp-logo-social.png',
    description: '৫ জিবি ইন্টারনেট, মেয়াদ ১৫ দিন। জিপির জনপ্রিয় সাশ্রয়ী ইন্টারনেট প্যাক।',
    loanRule: 'allowed',
    loanNote: 'লোন থাকলে অফার নিতে কোনো বাধা নেই।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'প্রিপেইড সিম',
    activationNote: 'পেমেন্ট সম্পন্ন করার পর TrxID প্রদান করুন।',
    extraInfo: 'মেয়াদ শেষে অব্যবহৃত এমবি যোগ হবে না।',
    isActive: true,
    createdAt: Date.now() - 86400000 * 1
  },
  {
    id: 'off_6',
    operator: 'Robi',
    category: 'internet',
    name: '10 GB ইন্টারনেট প্যাক',
    amount: '10 GB',
    validity: '৩০ দিন',
    price: 199,
    logo: 'https://images.seeklogo.com/logo-png/38/2/robi-axiata-logo-png_seeklogo-389334.png',
    description: '১০ জিবি মেগাবাইট, মেয়াদ ৩০ দিন। এক মাসের পুরো শান্তিতে ইন্টারনেট ব্যবহার করুন।',
    loanRule: 'allowed',
    loanNote: 'লোন থাকলেও প্রযোজ্য।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'সব সার্কেল',
    activationNote: 'সঠিক নম্বর ও পেমেন্ট নিশ্চিত করুন।',
    extraInfo: 'সার্বক্ষণিক ফোরজি স্পিড।',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'off_7',
    operator: 'Banglalink',
    category: 'internet',
    name: '12 GB ইন্টারনেট প্যাক',
    amount: '12 GB',
    validity: '৩০ দিন',
    price: 249,
    logo: 'https://images.seeklogo.com/logo-png/38/2/banglalink-logo-png_seeklogo-389332.png',
    description: '১২ জিবি ইন্টারনেট প্যাক, ৩০ দিন মেয়াদ। বাংলালিংক গ্রাহকদের দীর্ঘমেয়াদী প্যাক।',
    loanRule: 'not_allowed',
    loanNote: 'লোন থাকা অবস্থায় এই অফার প্রযোজ্য নয়।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'প্রিপেইড',
    activationNote: 'অ্যাডমিন কর্তৃক অনুমোদিত হওয়ার পর অফার যুক্ত হবে।',
    extraInfo: 'যেকোনো প্রয়োজনে হেল্পলাইনে যোগাযোগ করুন।',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'off_min_1',
    operator: 'Grameenphone',
    category: 'minute',
    name: '100 মিনিট টকটাইম',
    amount: '100 মিনিট',
    validity: '৭ দিন',
    price: 72,
    logo: 'https://www.grameenphone.com/sites/default/files/gp-logo-social.png',
    description: 'যে কোনো লোকাল নম্বরে ১০০ মিনিট টকটাইম, মেয়াদ ৭ দিন।',
    loanRule: 'allowed',
    loanNote: 'লোন থাকলেও চলবে।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'সব প্রিপেইড',
    activationNote: 'সঠিক নম্বর দিন।',
    extraInfo: 'মিনিট চেক করতে *১২১*১*২# ডায়াল করুন।',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'off_bun_1',
    operator: 'Robi',
    category: 'bundle',
    name: '1 GB + 50 মিনিট বান্ডেল',
    amount: '1 GB + 50 মিনিট',
    validity: '৭ দিন',
    price: 85,
    logo: 'https://images.seeklogo.com/logo-png/38/2/robi-axiata-logo-png_seeklogo-389334.png',
    description: '১ জিবি ইন্টারনেট ও ৫০ মিনিট টকটাইম বান্ডেল প্যাক, মেয়াদ ৭ দিন।',
    loanRule: 'allowed',
    loanNote: 'লোন থাকলেও নেওয়া যাবে।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'সব সার্কেল',
    activationNote: 'পেমেন্ট ভেরিফাই করে দ্রুত একটিভ করা হবে।',
    extraInfo: 'বান্ডেল ব্যালেন্স চেক করতে *২২২*৮# ডায়াল করুন।',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'off_sms_1',
    operator: 'Banglalink',
    category: 'sms',
    name: '200 SMS প্যাক',
    amount: '200 SMS',
    validity: '১০ দিন',
    price: 25,
    logo: 'https://images.seeklogo.com/logo-png/38/2/banglalink-logo-png_seeklogo-389332.png',
    description: 'যেকোনো নম্বরে ২০০ এস এম এস, মেয়াদ ১০ দিন।',
    loanRule: 'allowed',
    loanNote: 'লোন থাকলেও সমস্যা নেই।',
    prepaidPostpaid: 'prepaid',
    targetSim: 'প্রিপেইড',
    activationNote: 'এসএমএস প্যাক অর্ডারের পর প্রদান করা হবে।',
    extraInfo: 'এসএমএস ব্যালেন্স জানতে *১২৪*৪# ডায়াল করুন।',
    isActive: true,
    createdAt: Date.now()
  }
];

const INITIAL_METHODS = [
  {
    id: 'm_1',
    methodName: 'বিকাশ',
    accountNumber: '01712345678 (Personal / Send Money)',
    instruction: 'বিকাশ অ্যাপ থেকে "Send Money" সম্পন্ন করে নিচের বক্সে আপনার পেমেন্টের TrxID লিখুন।',
    isActive: true
  },
  {
    id: 'm_2',
    methodName: 'নগদ',
    accountNumber: '01812345678 (Personal / Send Money)',
    instruction: 'নগদ অ্যাপের মাধ্যমে সেন্ড মানি করে প্রাপ্ত ট্রানজাকশন আইডি (TrxID) নিচে দিন।',
    isActive: true
  },
  {
    id: 'm_3',
    methodName: 'রকেট',
    accountNumber: '01912345678-9 (Personal)',
    instruction: 'রকেট একাউন্টে টাকা পাঠিয়ে ট্রানজাকশন আইডি লিখুন।',
    isActive: true
  }
];

const INITIAL_CAPTIONS = [
  {
    id: "cap_love_1",
    text: "ভালোবাসা মানে শুধু পাওয়া নয়, প্রতিদিন একটু একটু করে হারিয়ে যাওয়া।",
    category: "ভালোবাসা",
    categoryId: "cat_love",
    categorySlug: "love",
    isPopular: true,
    isActive: true,
    createdAt: Date.now(),
    copyCount: 12
  },
  {
    id: "cap_islamic_1",
    text: "সবর করুন, নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে আছেন।",
    category: "ইসলামিক",
    categoryId: "cat_islamic",
    categorySlug: "islamic",
    isPopular: true,
    isActive: true,
    createdAt: Date.now(),
    copyCount: 25
  },
  {
    id: "cap_attitude_1",
    text: "আমি কারো পছন্দের তালিকায় থাকার জন্য নিজের ব্যক্তিত্ব পরিবর্তন করি না।",
    category: "অ্যাটিটিউড",
    categoryId: "cat_attitude",
    categorySlug: "attitude",
    isPopular: true,
    isActive: true,
    createdAt: Date.now(),
    copyCount: 18
  },
  {
    id: "cap_sad_1",
    text: "কিছু কষ্ট এমন থাকে যা কাউকে বলা যায় না, শুধু নীরবে সহ্য করতে হয়।",
    category: "কষ্ট",
    categoryId: "cat_sad",
    categorySlug: "sad",
    isPopular: true,
    isActive: true,
    createdAt: Date.now(),
    copyCount: 15
  }
];

async function seed() {
  console.log("Starting seed into Firestore...");

  // 1. Seed Biodatas
  const biodatasSnap = await getDocs(collection(db, "biodatas"));
  if (biodatasSnap.empty) {
    console.log("Seeding biodatas...");
    for (const b of INITIAL_BIODATAS) {
      await setDoc(doc(db, "biodatas", b.id), b);
    }
    console.log("Biodatas seeded:", INITIAL_BIODATAS.length);
  } else {
    console.log("Biodatas already exist:", biodatasSnap.size);
  }

  // 2. Seed Telecom Offers
  const offersSnap = await getDocs(collection(db, "telecom_offers"));
  if (offersSnap.empty) {
    console.log("Seeding telecom offers...");
    for (const o of INITIAL_OFFERS) {
      await setDoc(doc(db, "telecom_offers", o.id), o);
    }
    console.log("Telecom offers seeded:", INITIAL_OFFERS.length);
  } else {
    console.log("Telecom offers already exist:", offersSnap.size);
  }

  // 3. Seed Telecom Payment Methods
  const methodsSnap = await getDocs(collection(db, "telecom_payment_methods"));
  if (methodsSnap.empty) {
    console.log("Seeding telecom payment methods...");
    for (const m of INITIAL_METHODS) {
      await setDoc(doc(db, "telecom_payment_methods", m.id), m);
    }
    console.log("Telecom payment methods seeded:", INITIAL_METHODS.length);
  } else {
    console.log("Telecom payment methods already exist:", methodsSnap.size);
  }

  // 4. Seed Starter Captions
  const capsSnap = await getDocs(collection(db, "captions"));
  if (capsSnap.empty) {
    console.log("Seeding starter captions...");
    for (const c of INITIAL_CAPTIONS) {
      await setDoc(doc(db, "captions", c.id), c);
    }
    console.log("Starter captions seeded:", INITIAL_CAPTIONS.length);
  } else {
    console.log("Captions already exist:", capsSnap.size);
  }

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
