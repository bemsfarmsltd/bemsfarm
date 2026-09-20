import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../services/api";

export default function DriverOnboardingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState("");
  const [driverData, setDriverData] = useState(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    nin_number: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    guarantor_name: "",
    guarantor_phone: "",
    guarantor_address: "",
    vehicle_type: "motorcycle",
    vehicle_plate: "",
    license_number: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    password: "",
    confirmPassword: "",
    documents: {
      drivers_license: "",
      nin_slip: "",
      vehicle_registration: "",
      passport_photo: "",
      guarantor_form: "",
    },
  });

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerifyError("No invitation token provided. Please use the link sent to your email.");
      return;
    }

    api
      .get("/driver/onboarding/verify", { params: { token } })
      .then((res) => {
        const d = res.data?.driver;
        setDriverData(d);
        if (d) {
          setFormData((prev) => ({
            ...prev,
            name: d.name || "",
            phone: d.phone || "",
            email: d.email || "",
            nin_number: d.nin_number || "",
            address: d.address || "",
            emergency_contact_name: d.emergency_contact_name || "",
            emergency_contact_phone: d.emergency_contact_phone || "",
            emergency_contact_relationship: d.emergency_contact_relationship || "",
            guarantor_name: d.guarantor_name || "",
            guarantor_phone: d.guarantor_phone || "",
            guarantor_address: d.guarantor_address || "",
            vehicle_type: d.vehicle_type || "motorcycle",
            vehicle_plate: d.vehicle_plate || "",
            license_number: d.license_number || "",
            bank_name: d.bank_name || "",
            account_number: d.account_number || "",
            account_name: d.account_name || "",
            documents: {
              drivers_license: d.documents?.drivers_license || "",
              nin_slip: d.documents?.nin_slip || "",
              vehicle_registration: d.documents?.vehicle_registration || "",
              passport_photo: d.documents?.passport_photo || "",
              guarantor_form: d.documents?.guarantor_form || "",
            },
          }));

          if (d.onboarding_status === "documents_submitted") {
            setSubmitSuccess(true);
          }
        }
      })
      .catch((err) => {
        setVerifyError(err.response?.data?.message || "Invalid or expired onboarding invitation link.");
      })
      .finally(() => setVerifying(false));
  }, [token]);

  // Handle file to base64 preview upload
  const handleFileUpload = (docKey, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docKey]: reader.result,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      setSubmitError("PIN / passwords do not match.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await api.post("/driver/onboarding/submit", {
        token,
        ...formData,
      });
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to submit compliance documents. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#0d1f18] flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold">Verifying Driver Invitation…</h2>
          <p className="text-emerald-300/70 text-sm mt-1">Securing your driver onboarding session</p>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-screen bg-[#0d1f18] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold mb-2">Invitation Error</h2>
          <p className="text-gray-300 text-sm mb-6">{verifyError}</p>
          <Link
            to="/contact"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
          >
            Contact BemsFarms Dispatch
          </Link>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#0d1f18] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
            📋
          </div>
          <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            Compliance Under Review
          </span>
          <h2 className="text-2xl font-bold mb-3">Documents Submitted Successfully!</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            Thank you, <strong>{formData.name}</strong>! Your driver identity, vehicle details, and uploaded compliance documents have been received by <strong>BemsFarms Logistics Management</strong>.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left mb-6 space-y-2 text-xs text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">Registered Phone:</span>
              <strong className="text-white font-mono">{formData.phone}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Registered Email:</span>
              <strong className="text-white">{formData.email}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Compliance Status:</span>
              <strong className="text-amber-300">Pending Verification</strong>
            </div>
          </div>
          <p className="text-xs text-emerald-300/80 mb-6">
            📩 You will receive an official approval email with your login instructions as soon as your compliance check is finalized.
          </p>
          <Link
            to="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition shadow-lg"
          >
            Return to Storefront
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1813] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-600/40 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 mb-3">
            <span>🌾 BemsFarms Logistics Fleet</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Dispatch Driver Onboarding</h1>
          <p className="text-gray-400 text-sm mt-1 max-w-lg mx-auto">
            Complete your profile and upload compliance documents to activate your dispatch delivery account.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 mb-8 bg-white/5 p-2 rounded-2xl border border-white/10">
          {[
            { step: 1, title: "1. Personal & Next of Kin" },
            { step: 2, title: "2. Vehicle & Payout" },
            { step: 3, title: "3. Compliance Uploads" },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                currentStep === s.step
                  ? "bg-emerald-600 text-white shadow-lg"
                  : currentStep > s.step
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {submitError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
              <span>⚠️</span>
              <span>{submitError}</span>
            </div>
          )}

          {driverData?.compliance_notes && driverData.onboarding_status === "rejected" && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
              <strong className="block mb-1 text-amber-300">⚠️ Previous Compliance Feedback:</strong>
              <p className="text-xs leading-relaxed">{driverData.compliance_notes}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* STEP 1: Personal & Next of Kin */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Personal Identity & Address</h3>
                  <p className="text-xs text-gray-400">Provide your verified residential and government identification details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number (Login ID) *</label>
                    <input
                      type="tel"
                      required
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">National Identification Number (NIN) *</label>
                    <input
                      type="text"
                      required
                      placeholder="11-digit NIN"
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={formData.nin_number}
                      onChange={(e) => setFormData({ ...formData, nin_number: e.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Residential Home Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full street address, city, state"
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3">Emergency Contact / Next of Kin</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Contact Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mary Okon"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Relationship *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Spouse / Sibling"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.emergency_contact_relationship}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="0800 000 0000"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3">Guarantor Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Guarantor Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chief Emeka Obi"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.guarantor_name}
                        onChange={(e) => setFormData({ ...formData, guarantor_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Guarantor Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="0800 000 0000"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.guarantor_phone}
                        onChange={(e) => setFormData({ ...formData, guarantor_phone: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Guarantor Business/Home Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="Address of guarantor"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.guarantor_address}
                        onChange={(e) => setFormData({ ...formData, guarantor_address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-sm transition"
                  >
                    Next: Vehicle & Payout Details →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Vehicle & Payout */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Vehicle & Payout Account</h3>
                  <p className="text-xs text-gray-400">Specify your delivery vehicle specifications and commission payout bank account.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Vehicle Type *</label>
                    <select
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    >
                      <option value="motorcycle">Motorcycle / Delivery Bike</option>
                      <option value="tricycle">Tricycle (Keke)</option>
                      <option value="van">Delivery Van / Minivan</option>
                      <option value="car">Sedan / Hatchback</option>
                      <option value="truck">Light Truck</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Vehicle Plate Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABA-492-XA"
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 uppercase"
                      value={formData.vehicle_plate}
                      onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Driver's License Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DL-93821094"
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 uppercase"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3">Commission & Payout Bank Account</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Bank Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Access Bank / OPay / GTBank"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">10-Digit Account Number *</label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="0123456789"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Account Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="As registered with bank"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.account_name}
                        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3">Set Driver App PIN / Password</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Driver App PIN / Password</label>
                      <input
                        type="password"
                        placeholder="e.g. 6-digit PIN"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Confirm PIN / Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter PIN"
                        className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
                  >
                    ← Back to Step 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-sm transition"
                  >
                    Next: Upload Documents →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Compliance Document Uploads */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Compliance Document Verification</h3>
                  <p className="text-xs text-gray-400">
                    Upload high-quality scans or photos of your identification, license, and vehicle registration.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Driver's License */}
                  <div className="bg-black/30 border border-white/15 rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-bold text-white">Driver's License *</div>
                        <div className="text-xs text-gray-400">Valid Nigerian driver's license</div>
                      </div>
                      {formData.documents.drivers_license && (
                        <span className="text-xs text-emerald-400 font-bold">✓ Attached</span>
                      )}
                    </div>
                    {formData.documents.drivers_license && (
                      <div className="mb-3 rounded-xl overflow-hidden h-28 bg-black">
                        <img src={formData.documents.drivers_license} alt="License Preview" className="w-100 h-100 object-cover" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload("drivers_license", e.target.files[0])}
                      className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600"
                    />
                  </div>

                  {/* NIN Slip / ID */}
                  <div className="bg-black/30 border border-white/15 rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-bold text-white">NIN Slip / Gov ID *</div>
                        <div className="text-xs text-gray-400">NIN enrollment or card scan</div>
                      </div>
                      {formData.documents.nin_slip && (
                        <span className="text-xs text-emerald-400 font-bold">✓ Attached</span>
                      )}
                    </div>
                    {formData.documents.nin_slip && (
                      <div className="mb-3 rounded-xl overflow-hidden h-28 bg-black">
                        <img src={formData.documents.nin_slip} alt="NIN Preview" className="w-100 h-100 object-cover" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload("nin_slip", e.target.files[0])}
                      className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600"
                    />
                  </div>

                  {/* Vehicle Registration */}
                  <div className="bg-black/30 border border-white/15 rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-bold text-white">Vehicle Registration Papers *</div>
                        <div className="text-xs text-gray-400">Proof of ownership or lease</div>
                      </div>
                      {formData.documents.vehicle_registration && (
                        <span className="text-xs text-emerald-400 font-bold">✓ Attached</span>
                      )}
                    </div>
                    {formData.documents.vehicle_registration && (
                      <div className="mb-3 rounded-xl overflow-hidden h-28 bg-black">
                        <img src={formData.documents.vehicle_registration} alt="Vehicle Paper Preview" className="w-100 h-100 object-cover" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload("vehicle_registration", e.target.files[0])}
                      className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600"
                    />
                  </div>

                  {/* Passport Photo */}
                  <div className="bg-black/30 border border-white/15 rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-bold text-white">Passport Photograph *</div>
                        <div className="text-xs text-gray-400">Clear face photo on white background</div>
                      </div>
                      {formData.documents.passport_photo && (
                        <span className="text-xs text-emerald-400 font-bold">✓ Attached</span>
                      )}
                    </div>
                    {formData.documents.passport_photo && (
                      <div className="mb-3 rounded-xl overflow-hidden h-28 bg-black">
                        <img src={formData.documents.passport_photo} alt="Passport Preview" className="w-100 h-100 object-cover" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("passport_photo", e.target.files[0])}
                      className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
                  >
                    ← Back to Step 2
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold px-10 py-3.5 rounded-xl text-sm transition shadow-xl disabled:opacity-50"
                  >
                    {submitting ? "Submitting Compliance Package…" : "Submit Documents for Compliance Approval ✓"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
