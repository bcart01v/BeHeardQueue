import { Company } from '@/types/company';
import CompanySignupLink from './CompanySignupLink';
import { useTheme } from '@/app/context/ThemeContext';
import { getThemeColor, getUIColor } from '@/app/colors';

interface SignUpLinksProps {
  companies: Company[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
}

export default function SignUpLinks({
  companies,
  currentCompany,
  setCurrentCompany
}: SignUpLinksProps) {

  const { theme } = useTheme();

  return (
    <section className={`rounded-lg shadow p-6 ${getThemeColor(theme, 'cardBackground')}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-2xl font-bold ${getThemeColor(theme, 'textHeader')}`}>Sign Up Links</h2>
      </div>

      {/* Company Selector for Sign Up Links */}
      <div className="mb-6">
        <h3 className={`text-lg font-medium mb-2 ${getThemeColor(theme, 'textHeader')}`}>Filter by Company</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCurrentCompany(null)}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentCompany === null
                ? getUIColor('button', 'secondary', theme)
                : `${getUIColor('button', 'primary', theme)} ${getUIColor('hover', 'button', theme)}`
            }`}
          >
            All Companies
          </button>
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => setCurrentCompany(company)}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentCompany?.id === company.id
                  ? getUIColor('button', 'secondary', theme)
                  : `${getUIColor('button', 'primary', theme)} ${getUIColor('hover', 'button', theme)}`
              }`}
            >
              {company.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sign Up Links Grid */}
      <div className="grid grid-cols-1 gap-4">
        {companies
          .filter(company => currentCompany ? company.id === currentCompany.id : true)
          .map((company) => (
            <div key={company.id} className={`rounded-lg p-4 border-2 shadow-sm ${getThemeColor(theme, 'background')} ${getThemeColor(theme, 'border')}`}>
              <h3 className={`text-lg font-semibold mb-2 ${getThemeColor(theme, 'text')}`}>{company.name}</h3>
              <CompanySignupLink 
                companyId={company.id} 
                companyName={company.name} 
              />
            </div>
          ))
        }
      </div>
    </section>
  );
} 