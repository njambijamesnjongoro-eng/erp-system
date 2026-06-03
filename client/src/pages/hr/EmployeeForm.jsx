import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { employeeService, departmentService } from '../../api/hr';

export function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    fullName: '', email: '', gender: '', dateOfBirth: '', nationalId: '', passportNumber: '',
    phone: '', phoneSecondary: '', departmentId: '', position: '', jobTitle: '',
    employmentType: 'full_time', employmentStatus: 'active', dateHired: '',
    contractStartDate: '', contractEndDate: '', probationEndDate: '',
    address: '', city: '', state: '', postalCode: '', country: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    emergencyContactName2: '', emergencyContactPhone2: '',
    bankName: '', bankAccountNumber: '', bankAccountName: '',
    taxId: '', socialSecurityNumber: '', notes: '',
  });

  useEffect(() => {
    departmentService.list().then(r => setDepartments(r.data.data)).catch(console.error);
    if (isEditing) {
      setLoading(true);
      employeeService.getById(id).then(r => {
        const e = r.data.data;
        setForm({
          fullName: e.full_name || '', email: e.email || '', gender: e.gender || '',
          dateOfBirth: e.date_of_birth ? e.date_of_birth.slice(0, 10) : '', nationalId: e.national_id || '',
          passportNumber: e.passport_number || '', phone: e.phone || '', phoneSecondary: e.phone_secondary || '',
          departmentId: e.department_id || '', position: e.position || '', jobTitle: e.job_title || '',
          employmentType: e.employment_type || 'full_time', employmentStatus: e.employment_status || 'active',
          dateHired: e.date_hired ? e.date_hired.slice(0, 10) : '',
          contractStartDate: e.contract_start_date ? e.contract_start_date.slice(0, 10) : '',
          contractEndDate: e.contract_end_date ? e.contract_end_date.slice(0, 10) : '',
          probationEndDate: e.probation_end_date ? e.probation_end_date.slice(0, 10) : '',
          address: e.address || '', city: e.city || '', state: e.state || '',
          postalCode: e.postal_code || '', country: e.country || '',
          emergencyContactName: e.emergency_contact_name || '', emergencyContactPhone: e.emergency_contact_phone || '',
          emergencyContactRelation: e.emergency_contact_relation || '',
          emergencyContactName2: e.emergency_contact_name_2 || '', emergencyContactPhone2: e.emergency_contact_phone_2 || '',
          bankName: e.bank_name || '', bankAccountNumber: e.bank_account_number || '', bankAccountName: e.bank_account_name || '',
          taxId: e.tax_id || '', socialSecurityNumber: e.social_security_number || '', notes: e.notes || '',
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await employeeService.update(id, form);
      } else {
        await employeeService.create(form);
      }
      navigate('/hr/employees');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hr/employees" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">{isEditing ? 'Edit Employee' : 'Add Employee'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Personal Information</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Full Name *" name="fullName" value={form.fullName} onChange={handleChange} required />
            <Field label="Email *" name="email" type="email" value={form.email} onChange={handleChange} required />
            <Field label="Gender" name="gender" type="select" value={form.gender} onChange={handleChange}
              options={[{value:'',label:'Select'},{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}]} />
            <Field label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
            <Field label="National ID" name="nationalId" value={form.nationalId} onChange={handleChange} />
            <Field label="Passport Number" name="passportNumber" value={form.passportNumber} onChange={handleChange} />
            <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
            <Field label="Secondary Phone" name="phoneSecondary" value={form.phoneSecondary} onChange={handleChange} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Employment Details</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Department *" name="departmentId" type="select" value={form.departmentId} onChange={handleChange} required
              options={[{value:'',label:'Select Department'}, ...departments.map(d => ({value:d.id, label:d.name}))]} />
            <Field label="Position" name="position" value={form.position} onChange={handleChange} />
            <Field label="Job Title" name="jobTitle" value={form.jobTitle} onChange={handleChange} />
            <Field label="Employment Type" name="employmentType" type="select" value={form.employmentType} onChange={handleChange}
              options={[{value:'full_time',label:'Full Time'},{value:'part_time',label:'Part Time'},{value:'contract',label:'Contract'},{value:'intern',label:'Intern'},{value:'temporary',label:'Temporary'}]} />
            <Field label="Status" name="employmentStatus" type="select" value={form.employmentStatus} onChange={handleChange}
              options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'suspended',label:'Suspended'},{value:'terminated',label:'Terminated'},{value:'on_leave',label:'On Leave'}]} />
            <Field label="Date Hired" name="dateHired" type="date" value={form.dateHired} onChange={handleChange} />
            <Field label="Contract Start" name="contractStartDate" type="date" value={form.contractStartDate} onChange={handleChange} />
            <Field label="Contract End" name="contractEndDate" type="date" value={form.contractEndDate} onChange={handleChange} />
            <Field label="Probation End" name="probationEndDate" type="date" value={form.probationEndDate} onChange={handleChange} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Address</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><Field label="Address" name="address" value={form.address} onChange={handleChange} /></div>
            <Field label="City" name="city" value={form.city} onChange={handleChange} />
            <Field label="State/Province" name="state" value={form.state} onChange={handleChange} />
            <Field label="Postal Code" name="postalCode" value={form.postalCode} onChange={handleChange} />
            <Field label="Country" name="country" value={form.country} onChange={handleChange} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Emergency Contact</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Contact Name" name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} />
            <Field label="Phone" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={handleChange} />
            <Field label="Relation" name="emergencyContactRelation" value={form.emergencyContactRelation} onChange={handleChange} />
            <Field label="Contact 2 Name" name="emergencyContactName2" value={form.emergencyContactName2} onChange={handleChange} />
            <Field label="Contact 2 Phone" name="emergencyContactPhone2" value={form.emergencyContactPhone2} onChange={handleChange} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Bank & Tax Information</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Bank Name" name="bankName" value={form.bankName} onChange={handleChange} />
            <Field label="Account Number" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} />
            <Field label="Account Name" name="bankAccountName" value={form.bankAccountName} onChange={handleChange} />
            <Field label="Tax ID" name="taxId" value={form.taxId} onChange={handleChange} />
            <Field label="Social Security #" name="socialSecurityNumber" value={form.socialSecurityNumber} onChange={handleChange} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Notes</h3></div>
          <div className="card-body">
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4}
              className="input-field" placeholder="Additional notes..." />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/hr/employees" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, required, options }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {type === 'select' ? (
        <select name={name} value={value} onChange={onChange} required={required} className="input-field">
          {options.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} required={required} className="input-field" />
      )}
    </div>
  );
}
