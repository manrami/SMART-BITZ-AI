import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Type declarations for Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface VoiceInputBtnProps {
    onTranscript: (text: string) => void;
    className?: string;
    disabled?: boolean;
}

export const VoiceInputBtn: React.FC<VoiceInputBtnProps> = ({
    onTranscript,
    className = "",
    disabled = false
}) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Can be made configurable

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                // Add a space if we are appending to existing text
                onTranscript(finalTranscript.trim());
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);

            if (event.error === 'not-allowed') {
                toast({
                    title: "Microphone Access Denied",
                    description: "Please allow microphone access in your browser settings to use voice input.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Voice Input Error",
                    description: `Error: ${event.error}. Please try again.`,
                    variant: "destructive"
                });
            }
        };

        recognition.onend = () => {
            // If we didn't explicitly stop it, it might have timed out. 
            // For continuous listening, we'd restart it here, but for this button we'll just stop.
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript, toast]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (err) {
                console.error("Failed to start recording", err);
                // Might already be started
            }
        }
    };

    if (!isSupported) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" disabled className={className}>
                            <MicOff className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Voice input is not supported in this browser.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant={isListening ? "destructive" : "outline"}
                        size="icon"
                        onClick={toggleListening}
                        disabled={disabled}
                        className={`transition-all duration-300 ${isListening ? 'animate-pulse ring-2 ring-destructive ring-offset-2' : ''} ${className}`}
                    >
                        {isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isListening ? 'Stop listening' : 'Click to speak'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
