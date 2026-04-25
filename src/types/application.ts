export type ExperienceLevel =
  | 'Fresher'
  | '1-3 Years'
  | '3-5 Years'
  | '5-10 Years'
  | '10+ Years';

export type ApplicationFormData = {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  nationality: string;
  countryOfInterest: string;
  preferredRole: string;
  experience: ExperienceLevel | '';
  comments: string;
  cvFileName?: string;
};

export type ApplicationStep = {
  id: number;
  label: string;
};