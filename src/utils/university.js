/**
 * University Alias Dictionary & Normalization Utility
 * Maps common abbreviations, acronyms, and name variants to official standard names.
 */

const UNIVERSITY_ALIAS_MAP = {
  // UNHAS
  'unhas': 'Universitas Hasanuddin',
  'univ hasanuddin': 'Universitas Hasanuddin',
  'universitas hasanuddin': 'Universitas Hasanuddin',
  'unhas makassar': 'Universitas Hasanuddin',

  // UNM
  'unm': 'Universitas Negeri Makassar',
  'univ negeri makassar': 'Universitas Negeri Makassar',
  'universitas negeri makassar': 'Universitas Negeri Makassar',
  'ikip': 'Universitas Negeri Makassar',
  'ikip makassar': 'Universitas Negeri Makassar',

  // PNUP
  'pnup': 'Politeknik Negeri Ujung Pandang',
  'poltek': 'Politeknik Negeri Ujung Pandang',
  'poltek ujung pandang': 'Politeknik Negeri Ujung Pandang',
  'politeknik negeri ujung pandang': 'Politeknik Negeri Ujung Pandang',

  // UMI
  'umi': 'Universitas Muslim Indonesia',
  'univ muslim indonesia': 'Universitas Muslim Indonesia',
  'universitas muslim indonesia': 'Universitas Muslim Indonesia',

  // UNISMUH
  'unismuh': 'Universitas Muhammadiyah Makassar',
  'unismuh makassar': 'Universitas Muhammadiyah Makassar',
  'universitas muhammadiyah makassar': 'Universitas Muhammadiyah Makassar',

  // UINAM
  'uin': 'UIN Alauddin Makassar',
  'uinam': 'UIN Alauddin Makassar',
  'uin alauddin': 'UIN Alauddin Makassar',
  'universitas islam negeri alauddin': 'UIN Alauddin Makassar',

  // BOSOWA
  'unibos': 'Universitas Bosowa',
  'bosowa': 'Universitas Bosowa',
  'universitas bosowa': 'Universitas Bosowa',

  // UNIFA
  'unifa': 'Universitas Fajar',
  'fajar': 'Universitas Fajar',
  'universitas fajar': 'Universitas Fajar',

  // ATMA JAYA
  'atmajaya': 'Universitas Atma Jaya Makassar',
  'atma jaya': 'Universitas Atma Jaya Makassar',
  'universitas atma jaya': 'Universitas Atma Jaya Makassar',

  // UKIP
  'ukip': 'Universitas Kristen Indonesia Paulus',
  'uki paulus': 'Universitas Kristen Indonesia Paulus',

  // STIM LASHARAN
  'stim lasharan': 'STIM Lasharan Jaya Makassar',
  'lasharan': 'STIM Lasharan Jaya Makassar',

  // STIKES / POLTEKKES
  'poltekkes': 'Poltekkes Kemenkes Makassar',
  'poltekkes makassar': 'Poltekkes Kemenkes Makassar'
};

const OFFICIAL_UNIVERSITIES = [
  { name: 'Universitas Hasanuddin', acronym: 'UNHAS' },
  { name: 'Universitas Negeri Makassar', acronym: 'UNM' },
  { name: 'Politeknik Negeri Ujung Pandang', acronym: 'PNUP' },
  { name: 'Universitas Muslim Indonesia', acronym: 'UMI' },
  { name: 'Universitas Muhammadiyah Makassar', acronym: 'UNISMUH' },
  { name: 'UIN Alauddin Makassar', acronym: 'UINAM' },
  { name: 'Universitas Bosowa', acronym: 'UNIBOS' },
  { name: 'Universitas Fajar', acronym: 'UNIFA' },
  { name: 'Universitas Atma Jaya Makassar', acronym: 'ATMA JAYA' },
  { name: 'Universitas Kristen Indonesia Paulus', acronym: 'UKIP' },
  { name: 'Poltekkes Kemenkes Makassar', acronym: 'POLTEKKES' }
];

/**
 * Standardizes university input text.
 * Converts "Unhas", "unm", "pnup" -> "Universitas Hasanuddin", etc.
 */
function normalizeUniversity(input) {
  if (!input) return '';
  const trimmed = input.trim();
  const lowerKey = trimmed.toLowerCase().replace(/\s+/g, ' ');

  if (UNIVERSITY_ALIAS_MAP[lowerKey]) {
    return UNIVERSITY_ALIAS_MAP[lowerKey];
  }

  // Title case for new unknown universities
  return trimmed
    .split(' ')
    .map(word => {
      if (word.length <= 3 && word === word.toUpperCase()) return word; // Keep acronyms as-is
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Returns formatted university list for frontend select hints.
 */
function getOfficialUniversityList() {
  return OFFICIAL_UNIVERSITIES.map(u => `${u.name} (${u.acronym})`);
}

module.exports = {
  normalizeUniversity,
  getOfficialUniversityList,
  UNIVERSITY_ALIAS_MAP,
  OFFICIAL_UNIVERSITIES
};
