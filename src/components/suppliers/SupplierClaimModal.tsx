/**
 * SupplierClaimModal.tsx
 * "Claim this Business" modal — shown on auto-discovered (Overpass/OSM) supplier cards.
 * Lets a supplier register/verify their listing, growing the platform organically.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Building2, CheckCircle2, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SupplierClaimModalProps {
    open: boolean;
    onClose: () => void;
    supplierName: string;
    supplierAddress?: string;
}

export function SupplierClaimModal({
    open,
    onClose,
    supplierName,
    supplierAddress,
}: SupplierClaimModalProps) {
    const [step, setStep] = useState<"form" | "success">("form");
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        ownerName: "",
        phone: "",
        email: "",
        gstOrPan: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.ownerName.trim() || !form.phone.trim()) {
            toast.error("Please fill in your name and phone number.");
            return;
        }
        setSubmitting(true);
        // Simulate an API / Supabase call (replace with real call when backend is ready)
        await new Promise((r) => setTimeout(r, 1400));
        setSubmitting(false);
        setStep("success");
    };

    const handleClose = () => {
        setStep("form");
        setForm({ ownerName: "", phone: "", email: "", gstOrPan: "" });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md rounded-2xl">
                {step === "form" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                                Claim this Business
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Are you the owner of <strong>{supplierName}</strong>? Verify and
                                take control of this listing to update your products, contact, and
                                address.
                            </DialogDescription>
                        </DialogHeader>

                        {supplierAddress && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {supplierAddress}
                            </p>
                        )}

                        <div className="flex gap-1.5 flex-wrap">
                            {["Same strategy as IndiaMART", "Grow organically", "Free listing"].map((t) => (
                                <Badge key={t} variant="secondary" className="text-xs font-normal">
                                    {t}
                                </Badge>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                            <Input
                                placeholder="Your full name *"
                                value={form.ownerName}
                                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                                required
                            />
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Phone number *"
                                    className="pl-9"
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Email (optional)"
                                    type="email"
                                    className="pl-9"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <Input
                                placeholder="GST / PAN number (optional)"
                                value={form.gstOrPan}
                                onChange={(e) => setForm((f) => ({ ...f, gstOrPan: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Our team will verify your claim within 24 hours and send you a
                                confirmation.
                            </p>
                            <div className="flex gap-2 justify-end pt-1">
                                <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" className="gap-2" disabled={submitting}>
                                    {submitting ? (
                                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
                                    ) : (
                                        "Submit Claim"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-6 space-y-4">
                        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
                        <div>
                            <h3 className="font-bold text-lg">Claim Submitted!</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                We've received your claim for <strong>{supplierName}</strong>. Our
                                team will verify and activate your listing within 24 hours.
                            </p>
                        </div>
                        <Button onClick={handleClose} className="rounded-full px-8">
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
