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
  Users,
} from 'lucide-react';
import { archetypeApi } from '@/services/adminApi';
import type { Archetype, DataPoolFilters } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

export default function ArchetypesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
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
  const [archetypeToDelete, setArchetypeToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchArchetypes();
  }, [filters]);

  const fetchArchetypes = async () => {
    try {
      setIsLoading(true);
      const response = await archetypeApi.getArchetypes(filters);
      setArchetypes(response.data || []);
      setPagination({
        total: response.pagination?.total || 0,
        hasMore: response.pagination?.hasMore || false,
      });
    } catch (error) {
      console.error('Failed to fetch archetypes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load archetypes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery, offset: 0 }));
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
    if (!archetypeToDelete) return;

    try {
      await archetypeApi.deleteArchetype(archetypeToDelete);
      toast({
        title: 'Success',
        description: 'Archetype deleted successfully.',
      });
      fetchArchetypes();
    } catch (error) {
      console.error('Failed to delete archetype:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete archetype. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setArchetypeToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setArchetypeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
  const totalPages = Math.ceil(pagination.total / (filters.limit || 20));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Archetype Pool</h1>
          <p className="text-muted-foreground">
            Manage character archetypes with visual and conversational styles
          </p>
        </div>
        <Button onClick={() => router.push('/admin/data-pools/archetypes/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Archetype
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter archetypes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>

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
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={fetchArchetypes}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Archetypes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Archetypes ({pagination.total})</CardTitle>
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
          ) : archetypes.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Matching Needs</TableHead>
                    <TableHead>Visual Elements</TableHead>
                    <TableHead>Conversation Style</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archetypes.map((archetype) => (
                    <TableRow
                      key={archetype.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/admin/data-pools/archetypes/${archetype.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {archetype.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {archetype.matchingNeeds.slice(0, 3).map((need) => (
                            <Badge key={need} variant="outline" className="text-xs">
                              {need}
                            </Badge>
                          ))}
                          {archetype.matchingNeeds.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{archetype.matchingNeeds.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {archetype.visualElements.colors && (
                              <>
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{
                                    backgroundColor: archetype.visualElements.colors.primary,
                                  }}
                                  title={archetype.visualElements.colors.primary}
                                />
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{
                                    backgroundColor: archetype.visualElements.colors.secondary,
                                  }}
                                  title={archetype.visualElements.colors.secondary}
                                />
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {archetype.visualElements.objects?.length || 0} objects
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            {archetype.conversationStyle.tone}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {archetype.conversationStyle.length} length
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(archetype.createdAt).toLocaleDateString()}
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
                                router.push(`/admin/data-pools/archetypes/${archetype.id}`);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(archetype.id);
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
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>No archetypes found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/admin/data-pools/archetypes/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Archetype
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Archetype</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this archetype? This action cannot be undone and
              the archetype will no longer be available for character generation.
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
