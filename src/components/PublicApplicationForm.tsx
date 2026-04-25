import { useState, type ReactNode } from 'react';
import { ArrowRight, Briefcase, Building2, ChevronDown, Globe2, Mail, MapPin, Phone, Share2, ShieldCheck, Upload, User2, Users } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import type { PublicCandidatePortalResponse, PublicEmployerPortalResponse, PublicPartnerPortalResponse } from '../lib/apiClient';
import { useAuth } from '../lib/authContext';
import ApplicationWizard from './application/ApplicationWizard';

type IntakeAudience = 'candidate' | 'employer' | 'partner';

type CandidateFormState = {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  countryOfInterest: string;
  position: string;
  experience: string;
  comments: string;
};

type EmployerFormState = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  professions: string;
  quantity: string;
  salaryRange: string;
  dutyHours: string;
  contractDuration: string;
  benefitsIncluded: string;
  comments: string;
};

type PartnerFormState = {
  applicantName: string;
  email: string;
  phone: string;
  companyName: string;
  cityCountry: string;
  district: string;
  cnic: string;
  partnerType: string;
};

const candidateDefaults: CandidateFormState = {
  fullName: '',
  email: '',
  phone: '',
  nationality: 'Pakistani',
  countryOfInterest: 'Saudi Arabia',
  position: '',
  experience: '3-5 Years',
  comments: '',
};

const employerDefaults: EmployerFormState = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  professions: '',
  quantity: '',
  salaryRange: '',
  dutyHours: '',
  contractDuration: '',
  benefitsIncluded: '',
  comments: '',
};

const partnerDefaults: PartnerFormState = {
  applicantName: '',
  email: '',
  phone: '',
  companyName: '',
  cityCountry: '',
  district: '',
  cnic: '',
  partnerType: '',
};

const NATIONALITY_OPTIONS = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Argentinian', 'Armenian', 'Australian', 'Austrian',
  'Azerbaijani', 'Bahraini', 'Bangladeshi', 'Belgian', 'Bhutanese', 'Bolivian', 'Brazilian', 'British',
  'Bulgarian', 'Cambodian', 'Cameroonian', 'Canadian', 'Chilean', 'Chinese', 'Colombian', 'Costa Rican',
  'Croatian', 'Cuban', 'Czech', 'Danish', 'Dominican', 'Egyptian', 'Emirati', 'Eritrean', 'Estonian',
  'Ethiopian', 'Filipino', 'Finnish', 'French', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Guatemalan',
  'Haitian', 'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli',
  'Italian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakhstani', 'Kenyan', 'Kuwaiti', 'Kyrgyz',
  'Laotian', 'Latvian', 'Lebanese', 'Liberian', 'Libyan', 'Lithuanian', 'Macedonian', 'Malagasy',
  'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Mauritanian', 'Mauritian', 'Mexican',
  'Moldovan', 'Mongolian', 'Moroccan', 'Mozambican', 'Myanmarese', 'Namibian', 'Nepalese',
  'New Zealander', 'Nigerian', 'Norwegian', 'Omani', 'Pakistani', 'Palestinian', 'Panamanian',
  'Peruvian', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saudi',
  'Senegalese', 'Serbian', 'Singaporean', 'Slovak', 'Slovenian', 'Somali', 'South African',
  'South Korean', 'South Sudanese', 'Spanish', 'Sri Lankan', 'Sudanese', 'Swedish', 'Swiss',
  'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Togolese', 'Trinidadian', 'Tunisian',
  'Turkish', 'Turkmen', 'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek', 'Venezuelan', 'Vietnamese',
  'Yemeni', 'Zambian', 'Zimbabwean', 'Other',
];

const WORLD_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina',
  'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
  'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina',
  'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (Brazzaville)', 'Congo (Kinshasa)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji',
  'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
  'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

const COUNTRY_INTEREST_OPTIONS = WORLD_COUNTRIES;

/* ── Cities by country (employer form auto-city) ── */
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'Afghanistan': ['Kabul','Kandahar','Herat','Mazar-i-Sharif','Jalalabad'],
  'Albania': ['Tirana','Durrës','Vlorë','Shkodër','Fier'],
  'Algeria': ['Algiers','Oran','Constantine','Annaba','Blida','Tlemcen','Sétif','Batna'],
  'Angola': ['Luanda','Huambo','Lobito','Benguela','Lubango'],
  'Argentina': ['Buenos Aires','Córdoba','Rosario','Mendoza','La Plata','San Miguel de Tucumán','Mar del Plata'],
  'Armenia': ['Yerevan','Gyumri','Vanadzor'],
  'Australia': ['Sydney','Melbourne','Brisbane','Perth','Adelaide','Gold Coast','Canberra','Newcastle','Hobart','Darwin'],
  'Austria': ['Vienna','Graz','Linz','Salzburg','Innsbruck','Klagenfurt'],
  'Azerbaijan': ['Baku','Ganja','Sumqayit','Mingachevir','Nakhchivan'],
  'Bahrain': ['Manama','Riffa','Muharraq','Hamad Town','Isa Town','Sitra','Budaiya'],
  'Bangladesh': ['Dhaka','Chittagong','Sylhet','Rajshahi','Khulna','Comilla','Mymensingh','Narayanganj'],
  'Belgium': ['Brussels','Antwerp','Ghent','Charleroi','Liège','Bruges','Namur','Leuven'],
  'Bolivia': ['La Paz','Santa Cruz de la Sierra','Cochabamba','Sucre','Oruro'],
  'Bosnia and Herzegovina': ['Sarajevo','Banja Luka','Tuzla','Zenica','Mostar'],
  'Brazil': ['São Paulo','Rio de Janeiro','Brasília','Salvador','Fortaleza','Belo Horizonte','Manaus','Curitiba','Porto Alegre','Recife','Belém','Goiânia'],
  'Bulgaria': ['Sofia','Plovdiv','Varna','Burgas','Ruse','Stara Zagora'],
  'Cambodia': ['Phnom Penh','Siem Reap','Battambang','Sihanoukville'],
  'Cameroon': ['Yaoundé','Douala','Bamenda','Bafoussam'],
  'Canada': ['Toronto','Montreal','Vancouver','Calgary','Edmonton','Ottawa','Winnipeg','Quebec City','Hamilton','Kitchener','Halifax','Victoria','Regina','Saskatoon'],
  'Chile': ['Santiago','Valparaíso','Concepción','Antofagasta','Temuco','La Serena'],
  'China': ['Beijing','Shanghai','Guangzhou','Shenzhen','Chengdu','Chongqing','Wuhan','Xi\'an','Hangzhou','Nanjing','Tianjin','Suzhou','Dongguan','Qingdao','Zhengzhou'],
  'Colombia': ['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Cúcuta','Bucaramanga'],
  'Congo (Kinshasa)': ['Kinshasa','Lubumbashi','Mbuji-Mayi','Kisangani','Kananga'],
  'Croatia': ['Zagreb','Split','Rijeka','Osijek','Zadar','Pula'],
  'Cuba': ['Havana','Santiago de Cuba','Camagüey','Holguín','Guantánamo'],
  'Cyprus': ['Nicosia','Limassol','Larnaca','Famagusta','Paphos'],
  'Czech Republic': ['Prague','Brno','Ostrava','Plzeň','Liberec','Olomouc'],
  'Denmark': ['Copenhagen','Aarhus','Odense','Aalborg','Frederiksberg','Esbjerg'],
  'Ecuador': ['Quito','Guayaquil','Cuenca','Manta','Ambato'],
  'Egypt': ['Cairo','Alexandria','Giza','Shubra El Kheima','Port Said','Suez','Luxor','Aswan','Mansoura','Tanta','Asyut','Ismailia'],
  'Ethiopia': ['Addis Ababa','Dire Dawa','Mekelle','Gondar','Hawassa','Bahir Dar'],
  'Finland': ['Helsinki','Espoo','Tampere','Vantaa','Oulu','Turku','Jyväskylä'],
  'France': ['Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille','Rennes','Reims','Le Havre','Saint-Étienne'],
  'Georgia': ['Tbilisi','Kutaisi','Batumi','Rustavi','Gori'],
  'Germany': ['Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart','Düsseldorf','Leipzig','Dortmund','Essen','Bremen','Dresden','Hanover','Nuremberg','Duisburg','Bochum','Wuppertal','Bielefeld','Bonn','Münster'],
  'Ghana': ['Accra','Kumasi','Tamale','Sekondi-Takoradi','Ashaiman'],
  'Greece': ['Athens','Thessaloniki','Patras','Heraklion','Larissa','Volos','Rhodes','Ioannina','Chania'],
  'Hungary': ['Budapest','Debrecen','Miskolc','Szeged','Pécs','Győr'],
  'India': ['Mumbai','Delhi','Bangalore','Hyderabad','Ahmedabad','Chennai','Kolkata','Surat','Pune','Jaipur','Lucknow','Kanpur','Nagpur','Patna','Indore','Thane','Bhopal','Visakhapatnam','Pimpri-Chinchwad','Vadodara','Coimbatore','Amritsar','Chandigarh','Kochi','Ludhiana'],
  'Indonesia': ['Jakarta','Surabaya','Bandung','Medan','Bekasi','Palembang','Tangerang','Makassar','Semarang','Depok','Yogyakarta','Batam','Pekanbaru'],
  'Iran': ['Tehran','Mashhad','Isfahan','Karaj','Tabriz','Shiraz','Ahvaz','Qom','Rasht','Kermanshah'],
  'Iraq': ['Baghdad','Basra','Mosul','Erbil','Sulaymaniyah','Kirkuk','Najaf','Karbala','Nasiriyah'],
  'Ireland': ['Dublin','Cork','Limerick','Galway','Waterford','Drogheda','Dundalk'],
  'Israel': ['Jerusalem','Tel Aviv','Haifa','Rishon LeZion','Petah Tikva','Ashdod','Netanya','Beer Sheba'],
  'Italy': ['Rome','Milan','Naples','Turin','Palermo','Genoa','Bologna','Florence','Bari','Catania','Venice','Verona','Messina','Padua','Trieste','Brescia'],
  'Japan': ['Tokyo','Yokohama','Osaka','Nagoya','Sapporo','Kobe','Kyoto','Fukuoka','Kawasaki','Saitama','Hiroshima','Sendai','Kitakyushu','Chiba','Sakai'],
  'Jordan': ['Amman','Zarqa','Irbid','Russeifa','Aqaba','Madaba','Jerash','Karak','Mafraq'],
  'Kazakhstan': ['Almaty','Nur-Sultan','Shymkent','Karaganda','Aktobe','Taraz','Pavlodar','Ust-Kamenogorsk'],
  'Kenya': ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Malindi','Thika'],
  'Kuwait': ['Kuwait City','Hawalli','Al Ahmadi','Al Farwaniyah','Mubarak Al-Kabeer','Al Jahra','As Salimiyah','Salmiya','Rumaithiya'],
  'Kyrgyzstan': ['Bishkek','Osh','Jalal-Abad','Karakol'],
  'Lebanon': ['Beirut','Tripoli','Sidon','Tyre','Jounieh','Baalbek'],
  'Libya': ['Tripoli','Benghazi','Misrata','Al Bayda','Sabha'],
  'Malaysia': ['Kuala Lumpur','Petaling Jaya','Johor Bahru','Ipoh','Shah Alam','Penang','Klang','Kota Kinabalu','Kuching','Subang Jaya','Malacca'],
  'Maldives': ['Malé','Addu City','Fuvahmulah'],
  'Malta': ['Valletta','Birkirkara','Qormi','Mosta','Żabbar'],
  'Mexico': ['Mexico City','Guadalajara','Monterrey','Puebla','Toluca','Tijuana','León','Ciudad Juárez','Mérida','Cancún','Querétaro','Acapulco'],
  'Morocco': ['Casablanca','Rabat','Fez','Marrakesh','Agadir','Tangier','Meknès','Oujda','Kenitra','Tetouan'],
  'Mozambique': ['Maputo','Matola','Nampula','Beira','Quelimane'],
  'Myanmar': ['Yangon','Mandalay','Naypyidaw','Mawlamyine','Bago'],
  'Nepal': ['Kathmandu','Pokhara','Lalitpur','Bharatpur','Biratnagar','Birgunj','Dharan'],
  'Netherlands': ['Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven','Tilburg','Groningen','Almere','Breda','Nijmegen','Leiden','Maastricht'],
  'New Zealand': ['Auckland','Wellington','Christchurch','Hamilton','Tauranga','Napier','Dunedin'],
  'Nigeria': ['Lagos','Abuja','Kano','Ibadan','Port Harcourt','Benin City','Maiduguri','Zaria','Aba','Kaduna','Enugu'],
  'Norway': ['Oslo','Bergen','Trondheim','Stavanger','Drammen','Fredrikstad','Kristiansand'],
  'Oman': ['Muscat','Seeb','Salalah','Sohar','Nizwa','Sur','Rustaq','Barka','Ibri','Khasab'],
  'Pakistan': ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan','Hyderabad','Peshawar','Quetta','Gujranwala','Sialkot','Sargodha','Bahawalpur','Sukkur','Larkana','Sheikhupura','Rahim Yar Khan','Jhang','Mardan','Gujrat','Kasur','Dera Ghazi Khan','Mingora','Nawabshah','Okara'],
  'Palestine': ['Gaza','Ramallah','Nablus','Hebron','Jenin','Jericho'],
  'Peru': ['Lima','Arequipa','Trujillo','Chiclayo','Iquitos','Piura','Cusco'],
  'Philippines': ['Manila','Quezon City','Davao','Cebu City','Zamboanga','Antipolo','Pasig','Cagayan de Oro','Taguig','Valenzuela','Makati','Dasmariñas'],
  'Poland': ['Warsaw','Kraków','Łódź','Wrocław','Poznań','Gdańsk','Szczecin','Bydgoszcz','Lublin','Katowice','Białystok'],
  'Portugal': ['Lisbon','Porto','Amadora','Braga','Setúbal','Coimbra','Funchal','Almada','Agualva-Cacém'],
  'Qatar': ['Doha','Al Rayyan','Umm Salal','Al Wakrah','Al Khor','Dukhan','Mesaieed','Al Shamal'],
  'Romania': ['Bucharest','Cluj-Napoca','Timișoara','Iași','Constanța','Craiova','Brașov','Galați'],
  'Russia': ['Moscow','Saint Petersburg','Novosibirsk','Yekaterinburg','Kazan','Nizhny Novgorod','Chelyabinsk','Omsk','Samara','Rostov-on-Don','Ufa','Krasnoyarsk'],
  'Rwanda': ['Kigali','Butare','Gisenyi','Ruhengeri'],
  'Saudi Arabia': ['Riyadh','Jeddah','Mecca','Medina','Dammam','Al Khobar','Dhahran','Tabuk','Buraidah','Khamis Mushait','Hail','Abha','Najran','Yanbu','Al Jubayl','Al Qatif','Ta\'if','Hofuf'],
  'Senegal': ['Dakar','Thiès','Saint-Louis','Kaolack','Ziguinchor'],
  'Serbia': ['Belgrade','Novi Sad','Niš','Kragujevac','Subotica','Zrenjanin'],
  'Singapore': ['Singapore','Jurong East','Woodlands','Tampines','Sengkang','Punggol','Bukit Batok'],
  'South Africa': ['Johannesburg','Cape Town','Durban','Pretoria','Port Elizabeth','Bloemfontein','East London','Nelspruit','Polokwane','Kimberley'],
  'South Korea': ['Seoul','Busan','Incheon','Daegu','Daejeon','Gwangju','Suwon','Ulsan','Changwon','Goyang','Yongin'],
  'Spain': ['Madrid','Barcelona','Valencia','Seville','Zaragoza','Málaga','Murcia','Palma','Bilbao','Alicante','Córdoba','Valladolid','Vigo','Gijón','Granada'],
  'Sri Lanka': ['Colombo','Dehiwala','Moratuwa','Kandy','Negombo','Jaffna','Galle','Trincomalee'],
  'Sudan': ['Khartoum','Omdurman','Port Sudan','Kassala','El Obeid','Wad Madani'],
  'Sweden': ['Stockholm','Gothenburg','Malmö','Uppsala','Västerås','Örebro','Linköping','Helsingborg','Norrköping','Jönköping'],
  'Switzerland': ['Zurich','Geneva','Basel','Bern','Lausanne','Winterthur','Lucerne','St. Gallen','Lugano','Biel/Bienne'],
  'Syria': ['Damascus','Aleppo','Homs','Latakia','Hama','Raqqa','Deir ez-Zor'],
  'Taiwan': ['Taipei','Kaohsiung','Taichung','Tainan','Taoyuan','Hsinchu'],
  'Tajikistan': ['Dushanbe','Khujand','Kulob','Qurghonteppa'],
  'Tanzania': ['Dar es Salaam','Mwanza','Arusha','Dodoma','Mbeya','Tanga','Zanzibar City'],
  'Thailand': ['Bangkok','Chiang Mai','Nonthaburi','Pak Kret','Hat Yai','Udon Thani','Chon Buri','Nakhon Ratchasima','Phuket'],
  'Tunisia': ['Tunis','Sfax','Sousse','Kairouan','Bizerte','Gabès','Ariana'],
  'Turkey': ['Istanbul','Ankara','Izmir','Bursa','Adana','Gaziantep','Konya','Antalya','Mersin','Kayseri','Trabzon','Diyarbakır','Eskişehir','Samsun','Denizli'],
  'Turkmenistan': ['Ashgabat','Türkmenabat','Daşoguz','Mary','Balkanabat'],
  'Uganda': ['Kampala','Gulu','Lira','Mbarara','Jinja','Entebbe'],
  'Ukraine': ['Kyiv','Kharkiv','Odessa','Dnipro','Donetsk','Zaporizhzhia','Lviv','Kryvyi Rih','Mykolaiv','Mariupol'],
  'United Arab Emirates': ['Dubai','Abu Dhabi','Sharjah','Al Ain','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain','Khor Fakkan','Kalba','Dhaid','Madinat Zayed'],
  'United Kingdom': ['London','Birmingham','Manchester','Leeds','Sheffield','Liverpool','Bristol','Leicester','Edinburgh','Glasgow','Bradford','Cardiff','Coventry','Nottingham','Belfast','Newcastle','Southampton','Derby','Portsmouth','Plymouth','Brighton','Reading','Milton Keynes','Aberdeen'],
  'United States': ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville','Fort Worth','Columbus','Charlotte','Indianapolis','San Francisco','Seattle','Denver','Washington DC','Nashville','Oklahoma City','El Paso','Boston','Las Vegas','Memphis','Portland','Louisville','Baltimore','Milwaukee','Albuquerque','Atlanta','Miami','Minneapolis','Tampa'],
  'Uzbekistan': ['Tashkent','Samarkand','Namangan','Andijan','Nukus','Fergana','Bukhara'],
  'Venezuela': ['Caracas','Maracaibo','Valencia','Barquisimeto','Maracay','Ciudad Guayana'],
  'Vietnam': ['Ho Chi Minh City','Hanoi','Da Nang','Haiphong','Can Tho','Bien Hoa','Nha Trang','Hue'],
  'Yemen': ['Sana\'a','Aden','Taiz','Hodeidah','Ibb','Dhamar','Mukalla'],
  'Zambia': ['Lusaka','Kitwe','Ndola','Kabwe','Chingola','Livingstone'],
  'Zimbabwe': ['Harare','Bulawayo','Chitungwiza','Mutare','Gweru','Kwekwe'],
};
const EXPERIENCE_OPTIONS = ['Fresher', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];
const PHONE_CODE_OPTIONS = [
  // South Asia (top priority)
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+977', label: 'Nepal (+977)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+93', label: 'Afghanistan (+93)' },
  { code: '+975', label: 'Bhutan (+975)' },
  { code: '+960', label: 'Maldives (+960)' },
  // Gulf / Middle East
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+968', label: 'Oman (+968)' },
  { code: '+965', label: 'Kuwait (+965)' },
  { code: '+973', label: 'Bahrain (+973)' },
  { code: '+962', label: 'Jordan (+962)' },
  { code: '+961', label: 'Lebanon (+961)' },
  { code: '+964', label: 'Iraq (+964)' },
  { code: '+972', label: 'Israel (+972)' },
  { code: '+967', label: 'Yemen (+967)' },
  { code: '+963', label: 'Syria (+963)' },
  { code: '+970', label: 'Palestine (+970)' },
  // Europe
  { code: '+44', label: 'UK (+44)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+32', label: 'Belgium (+32)' },
  { code: '+43', label: 'Austria (+43)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+46', label: 'Sweden (+46)' },
  { code: '+47', label: 'Norway (+47)' },
  { code: '+45', label: 'Denmark (+45)' },
  { code: '+358', label: 'Finland (+358)' },
  { code: '+48', label: 'Poland (+48)' },
  { code: '+351', label: 'Portugal (+351)' },
  { code: '+30', label: 'Greece (+30)' },
  { code: '+40', label: 'Romania (+40)' },
  { code: '+420', label: 'Czech Republic (+420)' },
  { code: '+36', label: 'Hungary (+36)' },
  { code: '+421', label: 'Slovakia (+421)' },
  { code: '+380', label: 'Ukraine (+380)' },
  { code: '+7', label: 'Russia (+7)' },
  { code: '+90', label: 'Turkey (+90)' },
  { code: '+385', label: 'Croatia (+385)' },
  { code: '+381', label: 'Serbia (+381)' },
  { code: '+386', label: 'Slovenia (+386)' },
  { code: '+387', label: 'Bosnia & Herzegovina (+387)' },
  { code: '+389', label: 'North Macedonia (+389)' },
  { code: '+382', label: 'Montenegro (+382)' },
  { code: '+355', label: 'Albania (+355)' },
  { code: '+359', label: 'Bulgaria (+359)' },
  { code: '+370', label: 'Lithuania (+370)' },
  { code: '+371', label: 'Latvia (+371)' },
  { code: '+372', label: 'Estonia (+372)' },
  { code: '+353', label: 'Ireland (+353)' },
  { code: '+352', label: 'Luxembourg (+352)' },
  { code: '+356', label: 'Malta (+356)' },
  { code: '+357', label: 'Cyprus (+357)' },
  { code: '+354', label: 'Iceland (+354)' },
  { code: '+376', label: 'Andorra (+376)' },
  { code: '+377', label: 'Monaco (+377)' },
  { code: '+423', label: 'Liechtenstein (+423)' },
  { code: '+378', label: 'San Marino (+378)' },
  { code: '+379', label: 'Vatican City (+379)' },
  { code: '+373', label: 'Moldova (+373)' },
  { code: '+375', label: 'Belarus (+375)' },
  { code: '+374', label: 'Armenia (+374)' },
  { code: '+994', label: 'Azerbaijan (+994)' },
  { code: '+995', label: 'Georgia (+995)' },
  { code: '+383', label: 'Kosovo (+383)' },
  // North America
  { code: '+1', label: 'USA / Canada (+1)' },
  { code: '+52', label: 'Mexico (+52)' },
  // Central America & Caribbean
  { code: '+502', label: 'Guatemala (+502)' },
  { code: '+503', label: 'El Salvador (+503)' },
  { code: '+504', label: 'Honduras (+504)' },
  { code: '+505', label: 'Nicaragua (+505)' },
  { code: '+506', label: 'Costa Rica (+506)' },
  { code: '+507', label: 'Panama (+507)' },
  { code: '+509', label: 'Haiti (+509)' },
  { code: '+1-809', label: 'Dominican Republic (+1-809)' },
  { code: '+1-876', label: 'Jamaica (+1-876)' },
  { code: '+1-246', label: 'Barbados (+1-246)' },
  { code: '+1-868', label: 'Trinidad & Tobago (+1-868)' },
  { code: '+1-473', label: 'Grenada (+1-473)' },
  { code: '+1-758', label: 'Saint Lucia (+1-758)' },
  { code: '+1-784', label: 'St. Vincent (+1-784)' },
  { code: '+1-767', label: 'Dominica (+1-767)' },
  { code: '+1-869', label: 'Saint Kitts & Nevis (+1-869)' },
  { code: '+1-268', label: 'Antigua & Barbuda (+1-268)' },
  { code: '+53', label: 'Cuba (+53)' },
  // South America
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+51', label: 'Peru (+51)' },
  { code: '+58', label: 'Venezuela (+58)' },
  { code: '+593', label: 'Ecuador (+593)' },
  { code: '+591', label: 'Bolivia (+591)' },
  { code: '+595', label: 'Paraguay (+595)' },
  { code: '+598', label: 'Uruguay (+598)' },
  { code: '+592', label: 'Guyana (+592)' },
  { code: '+597', label: 'Suriname (+597)' },
  // East Asia
  { code: '+86', label: 'China (+86)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+886', label: 'Taiwan (+886)' },
  { code: '+850', label: 'North Korea (+850)' },
  { code: '+976', label: 'Mongolia (+976)' },
  // Southeast Asia
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+66', label: 'Thailand (+66)' },
  { code: '+84', label: 'Vietnam (+84)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+95', label: 'Myanmar (+95)' },
  { code: '+855', label: 'Cambodia (+855)' },
  { code: '+856', label: 'Laos (+856)' },
  { code: '+673', label: 'Brunei (+673)' },
  { code: '+670', label: 'Timor-Leste (+670)' },
  // Central Asia
  { code: '+7', label: 'Kazakhstan (+7)' },
  { code: '+998', label: 'Uzbekistan (+998)' },
  { code: '+993', label: 'Turkmenistan (+993)' },
  { code: '+992', label: 'Tajikistan (+992)' },
  { code: '+996', label: 'Kyrgyzstan (+996)' },
  // Africa — North
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+212', label: 'Morocco (+212)' },
  { code: '+216', label: 'Tunisia (+216)' },
  { code: '+213', label: 'Algeria (+213)' },
  { code: '+218', label: 'Libya (+218)' },
  { code: '+249', label: 'Sudan (+249)' },
  // Africa — East
  { code: '+251', label: 'Ethiopia (+251)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+255', label: 'Tanzania (+255)' },
  { code: '+256', label: 'Uganda (+256)' },
  { code: '+250', label: 'Rwanda (+250)' },
  { code: '+257', label: 'Burundi (+257)' },
  { code: '+252', label: 'Somalia (+252)' },
  { code: '+253', label: 'Djibouti (+253)' },
  { code: '+291', label: 'Eritrea (+291)' },
  { code: '+258', label: 'Mozambique (+258)' },
  { code: '+265', label: 'Malawi (+265)' },
  { code: '+260', label: 'Zambia (+260)' },
  { code: '+263', label: 'Zimbabwe (+263)' },
  { code: '+261', label: 'Madagascar (+261)' },
  { code: '+230', label: 'Mauritius (+230)' },
  { code: '+248', label: 'Seychelles (+248)' },
  { code: '+262', label: 'Comoros (+262)' },
  // Africa — West
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+233', label: 'Ghana (+233)' },
  { code: '+221', label: 'Senegal (+221)' },
  { code: '+225', label: 'Ivory Coast (+225)' },
  { code: '+223', label: 'Mali (+223)' },
  { code: '+226', label: 'Burkina Faso (+226)' },
  { code: '+227', label: 'Niger (+227)' },
  { code: '+224', label: 'Guinea (+224)' },
  { code: '+245', label: 'Guinea-Bissau (+245)' },
  { code: '+220', label: 'Gambia (+220)' },
  { code: '+232', label: 'Sierra Leone (+232)' },
  { code: '+231', label: 'Liberia (+231)' },
  { code: '+228', label: 'Togo (+228)' },
  { code: '+229', label: 'Benin (+229)' },
  { code: '+222', label: 'Mauritania (+222)' },
  { code: '+238', label: 'Cape Verde (+238)' },
  { code: '+239', label: 'Sao Tome & Principe (+239)' },
  // Africa — Central
  { code: '+237', label: 'Cameroon (+237)' },
  { code: '+236', label: 'Central African Republic (+236)' },
  { code: '+235', label: 'Chad (+235)' },
  { code: '+241', label: 'Gabon (+241)' },
  { code: '+242', label: 'Congo (Brazzaville) (+242)' },
  { code: '+243', label: 'Congo (Kinshasa) (+243)' },
  { code: '+240', label: 'Equatorial Guinea (+240)' },
  // Africa — South
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+264', label: 'Namibia (+264)' },
  { code: '+267', label: 'Botswana (+267)' },
  { code: '+266', label: 'Lesotho (+266)' },
  { code: '+268', label: 'Eswatini (+268)' },
  { code: '+244', label: 'Angola (+244)' },
  { code: '+211', label: 'South Sudan (+211)' },
  // Oceania
  { code: '+61', label: 'Australia (+61)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+675', label: 'Papua New Guinea (+675)' },
  { code: '+679', label: 'Fiji (+679)' },
  { code: '+677', label: 'Solomon Islands (+677)' },
  { code: '+678', label: 'Vanuatu (+678)' },
  { code: '+676', label: 'Tonga (+676)' },
  { code: '+685', label: 'Samoa (+685)' },
  { code: '+686', label: 'Kiribati (+686)' },
  { code: '+674', label: 'Nauru (+674)' },
  { code: '+680', label: 'Palau (+680)' },
  { code: '+692', label: 'Marshall Islands (+692)' },
  { code: '+691', label: 'Micronesia (+691)' },
  { code: '+688', label: 'Tuvalu (+688)' },
];

function resolveAudienceFromPath(): IntakeAudience | null {
  if (typeof window === 'undefined') {
    return 'candidate';
  }

  const normalized = window.location.pathname.replace(/\/+$/, '') || '/apply';
  if (normalized === '/apply/candidate') return 'candidate';
  if (normalized === '/apply/employer') return 'employer';
  if (normalized === '/apply/partner') return 'partner';
  return null;
}

function audiencePath(audience: IntakeAudience) {
  return `/apply/${audience}`;
}

export function PublicApplicationForm() {
  const { signIn } = useAuth();
  const directAudience = resolveAudienceFromPath();
  const [selectedAudience, setSelectedAudience] = useState<IntakeAudience>(directAudience || 'candidate');
  const [candidateForm, setCandidateForm] = useState(candidateDefaults);
  const [candidatePhoneCode, setCandidatePhoneCode] = useState('+92');
  const [candidatePhoneNumber, setCandidatePhoneNumber] = useState('');
  const [candidateCv, setCandidateCv] = useState<File | null>(null);
  const [employerForm, setEmployerForm] = useState(employerDefaults);
  const [employerPhoneCode, setEmployerPhoneCode] = useState('+92');
  const [employerPhoneNumber, setEmployerPhoneNumber] = useState('');
  const [partnerForm, setPartnerForm] = useState(partnerDefaults);
  const [partnerPhoneCode, setPartnerPhoneCode] = useState('+92');
  const [partnerPhoneNumber, setPartnerPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAudience, setSubmittedAudience] = useState<IntakeAudience | null>(null);
  const [candidateResult, setCandidateResult] = useState<PublicCandidatePortalResponse | null>(null);
  const [employerResult, setEmployerResult] = useState<PublicEmployerPortalResponse | null>(null);
  const [partnerResult, setPartnerResult] = useState<PublicPartnerPortalResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const activeAudience = directAudience || selectedAudience;

  function copyField(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  }

  const handleCandidateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = new FormData();
      const phone = `${candidatePhoneCode} ${candidatePhoneNumber}`.trim();
      const submission: CandidateFormState = {
        ...candidateForm,
        phone,
      };

      Object.entries(submission).forEach(([key, value]) => payload.append(key, value));
      if (candidateCv) {
        payload.append('cv', candidateCv);
      }

      const result = await apiClient.submitCandidatePortal(payload);
      setCandidateResult(result);
      setCandidateForm(candidateDefaults);
      setCandidatePhoneCode('+92');
      setCandidatePhoneNumber('');
      setCandidateCv(null);
      setSubmittedAudience('candidate');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit candidate intake.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.submitEmployerPortal({
        ...employerForm,
        city: employerForm.city === '__other__' ? '' : employerForm.city,
        phone: `${employerPhoneCode} ${employerPhoneNumber}`.trim(),
      });
      setEmployerResult(result);
      setEmployerForm(employerDefaults);
      setEmployerPhoneCode('+92');
      setEmployerPhoneNumber('');
      setSubmittedAudience('employer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit employer intake.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartnerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.submitPartnerPortal({
        ...partnerForm,
        district: partnerForm.district === '__other__' ? '' : partnerForm.district,
        phone: `${partnerPhoneCode} ${partnerPhoneNumber}`.trim(),
      });
      setPartnerResult(result);
      setPartnerForm(partnerDefaults);
      setPartnerPhoneCode('+92');
      setPartnerPhoneNumber('');

      if (result.autoLoginUrl) {
        window.location.assign(result.autoLoginUrl);
        return;
      }

      if (result.password) {
        try {
          await signIn(result.email, result.password);
          window.location.assign(result.dashboardUrl || '/partner/dashboard');
          return;
        } catch {
          setError('Your account was created, but automatic sign-in failed. Use the credentials below or the link sent to your WhatsApp/email.');
        }
      }

      setSubmittedAudience('partner');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit partner intake.');
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────── SUCCESS SCREENS ────────────────────

  if (submittedAudience === 'candidate') {
    return (
      <div className="falisha-auth-shell falisha-auth-form-pane" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
        <div className="falisha-auth-form-inner" style={{ textAlign: 'center' }}>
          <div className="mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
          </div>

          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShieldCheck style={{ width: '36px', height: '36px', color: '#10b981' }} />
          </div>

          <h1 className="falisha-auth-heading" style={{ marginBottom: '0.5rem' }}>Application Received!</h1>
          <p className="falisha-auth-subheading" style={{ marginBottom: '1.25rem' }}>
            Your profile has been saved. We will review and match you with the right opportunity abroad.
          </p>

          {candidateResult?.whatsappNotified ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Profile link sent to your WhatsApp
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>
              Our team will contact you within 48 hours
            </div>
          )}

          {candidateResult?.onboardingLink && (
            <div style={{ marginTop: '1.75rem' }}>
              <a
                href={candidateResult.onboardingLink}
                target="_blank"
                rel="noreferrer"
                className="falisha-auth-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'auto', padding: '0 1.5rem', textDecoration: 'none', marginBottom: '0.9rem' }}
              >
                View &amp; Complete Your Profile
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: '#6b7280' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{candidateResult.onboardingLink}</span>
                <button type="button" onClick={() => copyField(candidateResult!.onboardingLink!, 'profile')} style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {copied === 'profile' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <p style={{ marginTop: '2.5rem', fontSize: '0.82rem', color: '#9ca3af' }}>© 2024 Falisha Jobs</p>
        </div>
      </div>
    );
  }

  if (submittedAudience === 'employer') {
    return (
      <div className="falisha-auth-shell falisha-auth-form-pane" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '28rem', textAlign: 'center' }}>
          <div className="mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
          </div>

          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', border: '2px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShieldCheck style={{ width: '36px', height: '36px', color: '#06b6d4' }} />
          </div>

          <h1 className="falisha-auth-heading" style={{ marginBottom: '0.5rem' }}>Portal Access Ready!</h1>
          <p className="falisha-auth-subheading" style={{ marginBottom: '1.25rem' }}>
            Your employer portal has been created. Log in to track your hiring requirement.
          </p>

          {employerResult?.whatsappNotified ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Credentials sent to your WhatsApp
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.82rem', color: '#c2410c', fontWeight: 500 }}>
              Save your credentials below
            </div>
          )}

          <div style={{ marginTop: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '1rem', overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Your Login Credentials</div>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Login Email</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', color: '#111827', wordBreak: 'break-all' }}>{employerResult?.email}</span>
                <button type="button" onClick={() => copyField(employerResult?.email || '', 'emp-email')} style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
                  {copied === 'emp-email' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
            {employerResult?.password ? (
              <div style={{ padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Temporary Password</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', color: '#111827', letterSpacing: '0.05em' }}>{employerResult.password}</span>
                  <button type="button" onClick={() => copyField(employerResult!.password || '', 'emp-password')} style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
                    {copied === 'emp-password' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>Use your existing password to log in.</div>
            )}
          </div>

          <a
            href={employerResult?.dashboardUrl || '/employer/dashboard'}
            target="_blank"
            rel="noreferrer"
            className="falisha-auth-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem', textDecoration: 'none' }}
          >
            Go to Employer Dashboard
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </a>

          <p style={{ marginTop: '1.75rem', fontSize: '0.82rem', color: '#9ca3af' }}>© 2024 Falisha Jobs</p>
        </div>
      </div>
    );
  }

  if (submittedAudience === 'partner') {
    return (
      <div className="falisha-auth-shell falisha-auth-form-pane" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '28rem', textAlign: 'center' }}>
          <div className="mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
          </div>

          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', border: '2px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShieldCheck style={{ width: '36px', height: '36px', color: '#06b6d4' }} />
          </div>

          <h1 className="falisha-auth-heading" style={{ marginBottom: '0.5rem' }}>Welcome to the Network!</h1>
          <p className="falisha-auth-subheading" style={{ marginBottom: '1.25rem' }}>
            Your partner portal is ready. Log in to start referring candidates and earning commissions.
          </p>

          {partnerResult?.whatsappNotified && partnerResult?.emailNotified ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Credentials sent to your WhatsApp and email
            </div>
          ) : partnerResult?.whatsappNotified ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Credentials sent to your WhatsApp
            </div>
          ) : partnerResult?.emailNotified ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Credentials sent to your email
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '0.55rem 1rem', fontSize: '0.82rem', color: '#c2410c', fontWeight: 500 }}>
              Save your credentials below
            </div>
          )}

          <div style={{ marginTop: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '1rem', overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Your Login Credentials</div>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Login Email</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', color: '#111827', wordBreak: 'break-all' }}>{partnerResult?.email}</span>
                <button type="button" onClick={() => copyField(partnerResult?.email || '', 'par-email')} style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
                  {copied === 'par-email' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
            {partnerResult?.password ? (
              <div style={{ padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Temporary Password</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', color: '#111827', letterSpacing: '0.05em' }}>{partnerResult.password}</span>
                  <button type="button" onClick={() => copyField(partnerResult!.password || '', 'par-password')} style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
                    {copied === 'par-password' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>Use your existing password to log in.</div>
            )}
          </div>

          <a
            href={partnerResult?.dashboardUrl || '/partner/dashboard'}
            target="_blank"
            rel="noreferrer"
            className="falisha-auth-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem', textDecoration: 'none' }}
          >
            Go to Partner Dashboard
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </a>

          <p style={{ marginTop: '1.75rem', fontSize: '0.82rem', color: '#9ca3af' }}>© 2024 Falisha Jobs</p>
        </div>
      </div>
    );
  }

  // ──────────────────── FORMS ────────────────────

  if (activeAudience === 'candidate') {
    return <ApplicationWizard />;
  }

  // ── EMPLOYER ──
  if (activeAudience === 'employer') {
    return (
      <div className="falisha-auth-shell falisha-auth-form-pane falisha-auth-form-pane-signup" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '36rem' }}>

          <div className="mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Pakistan's #1 Overseas Recruitment Company</p>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
              Pakistan's #1 Overseas Recruitment
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
              <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Fast · Verified · Compliant
            </span>
          </div>

          <div className="falisha-auth-heading-block">
            <h1 className="falisha-auth-heading">Post a Requirement</h1>
            <p className="falisha-auth-subheading">Tell us what you need — we'll source, screen and deliver.</p>
          </div>

          {submittedAudience === 'employer' && (
            <div className="falisha-auth-notice falisha-auth-notice-success mb-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>Requirement submitted! Our team will be in touch within 24 hours.</span>
            </div>
          )}

          <form className="falisha-auth-form-fields" onSubmit={handleEmployerSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Company Name" value={employerForm.companyName} onChange={(v) => setEmployerForm((c) => ({ ...c, companyName: v }))} required icon={Building2} />
              <InputField label="Employer Name" value={employerForm.contactName} onChange={(v) => setEmployerForm((c) => ({ ...c, contactName: v }))} required icon={User2} />
              <div className="sm:col-span-2">
                <InputField label="Email" type="email" value={employerForm.email} onChange={(v) => setEmployerForm((c) => ({ ...c, email: v }))} required icon={Mail} />
              </div>
              <div className="sm:col-span-2 falisha-auth-field">
                <label className="falisha-auth-field-label">Phone / WhatsApp <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="falisha-auth-input-wrap w-44 shrink-0">
                    <select value={employerPhoneCode} onChange={(e) => setEmployerPhoneCode(e.target.value)} className="falisha-auth-input falisha-auth-select" style={{ paddingLeft: '0.75rem' }}>
                      {PHONE_CODE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="falisha-auth-input-wrap flex-1">
                    <Phone className="falisha-auth-input-icon" />
                    <input type="tel" value={employerPhoneNumber} onChange={(e) => setEmployerPhoneNumber(e.target.value)} className="falisha-auth-input" placeholder="300 1234567" required />
                  </div>
                </div>
              </div>
              <div className="falisha-auth-field">
                <label className="falisha-auth-field-label">Country</label>
                <div className="falisha-auth-input-wrap">
                  <Globe2 className="falisha-auth-input-icon" />
                  <input
                    type="text"
                    list="employer-countries-list"
                    value={employerForm.country}
                    onChange={(e) => setEmployerForm((c) => ({ ...c, country: e.target.value, city: '' }))}
                    className="falisha-auth-input"
                    placeholder="Type to search country…"
                    autoComplete="off"
                  />
                  <datalist id="employer-countries-list">
                    {WORLD_COUNTRIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="falisha-auth-field">
                <label className="falisha-auth-field-label">City</label>
                <div className="falisha-auth-input-wrap">
                  <MapPin className="falisha-auth-input-icon" />
                  {CITIES_BY_COUNTRY[employerForm.country] && employerForm.city !== '__other__' ? (
                    <select
                      value={employerForm.city}
                      onChange={(e) => setEmployerForm((c) => ({ ...c, city: e.target.value }))}
                      className="falisha-auth-input falisha-auth-select"
                    >
                      <option value="">Select city…</option>
                      {CITIES_BY_COUNTRY[employerForm.country].map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                      <option value="__other__">Other (type your city)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={employerForm.city === '__other__' ? '' : employerForm.city}
                      onChange={(e) => setEmployerForm((c) => ({ ...c, city: e.target.value }))}
                      className="falisha-auth-input"
                      placeholder="Enter your city"
                      autoFocus={employerForm.city === '__other__'}
                    />
                  )}
                </div>
                {CITIES_BY_COUNTRY[employerForm.country] && employerForm.city === '__other__' && (
                  <button type="button" onClick={() => setEmployerForm((c) => ({ ...c, city: '' }))}
                    className="mt-1 text-xs text-blue-600 hover:underline">
                    ← Back to city list
                  </button>
                )}
              </div>
              <InputField label="Professions Required" value={employerForm.professions} onChange={(v) => setEmployerForm((c) => ({ ...c, professions: v }))} icon={Briefcase} />
              <InputField label="Quantity Needed" value={employerForm.quantity} onChange={(v) => setEmployerForm((c) => ({ ...c, quantity: v }))} icon={Users} />
              <InputField label="Salary Range" value={employerForm.salaryRange} onChange={(v) => setEmployerForm((c) => ({ ...c, salaryRange: v }))} icon={Briefcase} />
              <InputField label="Duty Hours" value={employerForm.dutyHours} onChange={(v) => setEmployerForm((c) => ({ ...c, dutyHours: v }))} icon={Users} />
              <InputField label="Contract Duration" value={employerForm.contractDuration} onChange={(v) => setEmployerForm((c) => ({ ...c, contractDuration: v }))} icon={Briefcase} />
              <InputField label="Benefits Included" value={employerForm.benefitsIncluded} onChange={(v) => setEmployerForm((c) => ({ ...c, benefitsIncluded: v }))} icon={Users} />
            </div>
            <TextAreaField label="Comments" value={employerForm.comments} onChange={(v) => setEmployerForm((c) => ({ ...c, comments: v }))} placeholder="Add any extra hiring details" />
            <button type="submit" disabled={submitting} className="falisha-auth-primary flex items-center justify-center gap-2">
              {submitting ? 'Submitting…' : 'Submit Requirement'}
              <ArrowRight className="h-4 w-4" />
            </button>
            {error && <div className="falisha-auth-notice falisha-auth-notice-error"><span>{error}</span></div>}
          </form>

          <p className="mt-6 text-center" style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
            © 2024 Falisha Jobs ·{' '}
            <a className="falisha-auth-link" href="/privacy-policy">Privacy</a> ·{' '}
            <a className="falisha-auth-link" href="#">Terms</a>
          </p>
        </div>
      </div>
    );
  }

  // ── PARTNER ──
  return (
    <div className="falisha-auth-shell falisha-auth-form-pane falisha-auth-form-pane-signup" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '36rem' }}>

        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Pakistan's #1 Overseas Recruitment Company</p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
            <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
            Pakistan's #1 Overseas Recruitment
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
            <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Earn · Grow · Scale
          </span>
        </div>

        <div className="falisha-auth-heading-block">
          <h1 className="falisha-auth-heading">Become a Partner</h1>
          <p className="falisha-auth-subheading">Join our network of agents and grow your recruitment business with us.</p>
        </div>

        {submittedAudience === 'partner' && (
          <div className="falisha-auth-notice falisha-auth-notice-success mb-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>Registration submitted! We'll contact you shortly to get started.</span>
          </div>
        )}

        <form className="falisha-auth-form-fields" onSubmit={handlePartnerSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField label="Name" value={partnerForm.applicantName} onChange={(v) => setPartnerForm((c) => ({ ...c, applicantName: v }))} required icon={User2} />
            <InputField label="Company / Agency Name" value={partnerForm.companyName} onChange={(v) => setPartnerForm((c) => ({ ...c, companyName: v }))} icon={Building2} />
            <div className="sm:col-span-2">
              <InputField label="Email" type="email" value={partnerForm.email} onChange={(v) => setPartnerForm((c) => ({ ...c, email: v }))} required icon={Mail} />
            </div>
            <div className="sm:col-span-2 falisha-auth-field">
              <label className="falisha-auth-field-label">Phone / WhatsApp <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <div className="falisha-auth-input-wrap w-44 shrink-0">
                  <select value={partnerPhoneCode} onChange={(e) => setPartnerPhoneCode(e.target.value)} className="falisha-auth-input falisha-auth-select" style={{ paddingLeft: '0.75rem' }}>
                    {PHONE_CODE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                  </select>
                </div>
                <div className="falisha-auth-input-wrap flex-1">
                  <Phone className="falisha-auth-input-icon" />
                  <input type="tel" value={partnerPhoneNumber} onChange={(e) => setPartnerPhoneNumber(e.target.value)} className="falisha-auth-input" placeholder="300 1234567" required />
                </div>
              </div>
            </div>
            <div className="sm:col-span-2 falisha-auth-field">
              <label className="falisha-auth-field-label">Country</label>
              <div className="falisha-auth-input-wrap">
                <Globe2 className="falisha-auth-input-icon" />
                <input
                  type="text"
                  list="partner-countries-list"
                  value={partnerForm.cityCountry}
                  onChange={(e) => setPartnerForm((c) => ({ ...c, cityCountry: e.target.value, district: '' }))}
                  className="falisha-auth-input"
                  placeholder="Type to search country…"
                  autoComplete="off"
                />
                <datalist id="partner-countries-list">
                  {WORLD_COUNTRIES.map((cn) => <option key={cn} value={cn} />)}
                </datalist>
              </div>
            </div>
            <div className="sm:col-span-2 falisha-auth-field">
              <label className="falisha-auth-field-label">City</label>
              <div className="falisha-auth-input-wrap">
                <MapPin className="falisha-auth-input-icon" />
                {CITIES_BY_COUNTRY[partnerForm.cityCountry] && partnerForm.district !== '__other__' ? (
                  <select
                    value={partnerForm.district}
                    onChange={(e) => setPartnerForm((c) => ({ ...c, district: e.target.value }))}
                    className="falisha-auth-input falisha-auth-select"
                  >
                    <option value="">Select city…</option>
                    {CITIES_BY_COUNTRY[partnerForm.cityCountry].map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="__other__">Other (type your city)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={partnerForm.district === '__other__' ? '' : partnerForm.district}
                    onChange={(e) => setPartnerForm((c) => ({ ...c, district: e.target.value }))}
                    className="falisha-auth-input"
                    placeholder="Enter your city"
                    autoFocus={partnerForm.district === '__other__'}
                  />
                )}
              </div>
              {CITIES_BY_COUNTRY[partnerForm.cityCountry] && partnerForm.district === '__other__' && (
                <button type="button" onClick={() => setPartnerForm((c) => ({ ...c, district: '' }))}
                  className="mt-1 text-xs text-blue-600 hover:underline">
                  ← Back to city list
                </button>
              )}
            </div>
            <InputField label="CNIC" value={partnerForm.cnic} onChange={(v) => setPartnerForm((c) => ({ ...c, cnic: v }))} icon={User2} />
          </div>
          <button type="submit" disabled={submitting} className="falisha-auth-primary flex items-center justify-center gap-2">
            {submitting ? 'Submitting…' : 'Submit Registration'}
            <ArrowRight className="h-4 w-4" />
          </button>
          {error && <div className="falisha-auth-notice falisha-auth-notice-error"><span>{error}</span></div>}
        </form>

        <p className="mt-6 text-center" style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
          © 2024 Falisha Jobs ·{' '}
          <a className="falisha-auth-link" href="/privacy-policy">Privacy</a> ·{' '}
          <a className="falisha-auth-link" href="#">Terms</a>
        </p>
      </div>
    </div>
  );
}

function TrustBadge({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(0,52,97,0.08)]">
      {icon}
      <div>
        <p className="text-xs font-bold uppercase text-[#003461]">{title}</p>
        <p className="text-[10px] text-[#424750]">{subtitle}</p>
      </div>
    </div>
  );
}

// PremiumInput kept for backward compat but unused now
function PremiumInput({ label, value, onChange, placeholder, type = 'text', required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="falisha-auth-input" style={{ paddingLeft: '1rem' }} />
    </div>
  );
}

// PremiumSelect kept for backward compat but unused now
function PremiumSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="falisha-auth-input falisha-auth-select" style={{ paddingLeft: '1rem' }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// CandidatePhoneField rendered inline in main form now; keeping stub to avoid errors
function CandidatePhoneField({ code, number, onCodeChange, onNumberChange }: { code: string; number: string; onCodeChange: (value: string) => void; onNumberChange: (value: string) => void }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">Phone / WhatsApp</label>
      <div className="flex gap-2">
        <select value={code} onChange={(e) => onCodeChange(e.target.value)} className="falisha-auth-input falisha-auth-select" style={{ width: '11rem', flexShrink: 0, paddingLeft: '0.75rem' }}>
          {PHONE_CODE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
        </select>
        <div className="falisha-auth-input-wrap flex-1">
          <Phone className="falisha-auth-input-icon" />
          <input type="tel" value={number} onChange={(e) => onNumberChange(e.target.value)} required placeholder="300 1234567" className="falisha-auth-input" />
        </div>
      </div>
    </div>
  );
}

function CandidateUploadField({ fileName, onFileChange }: { fileName: string | null; onFileChange: (file: File | null) => void }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">Upload CV</label>
      <label
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '7rem',
          width: '100%',
          cursor: 'pointer',
          borderRadius: '0.85rem',
          border: '2px dashed #d1d5db',
          background: '#f9fafb',
          transition: 'border-color 160ms ease, background 160ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#06b6d4'; (e.currentTarget as HTMLElement).style.background = '#f0fdfe'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
      >
        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => onFileChange(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '2.2rem', width: '2.2rem', borderRadius: '0.6rem', background: 'rgba(6,182,212,0.1)' }}>
          <Upload style={{ height: '1rem', width: '1rem', color: '#06b6d4' }} />
        </div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{fileName || 'Drop file here or click to browse'}</p>
        <p style={{ marginTop: '0.15rem', fontSize: '0.78rem', color: '#9ca3af' }}>PDF, DOC, DOCX · Max 30MB</p>
      </label>
    </div>
  );
}

function InputField({ label, value, onChange, required, type = 'text', icon: Icon, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; icon: typeof Briefcase; placeholder?: string }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}{required ? <span className="text-red-500"> *</span> : ''}</label>
      <div className="falisha-auth-input-wrap">
        <Icon className="falisha-auth-input-icon" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder ?? label} className="falisha-auth-input" />
      </div>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.85rem', background: '#fff', padding: '0.75rem 1rem', fontSize: '1rem', color: '#111827', resize: 'vertical', outline: 'none', transition: 'border-color 160ms ease, box-shadow 160ms ease' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(34,211,238,0.15)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function ChoiceChips({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              style={{
                borderRadius: '999px',
                border: active ? '2px solid #06b6d4' : '2px solid #e5e7eb',
                background: active ? '#06b6d4' : '#ffffff',
                color: active ? '#ffffff' : '#4b5563',
                padding: '0.35rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 160ms ease',
                boxShadow: active ? '0 8px 20px rgba(6,182,212,0.28)' : 'none',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] px-10 py-4 font-semibold tracking-wide text-white shadow-[0_12px_32px_rgba(0,52,97,0.08)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
    >
      {submitting ? 'Submitting...' : label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function SubmitRow({ submitting, error, buttonLabel }: { submitting: boolean; error: string | null; buttonLabel: string }) {
  return (
    <div className="space-y-3 pt-2">
      {error && <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? 'Submitting...' : buttonLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
