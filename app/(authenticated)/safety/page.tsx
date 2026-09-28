"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Phone, Mail, Plus, Trash2, AlertTriangle, Bell, FileText, Download, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
};

export default function SafetyPage() {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [sosArmed, setSosArmed] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(0);

  // Form state for adding/editing contacts
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch emergency contacts on mount
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/users/emergency-contacts");
      if (response.ok) {
        const data = await response.json();
        setEmergencyContacts(data.emergencyContacts || []);
      }
    } catch (error) {
      console.error("Failed to fetch emergency contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const response = await fetch("/api/users/emergency-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add contact");
      }

      const data = await response.json();
      setEmergencyContacts(data.emergencyContacts);
      setContactForm({ name: "", phone: "", email: "" });
      setEditingId(null);

      toast({
        title: "Contact Added",
        description: "Emergency contact has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Add Contact",
        description: error.message,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const updatedContacts = emergencyContacts.map((c) =>
        c.id === editingId ? { ...c, ...contactForm } : c
      );

      const response = await fetch("/api/users/emergency-contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergencyContacts: updatedContacts }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update contact");
      }

      const data = await response.json();
      setEmergencyContacts(data.emergencyContacts);
      setContactForm({ name: "", phone: "", email: "" });
      setEditingId(null);

      toast({
        title: "Contact Updated",
        description: "Emergency contact has been updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Update Contact",
        description: error.message,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const response = await fetch(`/api/users/emergency-contacts?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete contact");
      }

      const data = await response.json();
      setEmergencyContacts(data.emergencyContacts);

      toast({
        title: "Contact Removed",
        description: "Emergency contact has been deleted.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Remove Contact",
        description: error.message,
      });
    }
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setContactForm({ name: contact.name, phone: contact.phone, email: contact.email || "" });
    setEditingId(contact.id);
  };

  const handleSosTrigger = async () => {
    try {
      const devicesResponse = await fetch("/api/devices");
      if (!devicesResponse.ok) throw new Error("Failed to get devices");

      const devicesData = await devicesResponse.json();
      const activeDevice = devicesData.devices?.find((d: any) => d.status === "ONLINE");

      if (!activeDevice) {
        toast({
          variant: "destructive",
          title: "No Active Device",
          description: "Cannot trigger SOS without an active device.",
        });
        return;
      }

      const response = await fetch("/api/alerts/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: activeDevice.id,
          triggerType: "MANUAL",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to trigger SOS");
      }

      const data = await response.json();

      toast({
        variant: "default",
        title: "SOS Alert Triggered",
        description: `Emergency services and ${data.contactsNotified} contacts have been notified.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "SOS Failed",
        description: error.message,
      });
    }
  };

  const handleGenerateReport = async () => {
    try {
      const devicesResponse = await fetch("/api/devices");
      if (!devicesResponse.ok) throw new Error("Failed to get devices");

      const devicesData = await devicesResponse.json();
      const activeDevice = devicesData.devices?.find((d: any) => d.status === "ONLINE");

      if (!activeDevice) {
        toast({
          variant: "destructive",
          title: "No Active Device",
          description: "Cannot generate report without an active device.",
        });
        return;
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const response = await fetch("/api/alerts/insurance-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: activeDevice.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          includeAlerts: true,
          includeChargeSessions: true,
          includeSensorReadings: true,
          format: "JSON",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate report");
      }

      const data = await response.json();

      const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BATTX-Insurance-Report-${activeDevice.serialNumber}-${startDate.toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "Insurance report has been downloaded.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Report Generation Failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-10">
          <div className="eyebrow">05 — Safety & emergency</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] text-ink-4 tracking-wide uppercase">
                {emergencyContacts.length} CONTACTS · SOS {sosArmed ? 'ARMED' : 'DISARMED'}
              </div>
            </div>
            <div>
              <h2 className="h-section">
                Prepared for <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>emergencies.</em>
              </h2>
            </div>
          </div>
        </div>

        {/* SOS Emergency Section */}
        <section>
          <div className="mb-7">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">SOS Emergency Alert</h3>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
              Immediately notify emergency contacts and services in critical situations.
            </p>
          </div>

          <div className="paper-surface-hover rounded-lg border p-8" style={{
            background: sosArmed ? 'color-mix(in srgb, hsl(var(--danger)) 6%, hsl(var(--paper)))' : 'hsl(var(--paper))',
            borderColor: sosArmed ? 'color-mix(in srgb, hsl(var(--danger)) 30%, hsl(var(--rule)))' : 'hsl(var(--rule))',
          }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-[16px] font-medium mb-1">SOS Button Arming</div>
                <div className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                  {sosArmed ? "Armed - Ready to trigger emergency alert" : "Disarmed - SOS button inactive"}
                </div>
              </div>
              <Switch
                checked={sosArmed}
                onCheckedChange={setSosArmed}
                aria-label="Arm SOS button"
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={!sosArmed}
                  className="w-full h-20 rounded-lg font-medium text-[18px] tracking-tight transition-all disabled:opacity-40"
                  style={{
                    background: sosArmed ? 'hsl(var(--danger))' : 'hsl(var(--rule-soft))',
                    color: sosArmed ? 'white' : 'hsl(var(--ink-3))',
                    boxShadow: sosArmed ? '0 0 30px rgba(239, 68, 68, 0.4)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <AlertTriangle className="w-6 h-6" />
                    <span>SOS EMERGENCY</span>
                    <span className="text-sm opacity-75">Hold 3s to activate</span>
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Trigger SOS Emergency Alert?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately notify all emergency contacts and emergency services with your location. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSosTrigger} style={{ background: 'hsl(var(--danger))' }}>
                    Confirm SOS
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {sosArmed && (
              <div className="mt-5 p-4 rounded-lg text-center text-[13px] font-medium" style={{
                background: 'color-mix(in srgb, hsl(var(--danger)) 10%, hsl(var(--paper)))',
                color: 'hsl(var(--danger))',
              }}>
                ⚠ SOS is ARMED - Press and hold the button above for 3 seconds to trigger emergency alert
              </div>
            )}
          </div>
        </section>

        {/* Emergency Contacts */}
        <section>
          <div className="mb-7 flex items-end justify-between">
            <div>
              <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Emergency Contacts</h3>
              <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
                Up to 5 contacts will be notified via SMS and email during emergencies.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}
              className="font-mono text-[11px]"
              disabled={emergencyContacts.length >= 5}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(var(--accent))' }} />
            </div>
          ) : emergencyContacts.length === 0 ? (
            <div className="paper-surface-hover rounded-lg border border-rule p-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-5 rounded-full border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                  <Phone className="w-8 h-8" style={{ color: 'hsl(var(--ink-4))' }} />
                </div>
                <div>
                  <p className="text-[16px] font-medium mb-1">No Emergency Contacts</p>
                  <p className="text-[13px] mb-5" style={{ color: 'hsl(var(--ink-3))' }}>
                    Add contacts who will be notified during SOS emergencies
                  </p>
                  <Button onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}>
                    <Plus className="w-4 h-4" />
                    Add First Contact
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {emergencyContacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="paper-surface-hover rounded-lg border border-rule p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                      <Phone className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} />
                    </div>
                    <div>
                      <p className="text-[15px] font-medium mb-0.5">{contact.name}</p>
                      <div className="flex items-center gap-3 font-mono text-[12px]" style={{ color: 'hsl(var(--ink-3))' }}>
                        <span>{contact.phone}</span>
                        {contact.email && (
                          <>
                            <span>·</span>
                            <span>{contact.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditContact(contact)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContact(contact.id)}
                      style={{ color: 'hsl(var(--danger))' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {emergencyContacts.length >= 5 && (
                <p className="font-mono text-[11px] text-center pt-2" style={{ color: 'hsl(var(--ink-3))' }}>
                  Maximum of 5 emergency contacts reached
                </p>
              )}
            </div>
          )}
        </section>

        {/* Add/Edit Contact Modal */}
        {(editingId || contactForm.name || contactForm.phone || contactForm.email) && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md rounded-xl shadow-2xl p-8"
                style={{ background: 'hsl(var(--paper))' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium">{editingId ? "Edit Contact" : "Add Emergency Contact"}</h2>
                  <button
                    onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}
                    className="p-2 hover:bg-rule-soft rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={editingId ? handleUpdateContact : handleAddContact} className="space-y-5">
                  <div>
                    <Label htmlFor="contact-name" className="smallcaps block mb-2">Full Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="John Doe"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                      disabled={isAdding}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-phone" className="smallcaps block mb-2">Phone Number</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      required
                      disabled={isAdding}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-email" className="smallcaps block mb-2">Email (Optional)</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="john@example.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      disabled={isAdding}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}
                      disabled={isAdding}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isAdding || !contactForm.name || !contactForm.phone}
                    >
                      {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "Update Contact" : "Add Contact")}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Insurance Report */}
        <section>
          <div className="mb-7">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Insurance & Safety Reports</h3>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
              Generate comprehensive safety reports for insurance claims and compliance.
            </p>
          </div>

          <div className="paper-surface-hover rounded-lg border border-rule p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-5 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Report Period</div>
                <div className="font-mono text-[14px]">Last 30 days</div>
              </div>
              <div className="p-5 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Format</div>
                <div className="font-mono text-[14px]">JSON (Machine Readable)</div>
              </div>
              <div className="p-5 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Includes</div>
                <div className="font-mono text-[14px]">Alerts · Sessions · Readings</div>
              </div>
            </div>

            <Button onClick={handleGenerateReport} className="w-full font-mono text-[12px]">
              <Download className="w-4 h-4" />
              Generate & Download Report
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-11 border-t border-rule">
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div className="flex gap-5 flex-wrap font-mono text-[10.5px] tracking-wide" style={{ color: 'hsl(var(--ink-4))' }}>
              <span>BATT-x · Safety & Emergency</span>
              <span className="opacity-40">·</span>
              <span>All records sealed with HMAC-SHA256</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
