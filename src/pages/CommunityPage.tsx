import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { MentorBooking } from "@/components/community/MentorBooking";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Users2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CommunityPage = () => {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !user) {
            navigate("/auth");
        }
    }, [user, isLoading, navigate]);

    if (isLoading) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col pt-16">
            <Header />

            <main className="flex-1 py-12 px-6">
                <div className="container max-w-6xl mx-auto space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Users2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Founder Community</h1>
                            <p className="text-muted-foreground text-lg">Connect with local founders, share milestones, and book expert mentors.</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <Tabs defaultValue="feed">
                            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                                <TabsTrigger value="feed">Community Feed</TabsTrigger>
                                <TabsTrigger value="mentors">Mentor Connect</TabsTrigger>
                            </TabsList>

                            <TabsContent value="feed">
                                <div className="grid md:grid-cols-12 gap-8">
                                    <div className="md:col-span-8">
                                        <CommunityFeed />
                                    </div>
                                    <div className="md:col-span-4 hidden md:block">
                                        {/* Sidebar for Feed */}
                                        <div className="sticky top-24 space-y-6">
                                            <div className="p-6 bg-accent/20 rounded-xl border border-accent/30">
                                                <h3 className="font-bold flex items-center gap-2 mb-2"><Users2 className="w-4 h-4 text-accent" /> Network Status</h3>
                                                <p className="text-sm text-muted-foreground">Your local founder network is growing! 14 new startups joined this week.</p>
                                            </div>
                                            <div className="p-6 border rounded-xl">
                                                <h3 className="font-bold mb-4">Trending Topics</h3>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between items-center text-primary cursor-pointer hover:underline">
                                                        <span>#MSME_Grants_2024</span>
                                                        <span className="text-xs text-muted-foreground bg-muted px-2 rounded-full">42 posts</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-primary cursor-pointer hover:underline">
                                                        <span>#D2C_Marketing</span>
                                                        <span className="text-xs text-muted-foreground bg-muted px-2 rounded-full">18 posts</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-primary cursor-pointer hover:underline">
                                                        <span>#CoWorking_Spaces</span>
                                                        <span className="text-xs text-muted-foreground bg-muted px-2 rounded-full">12 posts</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="mentors">
                                <MentorBooking />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default CommunityPage;
