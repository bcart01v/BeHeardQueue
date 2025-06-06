import { useState } from 'react';
import { User } from '@/types/user';
import { IntakeForm as IntakeFormType } from '@/types/intakeForm';
import { useTheme } from '../context/ThemeContext';
import { getThemeColor, getUIColor } from '../colors';

interface IntakeFormProps {
  onSubmit: (userData: Partial<User>, intakeData: Partial<IntakeFormType>) => Promise<void>;
  onCancel: () => void;
  initialUserData?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export default function IntakeForm({ onSubmit, onCancel, initialUserData }: IntakeFormProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  
  // Step 1 - Additional Info
  const [firstName, setFirstName] = useState(initialUserData?.firstName || '');
  const [lastName, setLastName] = useState(initialUserData?.lastName || '');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState(initialUserData?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [race, setRace] = useState<IntakeFormType['race']>('Asian');
  const [gender, setGender] = useState<IntakeFormType['gender']>('Male');
  const [isVeteran, setIsVeteran] = useState(false);
  
  // Step 2 - Intake Questions
  const [showerLaundryHealthImpact, setShowerLaundryHealthImpact] = useState(false);
  const [daysWithoutShower, setDaysWithoutShower] = useState<IntakeFormType['daysWithoutShower']>('1-5 days');
  const [daysWithoutLaundry, setDaysWithoutLaundry] = useState<IntakeFormType['daysWithoutLaundry']>('1-5 days');
  const [hospitalVisitsPastYear, setHospitalVisitsPastYear] = useState<IntakeFormType['hospitalVisitsPastYear']>('1 time');
  const [caseManagersPastTwoYears, setCaseManagersPastTwoYears] = useState<IntakeFormType['caseManagersPastTwoYears']>('1');
  const [showerAccessIssues, setShowerAccessIssues] = useState({
    skinIrritation: false,
    infection: false,
    increasedAnxietyDepression: false,
    bodyPain: false
  });
  const [criminalJusticeInvolvement, setCriminalJusticeInvolvement] = useState(false);
  const [employedLastSixMonths, setEmployedLastSixMonths] = useState(false);
  const [homelessShelter, setHomelessShelter] = useState(false);
  const [unsheltered, setUnsheltered] = useState(false);
  const [temporaryHousing, setTemporaryHousing] = useState(false);
  const [housed, setHoused] = useState(false);
  const [lengthOfHomelessness, setLengthOfHomelessness] = useState<IntakeFormType['lengthOfHomelessness']>('1-3 Months');
  const [evictionContributingFactor, setEvictionContributingFactor] = useState(false);
  const [employmentBarriers, setEmploymentBarriers] = useState({
    transportation: false,
    housing: false,
    background: false,
    criminalHistory: false
  });

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    if (phoneNumber.length <= 3) return phoneNumber;
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const employmentBarrierLabels: { [key: string]: string } = {
    transportation: 'Transportation',
    housing: 'Housing',
    background: 'Background',
    criminalHistory: 'Criminal History'
  };

  const handleSubmit = async () => {
    const userData: Partial<User> = {
      firstName,
      lastName,
      nickname,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      race,
      gender,
      isVeteran
    };

    const intakeData: Partial<IntakeFormType> = {
      showerLaundryHealthImpact,
      daysWithoutShower,
      daysWithoutLaundry,
      hospitalVisitsPastYear,
      caseManagersPastTwoYears,
      showerAccessIssues,
      criminalJusticeInvolvement,
      employedLastSixMonths,
      homelessShelter,
      unsheltered,
      temporaryHousing,
      housed,
      lengthOfHomelessness,
      evictionContributingFactor,
      employmentBarriers
    };

    await onSubmit(userData, intakeData);
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
              ${getUIColor('form', 'input', theme, 'background')} 
              ${getUIColor('form', 'input', theme, 'text')} 
              ${getUIColor('form', 'input', theme, 'border')}`}
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
              ${getUIColor('form', 'input', theme, 'background')} 
              ${getUIColor('form', 'input', theme, 'text')} 
              ${getUIColor('form', 'input', theme, 'border')}`}
            required
          />
        </div>
      </div>
      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Nickname (Optional)</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
        />
      </div>
      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="(555) 555-5555"
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Date of Birth</label>
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Race</label>
        <select
          value={race}
          onChange={(e) => setRace(e.target.value as IntakeFormType['race'])}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        >
          <option value="Caucasion">Caucasion</option>
          <option value="Asian">Asian</option>
          <option value="Black/African">Black/African</option>
          <option value="Hispanic">Hispanic</option>
          <option value="Native American">Native American</option>
          <option value="Mixed">Mixed</option>
        </select>
      </div>
      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Gender</label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as IntakeFormType['gender'])}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={isVeteran}
          onChange={(e) => setIsVeteran(e.target.checked)}
          className={`rounded border-2 
            ${getUIColor('form', 'input', theme, 'border')} 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')}`}
        />
        <label className={`ml-2 text-sm font-medium ${getThemeColor(theme, 'text')}`}>Are you a veteran?</label>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')} mb-2`}>
          Do you think that having access to a shower and clean laundry can improve mental, emotional, and physical health, as well as boost confidence to engage with available resources?
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={showerLaundryHealthImpact}
              onChange={() => setShowerLaundryHealthImpact(true)}
              className={`mr-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Yes</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={!showerLaundryHealthImpact}
              onChange={() => setShowerLaundryHealthImpact(false)}
              className={`mr-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>No</span>
          </label>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Days without Shower</label>
        <select
          value={daysWithoutShower}
          onChange={(e) => setDaysWithoutShower(e.target.value as IntakeFormType['daysWithoutShower'])}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        >
          <option value="1-5 days">1-5 days</option>
          <option value="6-10 days">6-10 days</option>
          <option value="11-15 days">11-15 days</option>
          <option value="16-20 days">16-20 days</option>
          <option value="20+ days">20+ days</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Days without Laundry</label>
        <select
          value={daysWithoutLaundry}
          onChange={(e) => setDaysWithoutLaundry(e.target.value as IntakeFormType['daysWithoutLaundry'])}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        >
          <option value="1-5 days">1-5 days</option>
          <option value="6-10 days">6-10 days</option>
          <option value="11-15 days">11-15 days</option>
          <option value="16-20 days">16-20 days</option>
          <option value="20+ days">20+ days</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Hospital Visits in the Past Year</label>
        <select
          value={hospitalVisitsPastYear}
          onChange={(e) => setHospitalVisitsPastYear(e.target.value as IntakeFormType['hospitalVisitsPastYear'])}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        >
          <option value="1 time">1 time</option>
          <option value="2 Times">2 Times</option>
          <option value="3 times">3 times</option>
          <option value="4 times">4 times</option>
          <option value="5+ Times">5+ Times</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>How many case managers have you had in the past 2 years?</label>
        <select
          value={caseManagersPastTwoYears}
          onChange={(e) => setCaseManagersPastTwoYears(e.target.value as IntakeFormType['caseManagersPastTwoYears'])}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5+">5+</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')} mb-2`}>
          During the time you did not have access to a shower did you experience any of the following?
        </label>
        <div className="space-y-2">
          {Object.entries(showerAccessIssues).map(([key, value]) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setShowerAccessIssues({
                  ...showerAccessIssues,
                  [key]: e.target.checked
                })}
                className={`mr-2 rounded border-2 
                  ${getUIColor('form', 'input', theme, 'border')} 
                  ${getUIColor('form', 'input', theme, 'background')} 
                  ${getUIColor('form', 'input', theme, 'text')}`}
              />
              <span className={getThemeColor(theme, 'text')}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')} mb-2`}>Please check all that apply:</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={criminalJusticeInvolvement}
              onChange={(e) => setCriminalJusticeInvolvement(e.target.checked)}
              className={`mr-2 rounded border-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Criminal Justice Involvement</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={employedLastSixMonths}
              onChange={(e) => setEmployedLastSixMonths(e.target.checked)}
              className={`mr-2 rounded border-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Employed in the last 6 Months</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={homelessShelter}
              onChange={(e) => setHomelessShelter(e.target.checked)}
              className={`mr-2 rounded border-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Homeless Shelter</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={unsheltered}
              onChange={(e) => setUnsheltered(e.target.checked)}
              className={`mr-2 rounded border-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Unsheltered</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={temporaryHousing}
              onChange={(e) => setTemporaryHousing(e.target.checked)}
              className={`mr-2 rounded border-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Temporary Housing</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={housed}
              onChange={(e) => setHoused(e.target.checked)}
              className={`mr-2 rounded border-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Housed</span>
          </label>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Length of Homelessness</label>
        <select
          value={lengthOfHomelessness}
          onChange={(e) => setLengthOfHomelessness(e.target.value as IntakeFormType['lengthOfHomelessness'])}
          className={`mt-1 block w-full rounded-md border-2 px-3 py-2 
            ${getUIColor('form', 'input', theme, 'background')} 
            ${getUIColor('form', 'input', theme, 'text')} 
            ${getUIColor('form', 'input', theme, 'border')}`}
          required
        >
          <option value="1-3 Months">1-3 Months</option>
          <option value="4-6 months">4-6 months</option>
          <option value="6-8 Months">6-8 Months</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')} mb-2`}>
          Was eviction a contributing factor to your current homelessness?
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={evictionContributingFactor}
              onChange={() => setEvictionContributingFactor(true)}
              className={`mr-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>Yes</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={!evictionContributingFactor}
              onChange={() => setEvictionContributingFactor(false)}
              className={`mr-2 
                ${getUIColor('form', 'input', theme, 'border')} 
                ${getUIColor('form', 'input', theme, 'background')} 
                ${getUIColor('form', 'input', theme, 'text')}`}
            />
            <span className={getThemeColor(theme, 'text')}>No</span>
          </label>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')} mb-2`}>
          Please check any barriers that may have prevented employment:
        </label>
        <div className="space-y-2">
          {Object.entries(employmentBarriers).map(([key, value]) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setEmploymentBarriers({
                  ...employmentBarriers,
                  [key]: e.target.checked
                })}
                className={`mr-2 rounded border-2 
                  ${getUIColor('form', 'input', theme, 'border')} 
                  ${getUIColor('form', 'input', theme, 'background')} 
                  ${getUIColor('form', 'input', theme, 'text')}`}
              />
              <span className={getThemeColor(theme, 'text')}>
                {employmentBarrierLabels[key] || key}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${getThemeColor(theme, 'cardBackground')} rounded-lg shadow-lg p-6 max-w-2xl mx-auto`}>
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${getThemeColor(theme, 'textHeader')} mb-2`}>
          {step === 1 ? 'Additional Information' : 'Intake Form'}
        </h2>
        <div className="flex items-center space-x-2">
          {[1, 2].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`w-3 h-3 rounded-full ${
                stepNumber === step
                  ? getThemeColor(theme, 'primary')
                  : getThemeColor(theme, 'secondary')
              }`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        if (step < 2) {
          setStep(step + 1);
        } else {
          handleSubmit();
        }
      }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}

        <div className="mt-6 flex justify-between">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className={`px-4 py-2 ${getUIColor('button', 'secondary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
            >
              Back
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 ${getUIColor('button', 'secondary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${getUIColor('button', 'primary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
            >
              {step === 2 ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 