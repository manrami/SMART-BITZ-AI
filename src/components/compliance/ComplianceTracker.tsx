import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileCheck, Landmark, CheckCircle2, Clock, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type LicenseType = 'GST' | 'MSME' | 'FSSAI' | 'SHOP';

interface ComplianceRecord {
    id?: string;
    license_type: LicenseType;
    status: 'Pending' | 'Completed';
    form_data: any;
}

export const ComplianceTracker = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<LicenseType>('MSME');
    const [records, setRecords] = useState<Record<string, ComplianceRecord>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        businessName: '',
        ownerName: '',
        panNumber: '',
        aadhaarNumber: '',
        address: '',
        businessCategory: 'Manufacturing'
    });

    useEffect(() => {
        if (user) {
            fetchComplianceRecords();
        }
    }, [user]);

    const fetchComplianceRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_compliance')
                .select('*')
                .eq('user_id', user?.id);

            if (error) throw error;

            if (data) {
                const recordMap: Record<string, ComplianceRecord> = {};
                data.forEach(item => {
                    recordMap[item.license_type] = item as ComplianceRecord;
                    // Pre-fill form if we have data for the first loaded record
                    if (item.form_data && !formData.businessName) {
                        setFormData(prev => ({ ...prev, ...item.form_data }));
                    }
                });
                setRecords(recordMap);
            }
        } catch (error) {
            console.error('Error fetching compliance records:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAndGenerate = async (licenseType: LicenseType) => {
        if (!formData.businessName || !formData.ownerName || !formData.panNumber) {
            toast({
                title: "Missing Information",
                description: "Please fill in all core business details first.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            // 1. Save to database
            const existingRecord = records[licenseType];

            const payload = {
                user_id: user?.id,
                license_type: licenseType,
                status: 'Pending',
                form_data: formData
            };

            let saveError;
            if (existingRecord?.id) {
                const { error } = await supabase
                    .from('user_compliance')
                    .update(payload)
                    .eq('id', existingRecord.id);
                saveError = error;
            } else {
                const { error } = await supabase
                    .from('user_compliance')
                    .insert([payload]);
                saveError = error;
            }

            if (saveError) throw saveError;

            // 2. Update local state
            setRecords(prev => ({
                ...prev,
                [licenseType]: {
                    ...payload,
                    id: existingRecord?.id || 'temp-id',
                    status: 'Pending'
                } as ComplianceRecord
            }));

            // 3. Simulate PDF Generation for the Government Portal
            generateGovFormPDF(licenseType, formData);

            toast({
                title: "Form Generated & Saved",
                description: `Your pre-filled ${licenseType} document is ready for download.`,
            });

        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to save compliance data.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const markAsCompleted = async (licenseType: LicenseType) => {
        const existingRecord = records[licenseType];
        if (!existingRecord?.id || existingRecord.id === 'temp-id') {
            // Need to refresh to get real ID if just created
            await fetchComplianceRecords();
            return;
        }

        try {
            const { error } = await supabase
                .from('user_compliance')
                .update({ status: 'Completed' })
                .eq('id', existingRecord.id);

            if (error) throw error;

            setRecords(prev => ({
                ...prev,
                [licenseType]: { ...prev[licenseType], status: 'Completed' }
            }));

            toast({ title: "Status Updated", description: `${licenseType} marked as Completed!` });
        } catch (error) {
            console.error(error);
        }
    };

    const generateGovFormPDF = (type: string, data: any) => {
        // In a real app, this would call a backend service (like our pitch_deck_service)
        // For now, we simulate downloading a pre-filled PDF template
        const content = `Type: ${type}\nBusiness: ${data.businessName}\nOwner: ${data.ownerName}\nPAN: ${data.panNumber}\nAddress: ${data.address}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.businessName.replace(/\s+/g, '_')}_${type}_Application.txt`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const licenses: { id: LicenseType; name: string; desc: string; icon: any }[] = [
        { id: 'MSME', name: 'MSME / Udyam', desc: 'Required for government subsidies and loans.', icon: Landmark },
        { id: 'GST', name: 'GST Registration', desc: 'Mandatory if turnover exceeds ₹40 Lakhs.', icon: FileCheck },
        { id: 'FSSAI', name: 'FSSAI License', desc: 'Mandatory for food and beverage businesses.', icon: CheckCircle2 },
        { id: 'SHOP', name: 'Shop & Establishment', desc: 'Required by State Labor Departments.', icon: MapPin },
    ];

    return (
        <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Business Details</CardTitle>
                        <CardDescription>Master data used to pre-fill all forms</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Business Name</Label>
                            <Input name="businessName" value={formData.businessName} onChange={handleInputChange} placeholder="E.g. Sunrise Bakery" />
                        </div>
                        <div className="space-y-2">
                            <Label>Owner Full Name</Label>
                            <Input name="ownerName" value={formData.ownerName} onChange={handleInputChange} placeholder="As per PAN card" />
                        </div>
                        <div className="space-y-2">
                            <Label>PAN Number</Label>
                            <Input name="panNumber" value={formData.panNumber} onChange={handleInputChange} className="uppercase" placeholder="ABCDE1234F" />
                        </div>
                        <div className="space-y-2">
                            <Label>Aadhaar Number</Label>
                            <Input name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} placeholder="1234 5678 9012" />
                        </div>
                        <div className="space-y-2">
                            <Label>Business Category</Label>
                            <select
                                name="businessCategory"
                                value={formData.businessCategory}
                                onChange={handleInputChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="Services">Services</option>
                                <option value="Trading">Trading</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Operating Address</Label>
                            <Input name="address" value={formData.address} onChange={handleInputChange} placeholder="Full address with Pincode" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-8">
                <Card className="h-full border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle>Compliance Auto-Fill</CardTitle>
                        <CardDescription>Select a license to generate the pre-filled application form.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as LicenseType)}>
                            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-6">
                                {licenses.map(lic => (
                                    <TabsTrigger key={lic.id} value={lic.id} className="text-xs md:text-sm">
                                        {lic.id}
                                        {records[lic.id]?.status === 'Completed' && <CheckCircle2 className="w-3 h-3 ml-1 text-success inline" />}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {licenses.map(license => {
                                const record = records[license.id];
                                const Icon = license.icon;

                                return (
                                    <TabsContent key={license.id} value={license.id}>
                                        <div className="p-6 bg-background rounded-xl border flex flex-col items-center text-center space-y-4">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <Icon size={32} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">{license.name}</h3>
                                                <p className="text-muted-foreground mt-1">{license.desc}</p>
                                            </div>

                                            <div className="mt-4 p-4 rounded-lg bg-muted/50 w-full max-w-md flex justify-between items-center">
                                                <span className="font-semibold text-sm">Application Status:</span>
                                                {record ? (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${record.status === 'Completed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning-foreground'}`}>
                                                        {record.status === 'Completed' ? <><CheckCircle2 className="w-3 h-3 inline mr-1" /> Completed</> : <><Clock className="w-3 h-3 inline mr-1" /> Pending Submission</>}
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">Not Started</span>
                                                )}
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <Button
                                                    onClick={() => handleSaveAndGenerate(license.id)}
                                                    disabled={isSaving}
                                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                                >
                                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                                                    Generate Pre-filled Form
                                                </Button>

                                                {record?.status === 'Pending' && (
                                                    <Button variant="outline" onClick={() => markAsCompleted(license.id)} className="border-success/50 text-success hover:bg-success/10">
                                                        Mark as Approved
                                                    </Button>
                                                )}
                                            </div>

                                            <p className="text-xs text-muted-foreground mt-4 max-w-lg">
                                                Note: This generates a correctly formatted document with your details. You will still need to upload this document to the official government portal ({license.id.toLowerCase()}.gov.in).
                                            </p>
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
