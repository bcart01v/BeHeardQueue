import { Company } from '@/types/company';
import CompanySignupLink from './CompanySignupLink';

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
  return (
    <section className="bg-[#ffa300] rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#3e2802]">Sign Up Links</h2>
      </div>

      {/* Company Selector for Sign Up Links */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-[#3e2802] mb-2">Filter by Company</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCurrentCompany(null)}
            className={`px-4 py-2 rounded-md ${
              currentCompany === null
                ? 'bg-[#1e1b1b] text-white' 
                : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
            }`}
          >
            All Companies
          </button>
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => setCurrentCompany(company)}
              className={`px-4 py-2 rounded-md ${
                currentCompany?.id === company.id 
                  ? 'bg-[#1e1b1b] text-white' 
                  : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
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
            <div key={company.id} className="bg-[#1e1b1b] border-2 border-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-[#ffa300] mb-2">{company.name}</h3>
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