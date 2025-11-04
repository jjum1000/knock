'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { experienceApi } from '@/services/adminApi';
import type { Experience, DataPoolFilters } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

export default function ExperiencesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DataPoolFilters>({
    limit: 20,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [experienceToDelete, setExperienceToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiences();
  }, [filters]);

  const fetchExperiences = async () => {
    try {
      setIsLoading(true);
      const response = await experienceApi.getExperiences(filters);
      setExperiences(response.data || []);
      setPagination({
        total: response.pagination?.total || 0,
        hasMore: response.pagination?.hasMore || false,
      });
    } catch (error) {
      console.error('Failed to fetch experiences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load experiences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery, offset: 0 }));
  };

  const handleCategoryFilter = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      category: category === 'all' ? undefined : category,
      offset: 0,
    }));
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    setFilters((prev) => ({
      ...prev,
      offset:
        direction === 'next'
          ? (prev.offset || 0) + (prev.limit || 20)
          : Math.max(0, (prev.offset || 0) - (prev.limit || 20)),
    }));
  };

  const handleDelete = async () => {
    if (!experienceToDelete) return;

    try {
      await experienceApi.deleteExperience(experienceToDelete);
      toast({
        title: 'Success',
        description: 'Experience deleted successfully.',
      });
      fetchExperiences();
    } catch (error) {
      console.error('Failed to delete experience:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete experience. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setExperienceToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setExperienceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
  const totalPages = Math.ceil(pagination.total / (filters.limit || 20));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Experience Pool</h1>
          <p className="text-muted-foreground">
            Manage past experience templates for agent character generation
          </p>
        </div>
        <Button onClick={() => router.push('/admin/data-pools/experiences/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Experience
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter experiences by category or search by title</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title or event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>

            {/* Category Filter */}
            <Select
              value={filters.category || 'all'}
              onValueChange={handleCategoryFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="belonging">Belonging</SelectItem>
                <SelectItem value="recognition">Recognition</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="autonomy">Autonomy</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="meaning">Meaning</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={filters.sortBy || 'createdAt'}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, sortBy: value as any, offset: 0 }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Sort by Date</SelectItem>
                <SelectItem value="title">Sort by Title</SelectItem>
                <SelectItem value="category">Sort by Category</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={fetchExperiences}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Experiences Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Experiences ({pagination.total})</CardTitle>
              <CardDescription>
                Showing {(filters.offset || 0) + 1} -{' '}
                {Math.min((filters.offset || 0) + (filters.limit || 20), pagination.total)} of{' '}
                {pagination.total}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : experiences.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Age Range</TableHead>
                    <TableHead>Learnings</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Triggers</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiences.map((exp) => (
                    <TableRow
                      key={exp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/admin/data-pools/experiences/${exp.id}`)
                      }
                    >
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate">{exp.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {exp.event.slice(0, 60)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{exp.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {exp.ageRange[0]}-{exp.ageRange[1]} years
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{exp.learnings.length} items</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            exp.triggers.priority >= 8
                              ? 'default'
                              : exp.triggers.priority >= 5
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {exp.triggers.priority}/10
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {exp.triggers.needs.slice(0, 2).map((need) => (
                            <Badge key={need} variant="outline" className="text-xs">
                              {need}
                            </Badge>
                          ))}
                          {exp.triggers.needs.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{exp.triggers.needs.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/data-pools/experiences/${exp.id}`);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(exp.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange('prev')}
                    disabled={(filters.offset || 0) === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange('next')}
                    disabled={!pagination.hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Tag className="h-12 w-12 mb-4 opacity-50" />
              <p>No experiences found matching your filters</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/admin/data-pools/experiences/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Experience
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experience</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this experience? This action cannot be undone and
              the experience will no longer be available for agent character generation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
