import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Star, Video, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MENTORS = [
    {
        id: 'm1',
        name: 'Priya Sharma',
        role: 'Ex-Founder & Angel Investor',
        expertise: ['Fundraising', 'B2B SaaS', 'Go-to-Market'],
        rating: 4.9,
        reviews: 124,
        price: 'Free',
        avatar: 'PS',
        availability: 'Next available on Tuesday'
    },
    {
        id: 'm2',
        name: 'Rahul Desai',
        role: 'Growth Marketing Head at TechCorp',
        expertise: ['Performance Marketing', 'SEO', 'D2C Brands'],
        rating: 4.8,
        reviews: 89,
        price: '₹500/hr',
        avatar: 'RD',
        availability: 'Available Today'
    },
    {
        id: 'm3',
        name: 'Anita Kumar',
        role: 'Chartered Accountant',
        expertise: ['Compliance', 'Financial Modeling', 'MSME Grants'],
        rating: 5.0,
        reviews: 42,
        price: '₹1000/hr',
        avatar: 'AK',
        availability: 'Next available on Friday'
    }
];

export const MentorBooking = () => {
    const { toast } = useToast();
    const [bookingState, setBookingState] = useState<Record<string, boolean>>({});

    const handleBookSession = (mentorId: string, mentorName: string) => {
        setBookingState(prev => ({ ...prev, [mentorId]: true }));

        // Simulate API call
        setTimeout(() => {
            setBookingState(prev => ({ ...prev, [mentorId]: false }));
            toast({
                title: "Session Requested",
                description: `Your meeting request has been sent to ${mentorName}. Check your email for confirmation.`,
            });
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-primary">Need Expert Advice?</h3>
                    <p className="text-sm text-muted-foreground mt-1">Book 1-on-1 video calls with verified industry experts and fellow founders.</p>
                </div>
                <Video className="w-10 h-10 text-primary opacity-50" />
            </div>

            <div className="grid gap-4">
                {MENTORS.map((mentor) => (
                    <Card key={mentor.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                        <CardContent className="p-0 sm:flex items-stretch">
                            <div className="p-6 flex-1 border-b sm:border-b-0 sm:border-r border-border">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-14 w-14">
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
                                            {mentor.avatar}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-bold text-lg">{mentor.name}</h4>
                                        <p className="text-sm text-muted-foreground font-medium">{mentor.role}</p>

                                        <div className="flex items-center gap-4 mt-2 text-xs font-semibold">
                                            <span className="flex items-center gap-1 text-amber-500">
                                                <Star className="w-4 h-4 fill-amber-500" /> {mentor.rating} ({mentor.reviews})
                                            </span>
                                            <span className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-1 rounded-sm">
                                                {mentor.price}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {mentor.expertise.map(skill => (
                                                <span key={skill} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 sm:w-64 bg-muted/20 flex flex-col justify-center space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4 text-primary" /> {mentor.availability}
                                </div>
                                <Button
                                    className="w-full gap-2 shadow-sm"
                                    onClick={() => handleBookSession(mentor.id, mentor.name)}
                                    disabled={bookingState[mentor.id]}
                                >
                                    <Calendar className="w-4 h-4" />
                                    {bookingState[mentor.id] ? "Requesting..." : "Book Session"}
                                </Button>
                                <Button variant="outline" className="w-full gap-2 text-muted-foreground">
                                    <MessageCircle className="w-4 h-4" /> Message
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="text-center pt-4">
                <Button variant="ghost" className="text-primary hover:bg-primary/10">
                    View All Mentors →
                </Button>
            </div>
        </div>
    );
};
