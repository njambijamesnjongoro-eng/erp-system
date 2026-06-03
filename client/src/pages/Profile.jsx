import { useState } from 'react';
import { User, Mail, Phone, Building2, Briefcase, Calendar, MapPin, Camera, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatDate, getStatusColor } from '../utils/helpers';

export function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your personal information</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                {user.passport_photo ? (
                  <img src={`/${user.passport_photo}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary-600" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold">{user.full_name || 'Not set'}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.employment_status)}`}>
                  {user.employment_status || 'Active'}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                {user.role_name}
              </p>
              <p className="text-sm text-gray-400 mt-1">Employee ID: {user.employee_id}</p>
            </div>

            <button
              onClick={() => setEditing(!editing)}
              className="btn-secondary text-sm"
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Personal Information</h3>
          </div>
          <div className="card-body space-y-4">
            <InfoRow icon={User} label="Full Name" value={user.full_name} />
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Phone" value={user.phone} />
            <InfoRow icon={MapPin} label="Address" value={user.address} />
            <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(user.date_of_birth)} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Employment Details</h3>
          </div>
          <div className="card-body space-y-4">
            <InfoRow icon={Briefcase} label="Employee ID" value={user.employee_id} />
            <InfoRow icon={Building2} label="Department" value={user.department_name} />
            <InfoRow icon={Briefcase} label="Position" value={user.position} />
            <InfoRow icon={Calendar} label="Date Hired" value={formatDate(user.date_hired)} />
            <InfoRow icon={Shield} label="Role" value={user.role_name} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Emergency Contact</h3>
          </div>
          <div className="card-body space-y-4">
            <InfoRow icon={User} label="Contact Name" value={user.emergency_contact_name} />
            <InfoRow icon={Phone} label="Contact Phone" value={user.emergency_contact_phone} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Account Info</h3>
          </div>
          <div className="card-body space-y-4">
            <InfoRow icon={Calendar} label="Member Since" value={formatDate(user.created_at)} />
            <InfoRow icon={Calendar} label="Last Login" value={formatDate(user.last_login)} />
            <div className="pt-2">
              <button className="btn-primary text-sm">Change Password</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
      </div>
    </div>
  );
}
