'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Camera, Loader2 } from 'lucide-react';

export default function MediaGallery({ userId }: { userId: string }) {
    const supabase = createClientComponentClient();
    const [videos, setVideos] = useState<any[]>([]);
    const [selfies, setSelfies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchMedia = async () => {
            setLoading(true);
            try {
                // Fetch videos
                const { data: videoFiles, error: videoError } = await supabase.storage
                    .from('quotes-bucket')
                    .list(`${userId}/recordings`, {
                        limit: 100,
                        offset: 0,
                        sortBy: { column: 'created_at', order: 'desc' },
                    });

                if (videoFiles) {
                    const videosWithUrls = videoFiles.map(file => {
                        const { data } = supabase.storage
                            .from('quotes-bucket')
                            .getPublicUrl(`${userId}/recordings/${file.name}`);
                        return { ...file, url: data.publicUrl };
                    });
                    setVideos(videosWithUrls);
                }

                // Fetch selfies
                const { data: selfieFiles, error: selfieError } = await supabase.storage
                    .from('quotes-bucket')
                    .list(`${userId}/selfies`, {
                        limit: 100,
                        offset: 0,
                        sortBy: { column: 'created_at', order: 'desc' },
                    });

                if (selfieFiles) {
                    const selfiesWithUrls = selfieFiles.map(file => {
                        const { data } = supabase.storage
                            .from('quotes-bucket')
                            .getPublicUrl(`${userId}/selfies/${file.name}`);
                        return { ...file, url: data.publicUrl };
                    });
                    setSelfies(selfiesWithUrls);
                }

            } catch (error) {
                console.error('Error fetching media:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, [userId, supabase]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>My Media Library</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="videos" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="videos" className="flex items-center gap-2">
                            <Video className="h-4 w-4" /> Videos
                        </TabsTrigger>
                        <TabsTrigger value="selfies" className="flex items-center gap-2">
                            <Camera className="h-4 w-4" /> Selfies
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="videos" className="space-y-4">
                        {videos.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">No videos found.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {videos.map((video) => (
                                    <div key={video.name} className="border rounded-lg overflow-hidden bg-black/5">
                                        <video src={video.url} controls className="w-full aspect-video object-cover" />
                                        <div className="p-2 text-xs text-muted-foreground truncate">
                                            {new Date(video.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="selfies" className="space-y-4">
                        {selfies.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">No selfies found.</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {selfies.map((selfie) => (
                                    <div key={selfie.name} className="border rounded-lg overflow-hidden bg-black/5">
                                        <img src={selfie.url} alt="Selfie" className="w-full aspect-square object-cover" />
                                        <div className="p-2 text-xs text-muted-foreground truncate">
                                            {new Date(selfie.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
