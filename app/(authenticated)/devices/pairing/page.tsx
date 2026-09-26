"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScanLine, CheckCircle, CarFront, AlertCircle, Keyboard } from "lucide-react";
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
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 flex items-center justify-center">
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
              <Card level={2}>
                <CardHeader>
                  <CardTitle>Pair Device</CardTitle>
                  <CardDescription>
                    Scan the QR code on your BATT-X device to pair it
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Scanner Container */}
                  <div className="relative">
                    <div
                      id="qr-reader"
                      className="rounded-lg overflow-hidden border-2 border-border bg-muted"
                      style={{ minHeight: isScanning ? "auto" : "300px" }}
                    />
                    {!isScanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted rounded-lg">
                        <ScanLine className="w-16 h-16 text-muted-foreground mb-4" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground text-center px-4">
                          {cameraPermission === "denied"
                            ? "Camera access required"
                            : "Ready to scan QR code"}
                        </p>
                      </div>
                    )}
                  </div>

                  {scanError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-sm text-destructive">{scanError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {!isScanning ? (
                      <Button
                        onClick={startScanning}
                        className="w-full"
                        size="lg"
                      >
                        <ScanLine className="w-5 h-5 mr-2" aria-hidden="true" />
                        Start Scanning
                      </Button>
                    ) : (
                      <Button
                        onClick={stopScanning}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        Stop Scanning
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        stopScanning();
                        setStep("manualEntry");
                      }}
                      variant="ghost"
                      className="w-full"
                      size="sm"
                    >
                      <Keyboard className="w-4 h-4 mr-2" aria-hidden="true" />
                      Can't scan? Enter manually
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
              <Card level={2}>
                <CardHeader>
                  <CardTitle>Confirm Device</CardTitle>
                  <CardDescription>
                    Review and confirm your device details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input
                      value={deviceData.serial}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "TWO_WHEELER", label: "2-Wheeler" },
                        { value: "THREE_WHEELER", label: "3-Wheeler" },
                        { value: "FOUR_WHEELER", label: "4-Wheeler" },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          type="button"
                          variant={deviceData.type === type.value ? "default" : "outline"}
                          className="flex flex-col h-20 gap-2"
                          onClick={() =>
                            setDeviceData({ ...deviceData, type: type.value as any })
                          }
                          disabled={isLoading}
                        >
                          <CarFront className="w-5 h-5" aria-hidden="true" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nickname">Vehicle Nickname (Optional)</Label>
                    <Input
                      id="nickname"
                      placeholder="e.g. My Daily Commuter"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeviceData(null);
                      setStep("scanQR");
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePairDevice}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? "Pairing..." : "Pair Device"}
                  </Button>
                </CardFooter>
              </Card>
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
              <Card level={2}>
                <CardHeader>
                  <CardTitle>Manual Entry</CardTitle>
                  <CardDescription>
                    Enter your device serial number manually
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="manualSerial">Serial Number</Label>
                    <Input
                      id="manualSerial"
                      placeholder="e.g. BATTX-A7X9K2"
                      className="uppercase"
                      value={manualSerial}
                      onChange={(e) => setManualSerial(e.target.value.toUpperCase())}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Vehicle Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "TWO_WHEELER", label: "2-Wheeler" },
                        { value: "THREE_WHEELER", label: "3-Wheeler" },
                        { value: "FOUR_WHEELER", label: "4-Wheeler" },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          type="button"
                          variant={manualVehicleType === type.value ? "default" : "outline"}
                          className="flex flex-col h-20 gap-2"
                          onClick={() => setManualVehicleType(type.value as any)}
                          disabled={isLoading}
                        >
                          <CarFront className="w-5 h-5" aria-hidden="true" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manualNickname">Vehicle Nickname (Optional)</Label>
                    <Input
                      id="manualNickname"
                      placeholder="e.g. My Daily Commuter"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("scanQR")}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Back to Scan
                  </Button>
                  <Button
                    onClick={handleManualPair}
                    disabled={isLoading || !manualSerial}
                    className="flex-1"
                  >
                    {isLoading ? "Pairing..." : "Pair Device"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card level={2} className="border-success/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6"
                  >
                    <CheckCircle className="w-10 h-10 text-success" aria-hidden="true" />
                  </motion.div>
                  <h2 className="text-heading-3 mb-2">Device Paired Successfully!</h2>
                  <p className="text-muted-foreground">
                    {nickname || "Your device"} is now connected and monitoring.
                  </p>
                  <p className="text-caption text-muted-foreground mt-8">
                    Redirecting to dashboard...
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
