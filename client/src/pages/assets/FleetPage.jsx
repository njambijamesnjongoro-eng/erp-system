import { useState, useEffect } from 'react';
import { Truck, Plus, Fuel, MapPin, Gauge, AlertTriangle, Search, Calendar } from 'lucide-react';
import { fleetService } from '../../api/assets';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function FleetPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager', 'Procurement Officer');
  const [vehicles, setVehicles] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const [vRes, fRes, tRes] = await Promise.all([
        fleetService.list(), fleetService.getFuelLogs({}), fleetService.getTrips({}),
      ]);
      setVehicles(vRes.data.data || []);
      setFuelLogs(fRes.data.data || []);
      setTrips(tRes.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleAddVehicle = async () => {
    try { await fleetService.create(form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleAddFuel = async () => {
    try { await fleetService.addFuel(selectedVehicle, form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleAddTrip = async () => {
    try { await fleetService.addTrip(selectedVehicle, form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Fleet Management</h1><p className="text-gray-500 dark:text-gray-400 mt-1">{vehicles.length} vehicles registered</p></div>
        <div className="flex gap-2">
          {canManage && <button onClick={() => { setModalType('vehicle'); setShowModal(true); }} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Vehicle</button>}
          {canManage && <button onClick={() => { setModalType('fuel'); setShowModal(true); }} className="btn-secondary gap-2"><Fuel className="w-4 h-4" /> Log Fuel</button>}
          {canManage && <button onClick={() => { setModalType('trip'); setShowModal(true); }} className="btn-secondary gap-2"><MapPin className="w-4 h-4" /> Log Trip</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {['vehicles', 'fuel', 'trips'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>{t} Log{t === 'vehicles' ? '' : 's'}</button>
        ))}
      </div>

      {activeTab === 'vehicles' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map(v => (
            <div key={v.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{v.registration_number}</p>
                    <p className="text-sm text-gray-500">{v.make} {v.model} ({v.year})</p>
                  </div>
                  <span className={`badge badge-${getStatusColor(v.status)}`}>{v.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div><span className="text-gray-500">Type:</span> {v.vehicle_type}</div>
                  <div><span className="text-gray-500">Fuel:</span> {v.fuel_type}</div>
                  <div><span className="text-gray-500">Mileage:</span> {v.current_mileage?.toLocaleString()} km</div>
                  <div><span className="text-gray-500">Driver:</span> {v.driver_name || 'Unassigned'}</div>
                </div>
                {v.insurance_expiry && <p className={`text-xs mt-2 ${new Date(v.insurance_expiry) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>Insurance: {formatDate(v.insurance_expiry)}</p>}
              </div>
            </div>
          ))}
          {vehicles.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No vehicles registered</div>}
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="card"><div className="card-body overflow-x-auto">
          <table className="data-table"><thead><tr><th>Date</th><th>Vehicle</th><th>Liters</th><th>Cost/L</th><th>Total</th><th>Odometer</th><th>Station</th></tr></thead>
            <tbody>{fuelLogs.map(f => (
              <tr key={f.id}>
                <td>{formatDate(f.fuel_date)}</td><td className="font-medium">{f.registration_number || 'N/A'}</td>
                <td>{f.liters}</td><td>{formatCurrency(f.cost_per_liter)}</td>
                <td className="font-medium">{formatCurrency(f.total_cost)}</td>
                <td>{f.odometer_reading?.toLocaleString()}</td><td>{f.fuel_station}</td>
              </tr>
            ))}{fuelLogs.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No fuel logs</td></tr>}</tbody>
          </table>
        </div></div>
      )}

      {activeTab === 'trips' && (
        <div className="card"><div className="card-body overflow-x-auto">
          <table className="data-table"><thead><tr><th>Date</th><th>Vehicle</th><th>Driver</th><th>From</th><th>To</th><th>Distance</th><th>Purpose</th></tr></thead>
            <tbody>{trips.map(t => (
              <tr key={t.id}>
                <td>{formatDate(t.trip_date)}</td><td className="font-medium">{t.registration_number || 'N/A'}</td>
                <td>{t.driver_name}</td><td className="max-w-[120px] truncate">{t.start_location}</td>
                <td className="max-w-[120px] truncate">{t.end_location}</td>
                <td>{t.distance_km} km</td><td className="max-w-[150px] truncate">{t.purpose}</td>
              </tr>
            ))}{trips.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No trips logged</td></tr>}</tbody>
          </table>
        </div></div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 capitalize">Log {modalType}</h3>
            {modalType === 'vehicle' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><input placeholder="Registration Number *" value={form.registration_number||''} onChange={e => setForm({...form, registration_number: e.target.value})} className="input-field w-full" required /></div>
                <select value={form.vehicle_type||''} onChange={e => setForm({...form, vehicle_type: e.target.value})} className="input-field"><option value="">Type</option><option value="car">Car</option><option value="suv">SUV</option><option value="truck">Truck</option><option value="van">Van</option><option value="motorcycle">Motorcycle</option></select>
                <input placeholder="Make" value={form.make||''} onChange={e => setForm({...form, make: e.target.value})} className="input-field" />
                <input placeholder="Model" value={form.model||''} onChange={e => setForm({...form, model: e.target.value})} className="input-field" />
                <input type="number" placeholder="Year" value={form.year||''} onChange={e => setForm({...form, year: parseInt(e.target.value)})} className="input-field" />
                <input placeholder="Chassis Number" value={form.chassis_number||''} onChange={e => setForm({...form, chassis_number: e.target.value})} className="input-field" />
                <input placeholder="Engine Number" value={form.engine_number||''} onChange={e => setForm({...form, engine_number: e.target.value})} className="input-field" />
                <select value={form.fuel_type||''} onChange={e => setForm({...form, fuel_type: e.target.value})} className="input-field"><option value="">Fuel Type</option><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="electric">Electric</option><option value="hybrid">Hybrid</option></select>
                <input type="number" placeholder="Tank Capacity (L)" value={form.tank_capacity||''} onChange={e => setForm({...form, tank_capacity: parseInt(e.target.value)})} className="input-field" />
              </div>
            )}
            {modalType === 'fuel' && (
              <div className="space-y-4">
                <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="input-field w-full" required><option value="">Select Vehicle</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
                <input type="number" step="0.1" placeholder="Liters" value={form.liters||''} onChange={e => setForm({...form, liters: parseFloat(e.target.value)})} className="input-field w-full" required />
                <input type="number" step="0.01" placeholder="Cost per Liter" value={form.cost_per_liter||''} onChange={e => setForm({...form, cost_per_liter: parseFloat(e.target.value)})} className="input-field w-full" required />
                <input type="number" step="0.01" placeholder="Total Cost" value={form.total_cost||''} onChange={e => setForm({...form, total_cost: parseFloat(e.target.value)})} className="input-field w-full" required />
                <input type="number" placeholder="Odometer Reading" value={form.odometer_reading||''} onChange={e => setForm({...form, odometer_reading: parseInt(e.target.value)})} className="input-field w-full" />
                <input placeholder="Fuel Station" value={form.fuel_station||''} onChange={e => setForm({...form, fuel_station: e.target.value})} className="input-field w-full" />
              </div>
            )}
            {modalType === 'trip' && (
              <div className="space-y-4">
                <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="input-field w-full" required><option value="">Select Vehicle</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
                <input placeholder="Start Location" value={form.start_location||''} onChange={e => setForm({...form, start_location: e.target.value})} className="input-field w-full" required />
                <input placeholder="End Location" value={form.end_location||''} onChange={e => setForm({...form, end_location: e.target.value})} className="input-field w-full" required />
                <textarea placeholder="Purpose" value={form.purpose||''} onChange={e => setForm({...form, purpose: e.target.value})} className="input-field w-full" rows={2} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Start Odometer" value={form.start_odometer||''} onChange={e => setForm({...form, start_odometer: parseInt(e.target.value)})} className="input-field" />
                  <input type="number" placeholder="End Odometer" value={form.end_odometer||''} onChange={e => setForm({...form, end_odometer: parseInt(e.target.value)})} className="input-field" />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={modalType === 'vehicle' ? handleAddVehicle : modalType === 'fuel' ? handleAddFuel : handleAddTrip} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
