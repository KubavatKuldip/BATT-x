"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Toast, Shield, Phone, Mail, Plus, Trash2, AlertTriangle, Bell, FileText, Download, Loader2 } from "lucide-react";
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
        c.id === editingId ? { ...contactForm, id: editingId } : c
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
      // Get active device (in real app, would get from dashboard store)
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
      startDate.setMonth(startDate.getMonth() - 1); // Last 30 days

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

      // Create downloadable JSON
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

  // Render modal separately to avoid JSX parsing issues
  const renderModal = () => {
    if (!(editingId || contactForm.name || contactForm.phone || contactForm.email)) {
      return null;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-3">{editingId ? "Edit Contact" : "Add Emergency Contact"}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={editingId ? handleUpdateContact : handleAddContact} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Full Name</Label>
                <Input
                  id="contact-name"
                  placeholder="John Doe"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                  disabled={isAdding}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone Number</Label>
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

              <div className="space-y-2">
                <Label htmlFor="contact-email">Email (Optional)</Label>
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
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div>
          <h1 className="text-heading-1">Safety & Emergency</h1>
          <p className="text-muted-foreground mt-1">
            Manage emergency contacts, configure SOS alerts, and generate safety reports.
          </p>
        </div>

        {/* SOS EMERGENCY SECTION */}
        <Card level={3} className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">SOS Emergency Alert</CardTitle>
                <CardDescription>
                  Immediately notify emergency contacts and services in critical situations.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>SOS Button Arming</Label>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{sosArmed ? "Armed - Ready to Trigger" : "Disarmed"}</p>
                  <p className="text-sm text-muted-foreground">
                    {sosArmed ? "Press and hold SOS button for 3 seconds to activate" : "Enable to allow SOS activation from device or app"}
                  </p>
                </div>
                <Switch
                  checked={sosArmed}
                  onCheckedChange={setSosArmed}
                  aria-label="Arm SOS button"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>SOS Trigger Options</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  disabled={!sosArmed}
                >
                  <Shield className="w-5 h-5" />
                  <span>Manual Trigger</span>
                  <span className="text-xs text-muted-foreground">From app</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  disabled={!sosArmed}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>Auto: Critical</span>
                  <span className="text-xs text-muted-foreground">Sensor threshold</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  disabled={!sosArmed}
                >
                  <Bell className="w-5 h-5" />
                  <span>Auto: Impact</span>
                  <span className="text-xs text-muted-foreground">Crash detection</span>
                </Button>
              </div>
            </div>

            {/* SOS Button - Large and prominent */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant={sosArmed ? "destructive" : "outline"}
                  size="lg"
                  className="w-full h-16 text-lg font-semibold gap-3"
                  disabled={!sosArmed}
                  style={{
                    background: sosArmed ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : undefined,
                    boxShadow: sosArmed ? "0 0 30px rgba(239, 68, 68, 0.4)" : undefined,
                  }}
                >
                  <AlertTriangle className="w-6 h-6" style={{ animation: sosArmed ? "pulse 1s infinite" : "none" }} />
                  <span>SOS EMERGENCY</span>
                  <span className="text-sm opacity-75">Hold 3s to activate</span>
                </Button>
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
                  <AlertDialogAction onClick={handleSosTrigger} className="bg-destructive hover:bg-destructive/90">
                    Confirm SOS
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {sosArmed && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center text-sm text-destructive">
                <strong>⚠ SOS is ARMED</strong> - Press and hold the button above for 3 seconds to trigger emergency alert.
              </div>
            )}
          </CardContent>
        </Card>

        {/* EMERGENCY CONTACTS SECTION */}
        <Card level={2}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Emergency Contacts</CardTitle>
                  <CardDescription>
                    Up to 5 contacts will be notified via SMS and email during emergencies.
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Contact
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : emergencyContacts.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No Emergency Contacts</h3>
                <p className="text-muted-foreground mb-4">Add contacts who will be notified during SOS emergencies.</p>
                <Button onClick={() => { setContactForm({ name: "", phone: "", email: "" }); setEditingId(null); }}>
                  <Plus className="w-4 h-4 mr-1" /> Add First Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {emergencyContacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{contact.phone}</span>
                          {contact.email && (
                            <>
                              <Mail className="w-3 h-3" />
                              <span>{contact.email}</span>
                            </>
                          )}
                        </p>
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
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
                {emergencyContacts.length >= 5 && (
                  <p className="text-caption text-muted-foreground text-center">
                    Maximum of 5 emergency contacts reached.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ADD/EDIT CONTACT MODAL */}
        {renderModal()}

        {/* INSURANCE REPORT SECTION */}
        <Card level={2}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Insurance & Safety Reports</CardTitle>
                <CardDescription>
                  Generate comprehensive safety reports for insurance claims and compliance.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Report Period</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    defaultValue={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    className="flex-1"
                  />
                  <span className="flex items-center text-muted-foreground">to</span>
                  <Input
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <select className="w-full px-3 py-2 bg-background border border-border rounded-lg">
                  <option value="JSON">JSON (Machine Readable)</option>
                  <option value="PDF">PDF (Print Ready)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Include in Report</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-primary" />
                  <span>Alerts & Safety Events</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-primary" />
                  <span>Charge Sessions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border text-primary" />
                  <span>Sensor Readings (Sampled)</span>
                </label>
              </div>
            </div>

            <Button onClick={handleGenerateReport} className="w-full" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Generate & Download Report
            </Button>
          </CardContent>
        </Card>

        {/* SAFETY FEATURES INFO */}
        <Card level={1}>
          <CardHeader>
            <CardTitle>Safety Features Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Real-time Monitoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Continuous temperature, gas, voltage, and current monitoring with instant alerts.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Automatic Cutoff</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatic battery disconnection when critical thresholds are exceeded.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <Bell className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Multi-channel Alerts</h4>
                  <p className="text-sm text-muted-foreground">
                    Push notifications, SMS, email, and in-app alerts for all safety events.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Compliance Reports</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate detailed safety reports for insurance and regulatory compliance.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}