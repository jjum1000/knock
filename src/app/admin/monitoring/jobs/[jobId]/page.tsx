'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  User,
  Calendar,
  Timer,
  Star,
  AlertCircle,
  FileJson,
} from 'lucide-react';
import { monitoringApi } from '@/services/adminApi';
import type { AgentJob, AgentJobLog } from '@/types/admin';
import { formatDuration } from '@/lib/date';
import { useToast } from '@/hooks/use-toast';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const jobId = params?.jobId as string;
  const [job, setJob] = useState<AgentJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setIsLoading(true);
      const response = await monitoringApi.getJobDetails(jobId);
      setJob(response.data);
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      processing: 'secondary',
      failed: 'destructive',
      error: 'destructive',
      skipped: 'outline',
    };
    const icons: Record<string, React.ReactNode> = {
      completed: <CheckCircle2 className="h-3 w-3 mr-1" />,
      processing: <Clock className="h-3 w-3 mr-1 animate-spin" />,
      failed: <XCircle className="h-3 w-3 mr-1" />,
      error: <XCircle className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center w-fit">
        {icons[status]}
        {status}
      </Badge>
    );
  };

  const getLogIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'skipped':
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The job you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push('/admin/monitoring/jobs')}>
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/monitoring/jobs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Job Details</h1>
            <p className="text-muted-foreground font-mono text-sm">{job.jobId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(job.status)}
          <Button variant="outline" size="icon" onClick={fetchJobDetails}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{job.user?.email || 'N/A'}</div>
            <p className="text-xs text-muted-foreground font-mono">{job.user?.id.slice(0, 8)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execution Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {job.executionTimeMs ? formatDuration(job.executionTimeMs) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {job.executionTimeMs ? `${job.executionTimeMs}ms` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {job.qualityScore ? `${job.qualityScore}/100` : 'N/A'}
            </div>
            {job.qualityScore && (
              <p className="text-xs text-muted-foreground">
                {job.qualityScore >= 90
                  ? 'Excellent'
                  : job.qualityScore >= 80
                  ? 'Good'
                  : job.qualityScore >= 70
                  ? 'Fair'
                  : 'Needs Improvement'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Started</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date(job.startedAt).toLocaleTimeString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(job.startedAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {job.errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono">
              {job.errorMessage}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Agent Execution Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Execution Timeline</CardTitle>
          <CardDescription>
            Step-by-step execution log of all agents in the pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          {job.logs && job.logs.length > 0 ? (
            <div className="space-y-4">
              {job.logs.map((log: AgentJobLog, index: number) => (
                <div
                  key={log.id}
                  className="flex gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  {/* Timeline Icon */}
                  <div className="flex flex-col items-center">
                    <div className="flex-shrink-0">{getLogIcon(log.status)}</div>
                    {index < (job.logs?.length || 0) - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-2" />
                    )}
                  </div>

                  {/* Log Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{log.agentName}</h4>
                        {getStatusBadge(log.status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(log.executionTimeMs)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">{log.message}</p>

                    {/* Input/Output Data */}
                    <div className="grid gap-2 md:grid-cols-2">
                      {log.inputData && (
                        <div className="text-xs">
                          <div className="font-medium mb-1 flex items-center gap-1">
                            <FileJson className="h-3 w-3" />
                            Input
                          </div>
                          <pre className="bg-muted p-2 rounded overflow-auto max-h-32 text-xs">
                            {JSON.stringify(log.inputData, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.outputData && (
                        <div className="text-xs">
                          <div className="font-medium mb-1 flex items-center gap-1">
                            <FileJson className="h-3 w-3" />
                            Output
                          </div>
                          <pre className="bg-muted p-2 rounded overflow-auto max-h-32 text-xs">
                            {JSON.stringify(log.outputData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No execution logs available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Input/Output */}
      <Tabs defaultValue="input" className="space-y-4">
        <TabsList>
          <TabsTrigger value="input">Input Data</TabsTrigger>
          <TabsTrigger value="output">Output Data</TabsTrigger>
          <TabsTrigger value="generated">Generated Content</TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
              <CardDescription>
                The input data provided to start the agent pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
                {job.input ? JSON.stringify(job.input, null, 2) : 'No input data available'}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output">
          <Card>
            <CardHeader>
              <CardTitle>Output Data</CardTitle>
              <CardDescription>
                The final output generated by the agent pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
                {job.output ? JSON.stringify(job.output, null, 2) : 'No output data available'}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generated">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Personas */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Personas</CardTitle>
                <CardDescription>
                  Personas created by this job ({job.personas?.length || 0})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {job.personas && job.personas.length > 0 ? (
                  <div className="space-y-2">
                    {job.personas.map((persona: any) => (
                      <div key={persona.id} className="p-3 border rounded-lg">
                        <div className="font-semibold">{persona.name || 'Unnamed'}</div>
                        <div className="text-sm text-muted-foreground">
                          Archetype: {persona.archetype || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(persona.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No personas generated</div>
                )}
              </CardContent>
            </Card>

            {/* Rooms */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Rooms</CardTitle>
                <CardDescription>
                  Room images created by this job ({job.rooms?.length || 0})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {job.rooms && job.rooms.length > 0 ? (
                  <div className="space-y-2">
                    {job.rooms.map((room: any) => (
                      <div key={room.id} className="p-3 border rounded-lg">
                        {room.imageUrl && (
                          <img
                            src={room.imageUrl}
                            alt="Room"
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(room.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No rooms generated</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
