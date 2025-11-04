'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, X } from 'lucide-react';
import { visualElementApi } from '@/services/adminApi';
import type { CreateVisualElementInput } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

export default function VisualElementFormPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const isNew = params?.id === 'new';
  const elementId = params?.id as string;

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateVisualElementInput>({
    category: 'object',
    relatedNeeds: [],
    name: '',
    description: '',
    promptFragment: '',
    weight: 0.5,
  });

  const [needInput, setNeedInput] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetchVisualElement();
    }
  }, [isNew, elementId]);

  const fetchVisualElement = async () => {
    try {
      setIsLoading(true);
      const response = await visualElementApi.getVisualElement(elementId);
      if (response.data) {
        setFormData({
          category: response.data.category,
          relatedNeeds: response.data.relatedNeeds,
          name: response.data.name,
          description: response.data.description,
          promptFragment: response.data.promptFragment,
          weight: response.data.weight,
        });
      }
    } catch (error) {
      console.error('Failed to fetch visual element:', error);
      toast({
        title: 'Error',
        description: 'Failed to load visual element. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Description is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.promptFragment.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Prompt fragment is required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      if (isNew) {
        await visualElementApi.createVisualElement(formData);
        toast({
          title: 'Success',
          description: 'Visual element created successfully.',
        });
      } else {
        await visualElementApi.updateVisualElement(elementId, formData);
        toast({
          title: 'Success',
          description: 'Visual element updated successfully.',
        });
      }

      router.push('/admin/data-pools/visuals');
    } catch (error) {
      console.error('Failed to save visual element:', error);
      toast({
        title: 'Error',
        description: 'Failed to save visual element. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addNeed = () => {
    if (needInput.trim() && !formData.relatedNeeds.includes(needInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        relatedNeeds: [...prev.relatedNeeds, needInput.trim()],
      }));
      setNeedInput('');
    }
  };

  const removeNeed = (need: string) => {
    setFormData((prev) => ({
      ...prev,
      relatedNeeds: prev.relatedNeeds.filter((n) => n !== need),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
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
            onClick={() => router.push('/admin/data-pools/visuals')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? 'Add Visual Element' : 'Edit Visual Element'}
            </h1>
            <p className="text-muted-foreground">
              {isNew
                ? 'Create a new reusable visual element'
                : 'Update visual element details'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/data-pools/visuals')}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Element'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>General details about this visual element</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Small potted plant"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="object">Object</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="lighting">Lighting</SelectItem>
                  <SelectItem value="mood">Mood</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe this visual element..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (0-1) *</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="weight"
                  type="range"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, weight: parseFloat(e.target.value) }))
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      weight: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)),
                    }))
                  }
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Higher weight = more likely to be selected by agents
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prompt & Needs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Fragment</CardTitle>
              <CardDescription>
                Text to be included in the image generation prompt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promptFragment">Prompt Fragment *</Label>
                <Textarea
                  id="promptFragment"
                  placeholder="e.g., small succulent plant on desk corner, pixelated leaves"
                  value={formData.promptFragment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, promptFragment: e.target.value }))
                  }
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.promptFragment.length} characters
                </p>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs font-medium mb-2">Preview</div>
                <code className="text-xs break-words">{formData.promptFragment || '(empty)'}</code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Needs</CardTitle>
              <CardDescription>
                Which needs this visual element relates to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., belonging, growth"
                  value={needInput}
                  onChange={(e) => setNeedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNeed())}
                />
                <Button onClick={addNeed} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.relatedNeeds.map((need) => (
                  <Badge
                    key={need}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeNeed(need)}
                  >
                    {need}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
              {formData.relatedNeeds.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No related needs specified. Add at least one for better agent selection.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Example Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Element Summary</CardTitle>
          <CardDescription>Preview of how this element will be used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="font-medium">{formData.name || '(not set)'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Category</div>
              <Badge variant="outline">{formData.category}</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Weight</div>
              <Badge
                variant={
                  formData.weight >= 0.7
                    ? 'default'
                    : formData.weight >= 0.4
                    ? 'secondary'
                    : 'outline'
                }
              >
                {formData.weight.toFixed(1)}
              </Badge>
            </div>
            <div className="space-y-1 md:col-span-3">
              <div className="text-sm font-medium text-muted-foreground">Related Needs</div>
              <div className="flex flex-wrap gap-1">
                {formData.relatedNeeds.length > 0 ? (
                  formData.relatedNeeds.map((need) => (
                    <Badge key={need} variant="outline" className="text-xs">
                      {need}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div className="space-y-1 md:col-span-3">
              <div className="text-sm font-medium text-muted-foreground">Prompt Fragment</div>
              <div className="p-3 bg-muted rounded text-sm font-mono">
                {formData.promptFragment || '(not set)'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
