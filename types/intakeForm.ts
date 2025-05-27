export interface IntakeForm {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Step 2 - Additional User Information
  firstName: string;
  lastName: string;
  nickname?: string;
  phone: string;
  dateOfBirth: Date;
  race: 'Asian' | 'Black/African' | 'Hispanic' | 'Native American' | 'Mixed';
  gender: 'Male' | 'Female';
  isVeteran: boolean;

  // Step 3 - Intake Questions
  showerLaundryHealthImpact: boolean;
  daysWithoutShower: '1-5 days' | '6-10 days' | '11-15 days' | '16-20 days' | '20+ days';
  daysWithoutLaundry: '1-5 days' | '6-10 days' | '11-15 days' | '16-20 days' | '20+ days';
  hospitalVisitsPastYear: '1 time' | '2 Times' | '3 times' | '4 times' | '5+ Times';
  caseManagersPastTwoYears: '1' | '2' | '3' | '4' | '5+';
  
  // Multi-select checkboxes
  showerAccessIssues: {
    skinIrritation: boolean;
    infection: boolean;
    increasedAnxietyDepression: boolean;
    bodyPain: boolean;
  };

  // Single checkboxes
  criminalJusticeInvolvement: boolean;
  employedLastSixMonths: boolean;
  homelessShelter: boolean;
  unsheltered: boolean;
  temporaryHousing: boolean;
  housed: boolean;

  // Dropdown
  lengthOfHomelessness: '1-3 Months' | '4-6 months' | '6-8 Months';

  // New fields
  evictionContributingFactor: boolean;
  employmentBarriers: {
    transportation: boolean;
    housing: boolean;
    background: boolean;
    criminalHistory: boolean;
  };
} 