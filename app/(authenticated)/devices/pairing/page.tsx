"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScanLine, CheckCircle, CarFront, AlertCircle, Keyboard, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";

type PairingStep = "scanQR" | "confirm" | "success" | "manualEntry";

interface DeviceData {
  serial: string;
  type: "TWO_WHEELER" | "THREE_WHEELER" | "FOUR_WHEELER";
}

export default function DevicePairingPage() {
  const router = useRouter();
  const [step, setStep] = useState<PairingStep>("scanQR");
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  // Manual entry states
  const [manualSerial, setManualSerial] = useState("");
  const [manualVehicleType, setManualVehicleType] = useState<"TWO_WHEELER" | "THREE_WHEELER" | "FOUR_WHEELER">("TWO_WHEELER");

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setScanError(null);
      setIsScanning(true);

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Successfully scanned QR code
          try {
            const data = JSON.parse(decodedText) as DeviceData;

            // Validate QR data structure
            if (!data.serial || !data.type) {
              throw new Error("Invalid QR code format");
            }

            if (!["TWO_WHEELER", "THREE_WHEELER", "FOUR_WHEELER"].includes(data.type)) {
              throw new Error("Invalid vehicle type in QR code");
            }

            // Stop scanning
            await scanner.stop();
            setIsScanning(false);
            setCameraPermission("granted");

            // Save device data and move to confirm step
            setDeviceData(data);
            setStep("confirm");
          } catch (err) {
            setScanError("Invalid QR code. Please scan a valid BATT-X device QR code.");
          }
        },
        () => {
          // Ignore scan errors (no QR code in frame yet)
        }
      );

      setCameraPermission("granted");
    } catch (err: any) {
      setIsScanning(false);
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        setCameraPermission("denied");
        setScanError("Camera access denied. Please enable camera permissions in your browser settings.");
      } else {
        setScanError("Unable to access camera. Please try manual entry or check your device settings.");
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Ignore stop errors
      }
      setIsScanning(false);
    }
  };

  const handlePairDevice = async () => {
    if (!deviceData) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/devices/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: deviceData.serial,
          vehicleType: deviceData.type,
          nickname: nickname || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            variant: "destructive",
            title: "Device Already Paired",
            description: "This device is already registered to another account. If this is your device, please contact support.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Pairing Failed",
            description: data.error || "Unable to pair device. Please try again.",
          });
        }
        setIsLoading(false);
        return;
      }

      // Success
      setStep("success");

      // Redirect to dashboard after showing success
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Pairing Failed",
        description: "An error occurred during pairing. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleManualPair = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/devices/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: manualSerial,
          vehicleType: manualVehicleType,
          nickname: nickname || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            variant: "destructive",
            title: "Device Already Paired",
            description: "This device is already registered to another account.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Pairing Failed",
            description: data.error || "Unable to pair device.",
          });
        }
        setIsLoading(false);
        return;
      }

      setStep("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Pairing Failed",
        description: "An error occurred. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'hsl(var(--bg))' }}>
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* STEP 1: SCAN QR CODE */}
          {step === "scanQR" && (
            <motion.div
              key="scanQR"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="paper-surface-hover rounded-lg border border-rule p-8">
                <div className="mb-8">
                  <h2 className="text-[28px] font-medium tracking-tight leading-tight mb-2">Pair Device</h2>
                  <p className="text-[14px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Scan the QR code on your BATT-X device to pair it
                  </p>
                </div>

                <div className="space-y-5">
                  {/* QR Scanner Container */}
                  <div className="relative">
                    <div
                      id="qr-reader"
                      className="rounded-lg overflow-hidden border-2 border-rule"
                      style={{
                        minHeight: isScanning ? "auto" : "300px",
                        background: 'hsl(var(--bg))'
                      }}
                    />
                    {!isScanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg" style={{ background: 'hsl(var(--bg))' }}>
                        <ScanLine className="w-16 h-16 mb-4" style={{ color: 'hsl(var(--ink-4))' }} aria-hidden="true" />
                        <p className="font-mono text-[12px] text-center px-4" style={{ color: 'hsl(var(--ink-3))' }}>
                          {cameraPermission === "denied"
                            ? "Camera access required"
                            : "Ready to scan QR code"}
                        </p>
                      </div>
                    )}
                  </div>

                  {scanError && (
                    <div className="flex items-start gap-3 p-4 rounded-lg border" style={{
                      background: 'color-mix(in srgb, hsl(var(--danger)) 8%, hsl(var(--paper)))',
                      borderColor: 'color-mix(in srgb, hsl(var(--danger)) 25%, hsl(var(--rule)))',
                    }}>
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--danger))' }} aria-hidden="true" />
                      <p className="text-[13px]" style={{ color: 'hsl(var(--danger))' }}>{scanError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    {!isScanning ? (
                      <Button
                        onClick={startScanning}
                        className="w-full h-12 font-mono text-[13px]"
                      >
                        <ScanLine className="w-5 h-5 mr-2" aria-hidden="true" />
                        Start Scanning
                      </Button>
                    ) : (
                      <Button
                        onClick={stopScanning}
                        variant="outline"
                        className="w-full h-12 font-mono text-[13px]"
                      >
                        Stop Scanning
                      </Button>
                    )}

                    <button
                      onClick={() => {
                        stopScanning();
                        setStep("manualEntry");
                      }}
                      className="w-full h-10 flex items-center justify-center gap-2 font-mono text-[12px] transition-colors hover:underline"
                      style={{ color: 'hsl(var(--ink-3))' }}
                    >
                      <Keyboard className="w-4 h-4" aria-hidden="true" />
                      Can't scan? Enter manually
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CONFIRM DEVICE DETAILS */}
          {step === "confirm" && deviceData && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="paper-surface-hover rounded-lg border border-rule p-8">
                <div className="mb-8">
                  <h2 className="text-[28px] font-medium tracking-tight leading-tight mb-2">Confirm Device</h2>
                  <p className="text-[14px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Review and confirm your device details
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="smallcaps block mb-2">Serial Number</Label>
                    <Input
                      value={deviceData.serial}
                      disabled
                      className="font-mono"
                      style={{ background: 'hsl(var(--bg))' }}
                    />
                  </div>

                  <div>
                    <Label className="smallcaps block mb-3">Vehicle Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "TWO_WHEELER", label: "2-Wheeler" },
                        { value: "THREE_WHEELER", label: "3-Wheeler" },
                        { value: "FOUR_WHEELER", label: "4-Wheeler" },
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setDeviceData({ ...deviceData, type: type.value as any })
                          }
                          disabled={isLoading}
                          className={`flex flex-col items-center justify-center h-20 gap-2 rounded-lg border transition-all ${
                            deviceData.type === type.value ? 'border-accent' : 'border-rule hover:border-ink-4'
                          }`}
                          style={{
                            background: deviceData.type === type.value
                              ? 'color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--paper)))'
                              : 'hsl(var(--paper))',
                          }}
                        >
                          <CarFront className="w-5 h-5" style={{ color: deviceData.type === type.value ? 'hsl(var(--accent))' : 'hsl(var(--ink-3))' }} aria-hidden="true" />
                          <span className="font-mono text-[11px]">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nickname" className="smallcaps block mb-2">Vehicle Nickname (Optional)</Label>
                    <Input
                      id="nickname"
                      placeholder="e.g. My Daily Commuter"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeviceData(null);
                      setStep("scanQR");
                    }}
                    disabled={isLoading}
                    className="flex-1 font-mono text-[12px]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePairDevice}
                    disabled={isLoading}
                    className="flex-1 font-mono text-[12px]"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pair Device"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: MANUAL ENTRY */}
          {step === "manualEntry" && (
            <motion.div
              key="manualEntry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="paper-surface-hover rounded-lg border border-rule p-8">
                <div className="mb-8">
                  <h2 className="text-[28px] font-medium tracking-tight leading-tight mb-2">Manual Entry</h2>
                  <p className="text-[14px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Enter your device serial number manually
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="manualSerial" className="smallcaps block mb-2">Serial Number</Label>
                    <Input
                      id="manualSerial"
                      placeholder="e.g. BATTX-A7X9K2"
                      className="uppercase font-mono"
                      value={manualSerial}
                      onChange={(e) => setManualSerial(e.target.value.toUpperCase())}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  <div>
                    <Label className="smallcaps block mb-3">Vehicle Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "TWO_WHEELER", label: "2-Wheeler" },
                        { value: "THREE_WHEELER", label: "3-Wheeler" },
                        { value: "FOUR_WHEELER", label: "4-Wheeler" },
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setManualVehicleType(type.value as any)}
                          disabled={isLoading}
                          className={`flex flex-col items-center justify-center h-20 gap-2 rounded-lg border transition-all ${
                            manualVehicleType === type.value ? 'border-accent' : 'border-rule hover:border-ink-4'
                          }`}
                          style={{
                            background: manualVehicleType === type.value
                              ? 'color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--paper)))'
                              : 'hsl(var(--paper))',
                          }}
                        >
                          <CarFront className="w-5 h-5" style={{ color: manualVehicleType === type.value ? 'hsl(var(--accent))' : 'hsl(var(--ink-3))' }} aria-hidden="true" />
                          <span className="font-mono text-[11px]">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="manualNickname" className="smallcaps block mb-2">Vehicle Nickname (Optional)</Label>
                    <Input
                      id="manualNickname"
                      placeholder="e.g. My Daily Commuter"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-8">
                  <Button
                    variant="outline"
                    onClick={() => setStep("scanQR")}
                    disabled={isLoading}
                    className="flex-1 font-mono text-[12px]"
                  >
                    Back to Scan
                  </Button>
                  <Button
                    onClick={handleManualPair}
                    disabled={isLoading || !manualSerial}
                    className="flex-1 font-mono text-[12px]"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pair Device"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="paper-surface-hover rounded-lg border p-16 text-center" style={{
                background: 'color-mix(in srgb, hsl(var(--ok)) 5%, hsl(var(--paper)))',
                borderColor: 'color-mix(in srgb, hsl(var(--ok)) 25%, hsl(var(--rule)))',
              }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto"
                  style={{ background: 'color-mix(in srgb, hsl(var(--ok)) 10%, hsl(var(--paper)))' }}
                >
                  <CheckCircle className="w-10 h-10" style={{ color: 'hsl(var(--ok))' }} aria-hidden="true" />
                </motion.div>
                <h2 className="text-[24px] font-medium tracking-tight mb-3">Device Paired Successfully!</h2>
                <p className="text-[14px] mb-8" style={{ color: 'hsl(var(--ink-2))' }}>
                  {nickname || "Your device"} is now connected and monitoring.
                </p>
                <p className="font-mono text-[11px]" style={{ color: 'hsl(var(--ink-4))' }}>
                  Redirecting to dashboard...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
