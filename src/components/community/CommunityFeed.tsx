import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, ThumbsUp, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

type Post = {
    id: string;
    content: string;
    city: string;
    category: string;
    author_id: string;
    created_at: string;
    likes: number;
    profiles?: { full_name: string };
};

export const CommunityFeed = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [userCity, setUserCity] = useState("India");

    useEffect(() => {
        const storedProfile = sessionStorage.getItem("userProfile");
        if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            if (profile.city) setUserCity(profile.city);
        }
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoading(true);
        try {
            // Using a join to fetch author names if profiles table exists and relations are setup
            // For resilience without perfect DB relations, we'll fetch posts then map profiles 
            const { data: postsData, error: postsError } = await supabase
                .from('community_posts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (postsError) throw postsError;

            // Fetch profile names for these distinct authors manually if no direct join is setup
            const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
            const { data: profilesData } = await supabase
                .from('user_profiles')
                .select('user_id, full_name')
                .in('user_id', authorIds);

            const profileMap = (profilesData || []).reduce((acc: any, profile: any) => {
                acc[profile.user_id] = profile.full_name;
                return acc;
            }, {});

            const enrichedPosts = postsData?.map(p => ({
                ...p,
                profiles: { full_name: profileMap[p.author_id] || "Fellow Founder" }
            })) as Post[];

            setPosts(enrichedPosts || []);
        } catch (error) {
            console.error("Error loading posts:", error);
            // Default empty state, no hard fail
        } finally {
            setIsLoading(false);
        }
    };

    const handlePost = async () => {
        if (!newPostContent.trim()) return;

        setIsLoading(true);
        try {
            const newPost = {
                author_id: user?.id,
                content: newPostContent,
                city: userCity,
                category: 'Discussion',
                likes: 0
            };

            const { error } = await supabase.from('community_posts').insert([newPost]);

            if (error) throw error;

            toast({ title: "Posted successfully!" });
            setNewPostContent('');
            fetchPosts(); // Refresh feed
        } catch (error: any) {
            toast({ title: "Failed to post", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && posts.length === 0) {
        return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">You</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                            <Textarea
                                placeholder={`Ask a question or share an update with founders in ${userCity}...`}
                                className="min-h-[100px] resize-none bg-background"
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                            />
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Posting to {userCity} Local Network
                                </div>
                                <Button
                                    onClick={handlePost}
                                    disabled={!newPostContent.trim() || isLoading}
                                    className="gap-2"
                                >
                                    <Send className="w-4 h-4" /> Post
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {posts.map(post => (
                    <Card key={post.id} className="transition-all hover:border-primary/30">
                        <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-muted text-muted-foreground">
                                        {post.profiles?.full_name?.charAt(0) || "F"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-sm">{post.profiles?.full_name || "Fellow Founder"}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {post.city} • {new Date(post.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
                                            {post.category}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                                        {post.content}
                                    </p>
                                    <div className="flex gap-4 mt-4 pt-3 border-t">
                                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1">
                                            <ThumbsUp className="w-4 h-4" /> {post.likes || 0}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1">
                                            <MessageSquare className="w-4 h-4" /> Reply
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
