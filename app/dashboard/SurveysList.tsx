'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Star, Calendar, Building2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Survey {
    id: string;
    created_at: string;
    org_slug: string;
    answers: any;
}

interface SurveysListProps {
    surveys: Survey[];
}

export default function SurveysList({ surveys }: SurveysListProps) {
    if (!surveys || surveys.length === 0) {
        return (
            <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/25">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium text-foreground">No surveys yet</h3>
                <p className="text-muted-foreground">You haven't completed any surveys yet.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey, index) => {
                const rating = survey.answers?.overall_rating?.answer || 'N/A';
                const feedback = survey.answers?.improvement_feedback?.answer;

                return (
                    <motion.div
                        key={survey.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        <Card className="h-full hover:shadow-md transition-shadow duration-200 border-muted/60 overflow-hidden group">
                            <div className="h-2 bg-gradient-to-r from-primary/80 to-primary/40" />
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="capitalize">{survey.org_slug}</span>
                                        </CardTitle>
                                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(survey.created_at), 'PPP')}
                                        </div>
                                    </div>
                                    <Badge variant={getRatingVariant(rating)} className="ml-2 shrink-0">
                                        {rating}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span className="font-medium text-foreground">Rating:</span> {rating}
                                    </div>

                                    {feedback && (
                                        <div className="bg-muted/30 p-3 rounded-md text-sm italic text-muted-foreground line-clamp-3">
                                            "{feedback}"
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}

function getRatingVariant(rating: string): "default" | "secondary" | "destructive" | "outline" {
    switch (rating.toLowerCase()) {
        case 'excellent':
        case 'good':
            return 'default'; // primary color usually indicates success/good
        case 'average':
            return 'secondary';
        case 'could be better':
        case 'poor':
            return 'destructive';
        default:
            return 'outline';
    }
}
