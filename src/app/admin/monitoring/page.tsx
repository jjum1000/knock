'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { monitoringApi } from '@/services/adminApi';
import type { DashboardStats, MonitoringPeriod } from '@/types/admin';
import { formatRelativeTime, formatDuration } from '@/lib/date';
import { useToast } from '@/hooks/use-toast';
import { StatsCard } from '@/components/admin/StatsCard';

export default function MonitoringDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [period, setPeriod] = useState<MonitoringPeriod>('24h');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await monitoringApi.getDashboard(period);
      setDashboardStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monitoring data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Dashboard data has been updated.',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      processing: 'secondary',
      failed: 'destructive',
    };
    const colors: Record<string, string> = {
      completed: 'text-green-600',
      processing: 'text-blue-600',
      failed: 'text-red-600',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  // Chart colors
  const CHART_COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    secondary: '#8b5cf6',
  };

  const STATUS_COLORS: Record<string, string> = {
    completed: CHART_COLORS.success,
    processing: CHART_COLORS.primary,
    failed: CHART_COLORS.danger,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
            <p className="text-muted-foreground">Real-time system performance and metrics</p>
          </div>
        </div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time agent execution metrics and system health
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as MonitoringPeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Jobs"
          value={dashboardStats?.overview.totalJobs || 0}
          description={`In the last ${period}`}
          icon={Activity}
          trend={dashboardStats?.overview.totalJobs || 0}
        />
        <StatsCard
          title="Success Rate"
          value={`${dashboardStats?.overview.successRate.toFixed(1) || 0}%`}
          description={`${dashboardStats?.overview.completedJobs || 0} completed`}
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

      {/* Charts */}
      <Tabs defaultValue="hourly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hourly">Hourly Activity</TabsTrigger>
          <TabsTrigger value="status">Status Distribution</TabsTrigger>
          <TabsTrigger value="quality">Quality Scores</TabsTrigger>
        </TabsList>

        {/* Hourly Distribution Chart */}
        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>Job Execution Over Time</CardTitle>
              <CardDescription>
                Number of jobs executed per hour in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dashboardStats?.charts.hourlyDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: number) => [value, 'Jobs']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.6}
                    name="Jobs Executed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Distribution Chart */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Job Status Distribution</CardTitle>
              <CardDescription>
                Breakdown of job statuses in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardStats?.charts.statusDistribution || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.status}: ${entry.count}`}
                    >
                      {(dashboardStats?.charts.statusDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS.secondary} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Completed</span>
                    </div>
                    <span className="text-2xl font-bold">{dashboardStats?.overview.completedJobs || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Processing</span>
                    </div>
                    <span className="text-2xl font-bold">{dashboardStats?.overview.processingJobs || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Failed</span>
                    </div>
                    <span className="text-2xl font-bold">{dashboardStats?.overview.failedJobs || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Distribution Chart */}
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Quality Score Distribution</CardTitle>
              <CardDescription>
                Distribution of quality scores for completed jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardStats?.charts.qualityDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [value, 'Jobs']} />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLORS.secondary}
                    name="Number of Jobs"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>Latest agent execution jobs in the system</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push('/admin/monitoring/jobs')}>
              View All Jobs
            </Button>
          </div>
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
                  <TableHead></TableHead>
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
                      {job.jobId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {job.user?.email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {job.qualityScore ? (
                        <div className="flex items-center gap-2">
                          <span>{job.qualityScore}/100</span>
                          {job.qualityScore < 70 && (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {job.executionTimeMs ? formatDuration(job.executionTimeMs) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(job.startedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/monitoring/jobs/${job.jobId}`);
                        }}
                      >
                        View Details
                      </Button>
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

      {/* Generated At Footer */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {dashboardStats?.generatedAt ? new Date(dashboardStats.generatedAt).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}
