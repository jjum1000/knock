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
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { experienceApi } from '@/services/adminApi';
import type { Experience, CreateExperienceInput } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

export default function ExperienceFormPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const isNew = params?.id === 'new';
  const experienceId = params?.id as string;

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateExperienceInput>({
    category: 'belonging',
    title: '',
    event: '',
    ageRange: [13, 18],
    learnings: [''],
    triggers: {
      needs: [],
      keywords: [],
      priority: 5,
    },
  });

  const [needInput, setNeedInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetchExperience();
    }
  }, [isNew, experienceId]);

  const fetchExperience = async () => {
    try {
      setIsLoading(true);
      const response = await experienceApi.getExperience(experienceId);
      if (response.data) {
        setFormData({
          category: response.data.category,
          title: response.data.title,
          event: response.data.event,
          ageRange: response.data.ageRange,
          learnings: response.data.learnings,
          triggers: response.data.triggers,
        });
      }
    } catch (error) {
      console.error('Failed to fetch experience:', error);
      toast({
        title: 'Error',
        description: 'Failed to load experience. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.event.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Event description is required.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.learnings.filter((l) => l.trim()).length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one learning is required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      // Clean up learnings (remove empty strings)
      const cleanedData = {
        ...formData,
        learnings: formData.learnings.filter((l) => l.trim()),
      };

      if (isNew) {
        await experienceApi.createExperience(cleanedData);
        toast({
          title: 'Success',
          description: 'Experience created successfully.',
        });
      } else {
        await experienceApi.updateExperience(experienceId, cleanedData);
        toast({
          title: 'Success',
          description: 'Experience updated successfully.',
        });
      }

      router.push('/admin/data-pools/experiences');
    } catch (error) {
      console.error('Failed to save experience:', error);
      toast({
        title: 'Error',
        description: 'Failed to save experience. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addLearning = () => {
    setFormData((prev) => ({
      ...prev,
      learnings: [...prev.learnings, ''],
    }));
  };

  const removeLearning = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      learnings: prev.learnings.filter((_, i) => i !== index),
    }));
  };

  const updateLearning = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      learnings: prev.learnings.map((l, i) => (i === index ? value : l)),
    }));
  };

  const addNeed = () => {
    if (needInput.trim() && !formData.triggers.needs.includes(needInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        triggers: {
          ...prev.triggers,
          needs: [...prev.triggers.needs, needInput.trim()],
        },
      }));
      setNeedInput('');
    }
  };

  const removeNeed = (need: string) => {
    setFormData((prev) => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        needs: prev.triggers.needs.filter((n) => n !== need),
      },
    }));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.triggers.keywords.includes(keywordInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        triggers: {
          ...prev.triggers,
          keywords: [...prev.triggers.keywords, keywordInput.trim()],
        },
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        keywords: prev.triggers.keywords.filter((k) => k !== keyword),
      },
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
            onClick={() => router.push('/admin/data-pools/experiences')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? 'Add Experience' : 'Edit Experience'}
            </h1>
            <p className="text-muted-foreground">
              {isNew
                ? 'Create a new past experience template'
                : 'Update experience details'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/data-pools/experiences')}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Experience'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              General details about this past experience template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., 왕따 경험"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belonging">Belonging (소속감)</SelectItem>
                    <SelectItem value="recognition">Recognition (인정)</SelectItem>
                    <SelectItem value="growth">Growth (성장)</SelectItem>
                    <SelectItem value="autonomy">Autonomy (자율성)</SelectItem>
                    <SelectItem value="security">Security (안정)</SelectItem>
                    <SelectItem value="meaning">Meaning (의미)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">Event Description *</Label>
              <Textarea
                id="event"
                placeholder="Describe the past experience in detail..."
                value={formData.event}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, event: e.target.value }))
                }
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                {formData.event.length} characters
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ageMin">Age Range Min</Label>
                <Input
                  id="ageMin"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.ageRange[0]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ageRange: [parseInt(e.target.value) || 0, prev.ageRange[1]],
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageMax">Age Range Max</Label>
                <Input
                  id="ageMax"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.ageRange[1]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ageRange: [prev.ageRange[0], parseInt(e.target.value) || 0],
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learnings */}
        <Card>
          <CardHeader>
            <CardTitle>Learnings</CardTitle>
            <CardDescription>
              Key lessons or beliefs formed from this experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.learnings.map((learning, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  placeholder={`Learning ${index + 1}`}
                  value={learning}
                  onChange={(e) => updateLearning(index, e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLearning(index)}
                  disabled={formData.learnings.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addLearning} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Learning
            </Button>
          </CardContent>
        </Card>

        {/* Triggers */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Configuration</CardTitle>
            <CardDescription>
              Conditions for when agents should select this experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Needs */}
            <div className="space-y-2">
              <Label>Related Needs</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., belonging"
                  value={needInput}
                  onChange={(e) => setNeedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNeed())}
                />
                <Button onClick={addNeed} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.triggers.needs.map((need) => (
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
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label>Trigger Keywords</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 외로움, 친구"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addKeyword())
                  }
                />
                <Button onClick={addKeyword} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.triggers.keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => removeKeyword(keyword)}
                  >
                    {keyword}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="priority"
                  type="range"
                  min={1}
                  max={10}
                  value={formData.triggers.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      triggers: {
                        ...prev.triggers,
                        priority: parseInt(e.target.value),
                      },
                    }))
                  }
                  className="flex-1"
                />
                <span className="text-2xl font-bold w-12 text-center">
                  {formData.triggers.priority}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Higher priority experiences are more likely to be selected by agents
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
