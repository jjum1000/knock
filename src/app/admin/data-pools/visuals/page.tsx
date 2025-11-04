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
  Palette,
} from 'lucide-react';
import { visualElementApi } from '@/services/adminApi';
import type { VisualElement, DataPoolFilters } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

const CATEGORY_LABELS: Record<string, string> = {
  object: 'Object',
  color: 'Color',
  lighting: 'Lighting',
  mood: 'Mood',
};

export default function VisualElementsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [visualElements, setVisualElements] = useState<VisualElement[]>([]);
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
  const [elementToDelete, setElementToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchVisualElements();
  }, [filters]);

  const fetchVisualElements = async () => {
    try {
      setIsLoading(true);
      const response = await visualElementApi.getVisualElements(filters);
      setVisualElements(response.data || []);
      setPagination({
        total: response.pagination?.total || 0,
        hasMore: response.pagination?.hasMore || false,
      });
    } catch (error) {
      console.error('Failed to fetch visual elements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load visual elements. Please try again.',
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
    if (!elementToDelete) return;

    try {
      await visualElementApi.deleteVisualElement(elementToDelete);
      toast({
        title: 'Success',
        description: 'Visual element deleted successfully.',
      });
      fetchVisualElements();
    } catch (error) {
      console.error('Failed to delete visual element:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete visual element. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setElementToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setElementToDelete(id);
    setDeleteDialogOpen(true);
  };

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
  const totalPages = Math.ceil(pagination.total / (filters.limit || 20));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visual Elements Pool</h1>
          <p className="text-muted-foreground">
            Manage reusable visual elements for room image generation
          </p>
        </div>
        <Button onClick={() => router.push('/admin/data-pools/visuals/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Visual Element
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter visual elements by category or search by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or description..."
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="object">Objects</SelectItem>
                <SelectItem value="color">Colors</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="mood">Moods</SelectItem>
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
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="category">Sort by Category</SelectItem>
                <SelectItem value="weight">Sort by Weight</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={fetchVisualElements}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visual Elements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visual Elements ({pagination.total})</CardTitle>
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
          ) : visualElements.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Related Needs</TableHead>
                    <TableHead>Prompt Fragment</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visualElements.map((element) => (
                    <TableRow
                      key={element.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/admin/data-pools/visuals/${element.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4 text-muted-foreground" />
                          {element.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CATEGORY_LABELS[element.category] || element.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate text-sm text-muted-foreground">
                          {element.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            element.weight >= 0.7
                              ? 'default'
                              : element.weight >= 0.4
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {element.weight.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {element.relatedNeeds.slice(0, 2).map((need) => (
                            <Badge key={need} variant="outline" className="text-xs">
                              {need}
                            </Badge>
                          ))}
                          {element.relatedNeeds.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{element.relatedNeeds.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded truncate block">
                          {element.promptFragment.slice(0, 40)}...
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(element.createdAt).toLocaleDateString()}
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
                                router.push(`/admin/data-pools/visuals/${element.id}`);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(element.id);
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
              <Palette className="h-12 w-12 mb-4 opacity-50" />
              <p>No visual elements found matching your filters</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/admin/data-pools/visuals/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Visual Element
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visual Element</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this visual element? This action cannot be undone
              and the element will no longer be available for image generation.
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
