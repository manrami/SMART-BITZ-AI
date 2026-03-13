import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Download, FileText, Presentation, Loader2 } from 'lucide-react';
import { BusinessPlan } from '@/types/business';
import { useToast } from '@/hooks/use-toast';

interface PitchDeckGeneratorProps {
    businessPlan: BusinessPlan;
}

export const PitchDeckGenerator: React.FC<PitchDeckGeneratorProps> = ({ businessPlan }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Direct call to Flask backend using full URL during dev (or relative if proxied)
            const response = await fetch('http://127.0.0.1:5000/api/generate-pitch-deck', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ business_plan: businessPlan }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate documents');
            }

            const data = await response.json();

            if (data.success) {
                // Download PPTX
                const pptxBlob = b64toBlob(data.pptx_base64, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
                downloadBlob(pptxBlob, `${businessPlan.name || 'Startup'}_PitchDeck.pptx`);

                // Download PDF
                const pdfBlob = b64toBlob(data.pdf_base64, 'application/pdf');
                downloadBlob(pdfBlob, `${businessPlan.name || 'Startup'}_BankLoanFmt.pdf`);

                toast({
                    title: "Download Complete",
                    description: "Your Pitch Deck and Bank Loan formats are ready.",
                });
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Generation Failed",
                description: "Unable to generate documents at this time. Please check your connection.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const b64toBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Presentation className="h-5 w-5 text-primary" />
                    Export Investor Materials
                </CardTitle>
                <CardDescription>
                    Automatically convert this business plan into formats required by investors and banks.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex-1 flex gap-2"
                >
                    {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Presentation className="h-4 w-4" />
                    )}
                    Download Pitch Deck (.pptx)
                </Button>
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    variant="outline"
                    className="flex-1 flex gap-2 border-primary/20"
                >
                    {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileText className="h-4 w-4" />
                    )}
                    Bank Loan Format (.pdf)
                </Button>
            </CardContent>
        </Card>
    );
};
