'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/admin/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  Database,
  Play,
} from 'lucide-react';
import { monitoringApi, agentApi } from '@/services/adminApi';
import type { DashboardStats, AgentStats } from '@/types/admin';
import { formatRelativeTime, formatDuration } from '@/lib/date';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [dashboard, agent] = await Promise.all([
        monitoringApi.getDashboard('24h'),
        agentApi.getStats(),
      ]);

      setDashboardStats(dashboard);
      setAgentStats(agent.data || null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. Please try again.',
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
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the Knock Admin Dashboard</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your system performance and activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/templates')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Manage Templates
          </Button>
          <Button onClick={() => router.push('/admin/agent')}>
            <Play className="mr-2 h-4 w-4" />
            Run Agent
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Jobs"
          value={dashboardStats?.overview.totalJobs || 0}
          description="Last 24 hours"
          icon={Activity}
        />
        <StatsCard
          title="Success Rate"
          value={`${dashboardStats?.overview.successRate.toFixed(1) || 0}%`}
          description="Completed successfully"
          icon={CheckCircle2}
        />
        <StatsCard
          title="Avg Execution Time"
          value={formatDuration(dashboardStats?.overview.averageExecutionTime || 0)}
          description="Per job"
          icon={Clock}
        />
        <StatsCard
          title="Avg Quality Score"
          value={dashboardStats?.overview.averageQualityScore.toFixed(1) || 0}
          description="Out of 100"
          icon={TrendingUp}
        />
      </div>

      {/* Agent System Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Personas Created"
          value={agentStats?.output.totalPersonasCreated || 0}
          description="Total generated"
          icon={Database}
        />
        <StatsCard
          title="Rooms Created"
          value={agentStats?.output.totalRoomsCreated || 0}
          description="Total generated"
          icon={Database}
        />
        <StatsCard
          title="Currently Processing"
          value={dashboardStats?.overview.processingJobs || 0}
          description="Active jobs"
          icon={Clock}
        />
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Latest agent execution jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardStats?.recentJobs && dashboardStats.recentJobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Quality Score</TableHead>
                  <TableHead>Execution Time</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardStats.recentJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/monitoring/jobs/${job.jobId}`)}
                  >
                    <TableCell className="font-mono text-xs">
                      {job.jobId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>{job.user?.email || 'N/A'}</TableCell>
                    <TableCell>
                      {job.qualityScore ? `${job.qualityScore}/100` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {job.executionTimeMs ? formatDuration(job.executionTimeMs) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(job.startedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No recent jobs found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/admin/templates')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create New Template
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/admin/data-pools/experiences')}
            >
              <Database className="mr-2 h-4 w-4" />
              Add Experience
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/admin/agent')}
            >
              <Play className="mr-2 h-4 w-4" />
              Execute Agent Pipeline
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">API Status</span>
              <Badge variant="default">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Operational
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge variant="default">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Agent System</span>
              <Badge variant="default">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Ready
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
