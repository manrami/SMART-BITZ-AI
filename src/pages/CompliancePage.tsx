import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ComplianceTracker } from "@/components/compliance/ComplianceTracker";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { FileCheck } from "lucide-react";

const CompliancePage = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col pt-16">
            <Header />

            <main className="flex-1 py-12 px-6">
                <div className="container max-w-6xl mx-auto space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <FileCheck className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Compliance Center</h1>
                            <p className="text-muted-foreground text-lg">Auto-fill and manage your required legal registrations.</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <ComplianceTracker />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default CompliancePage;
