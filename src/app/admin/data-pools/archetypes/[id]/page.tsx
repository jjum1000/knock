'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { archetypeApi } from '@/services/adminApi';
import type { CreateArchetypeInput } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

export default function ArchetypeFormPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const isNew = params?.id === 'new';
  const archetypeId = params?.id as string;

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateArchetypeInput>({
    name: '',
    matchingNeeds: [],
    visualElements: {
      objects: [],
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
      },
      lighting: 'warm',
      mood: 'cozy',
    },
    conversationStyle: {
      length: 'medium',
      speed: 'medium',
      tone: 'neutral',
      characteristics: [],
    },
  });

  const [needInput, setNeedInput] = useState('');
  const [objectName, setObjectName] = useState('');
  const [objectWeight, setObjectWeight] = useState('1.0');
  const [objectRequirement, setObjectRequirement] = useState('');
  const [characteristicInput, setCharacteristicInput] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetchArchetype();
    }
  }, [isNew, archetypeId]);

  const fetchArchetype = async () => {
    try {
      setIsLoading(true);
      const response = await archetypeApi.getArchetype(archetypeId);
      if (response.data) {
        setFormData({
          name: response.data.name,
          matchingNeeds: response.data.matchingNeeds,
          visualElements: response.data.visualElements,
          conversationStyle: response.data.conversationStyle,
        });
      }
    } catch (error) {
      console.error('Failed to fetch archetype:', error);
      toast({
        title: 'Error',
        description: 'Failed to load archetype. Please try again.',
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

    if (formData.matchingNeeds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one matching need is required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      if (isNew) {
        await archetypeApi.createArchetype(formData);
        toast({
          title: 'Success',
          description: 'Archetype created successfully.',
        });
      } else {
        await archetypeApi.updateArchetype(archetypeId, formData);
        toast({
          title: 'Success',
          description: 'Archetype updated successfully.',
        });
      }

      router.push('/admin/data-pools/archetypes');
    } catch (error) {
      console.error('Failed to save archetype:', error);
      toast({
        title: 'Error',
        description: 'Failed to save archetype. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addNeed = () => {
    if (needInput.trim() && !formData.matchingNeeds.includes(needInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        matchingNeeds: [...prev.matchingNeeds, needInput.trim()],
      }));
      setNeedInput('');
    }
  };

  const removeNeed = (need: string) => {
    setFormData((prev) => ({
      ...prev,
      matchingNeeds: prev.matchingNeeds.filter((n) => n !== need),
    }));
  };

  const addObject = () => {
    if (objectName.trim()) {
      setFormData((prev) => ({
        ...prev,
        visualElements: {
          ...prev.visualElements,
          objects: [
            ...prev.visualElements.objects,
            {
              name: objectName.trim(),
              weight: parseFloat(objectWeight) || 1.0,
              requirement: objectRequirement.trim() || undefined,
            },
          ],
        },
      }));
      setObjectName('');
      setObjectWeight('1.0');
      setObjectRequirement('');
    }
  };

  const removeObject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      visualElements: {
        ...prev.visualElements,
        objects: prev.visualElements.objects.filter((_, i) => i !== index),
      },
    }));
  };

  const addCharacteristic = () => {
    if (
      characteristicInput.trim() &&
      !formData.conversationStyle.characteristics.includes(characteristicInput.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        conversationStyle: {
          ...prev.conversationStyle,
          characteristics: [...prev.conversationStyle.characteristics, characteristicInput.trim()],
        },
      }));
      setCharacteristicInput('');
    }
  };

  const removeCharacteristic = (characteristic: string) => {
    setFormData((prev) => ({
      ...prev,
      conversationStyle: {
        ...prev.conversationStyle,
        characteristics: prev.conversationStyle.characteristics.filter((c) => c !== characteristic),
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
            onClick={() => router.push('/admin/data-pools/archetypes')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? 'Add Archetype' : 'Edit Archetype'}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? 'Create a new character archetype' : 'Update archetype details'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/data-pools/archetypes')}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Archetype'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="visual">Visual Elements</TabsTrigger>
          <TabsTrigger value="conversation">Conversation Style</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>General details about this archetype</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., developer_gamer"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Matching Needs *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., recognition, belonging"
                    value={needInput}
                    onChange={(e) => setNeedInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNeed())}
                  />
                  <Button onClick={addNeed} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.matchingNeeds.map((need) => (
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
                <p className="text-xs text-muted-foreground">
                  Which needs does this archetype address?
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visual Elements Tab */}
        <TabsContent value="visual">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Objects */}
            <Card>
              <CardHeader>
                <CardTitle>Objects</CardTitle>
                <CardDescription>Visual objects in the room</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objectName">Object Name</Label>
                  <Input
                    id="objectName"
                    placeholder="e.g., gaming console"
                    value={objectName}
                    onChange={(e) => setObjectName(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="objectWeight">Weight (0-1)</Label>
                    <Input
                      id="objectWeight"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={objectWeight}
                      onChange={(e) => setObjectWeight(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objectRequirement">Requirement</Label>
                    <Input
                      id="objectRequirement"
                      placeholder="Optional condition"
                      value={objectRequirement}
                      onChange={(e) => setObjectRequirement(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={addObject} variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Object
                </Button>

                <div className="space-y-2 mt-4">
                  {formData.visualElements.objects.map((obj, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{obj.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Weight: {obj.weight}
                          {obj.requirement && ` • ${obj.requirement}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeObject(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Colors & Atmosphere */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Colors</CardTitle>
                  <CardDescription>Color palette for the room</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={formData.visualElements.colors.primary}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visualElements: {
                              ...prev.visualElements,
                              colors: {
                                ...prev.visualElements.colors,
                                primary: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.visualElements.colors.primary}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visualElements: {
                              ...prev.visualElements,
                              colors: {
                                ...prev.visualElements.colors,
                                primary: e.target.value,
                              },
                            },
                          }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={formData.visualElements.colors.secondary}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visualElements: {
                              ...prev.visualElements,
                              colors: {
                                ...prev.visualElements.colors,
                                secondary: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.visualElements.colors.secondary}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visualElements: {
                              ...prev.visualElements,
                              colors: {
                                ...prev.visualElements.colors,
                                secondary: e.target.value,
                              },
                            },
                          }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={formData.visualElements.colors.accent}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visualElements: {
                              ...prev.visualElements,
                              colors: {
                                ...prev.visualElements.colors,
                                accent: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.visualElements.colors.accent}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visualElements: {
                              ...prev.visualElements,
                              colors: {
                                ...prev.visualElements.colors,
                                accent: e.target.value,
                              },
                            },
                          }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Atmosphere</CardTitle>
                  <CardDescription>Lighting and mood settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lighting">Lighting</Label>
                    <Input
                      id="lighting"
                      placeholder="e.g., warm, cool, dim"
                      value={formData.visualElements.lighting}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visualElements: {
                            ...prev.visualElements,
                            lighting: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mood">Mood</Label>
                    <Input
                      id="mood"
                      placeholder="e.g., cozy, energetic, calm"
                      value={formData.visualElements.mood}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visualElements: {
                            ...prev.visualElements,
                            mood: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Conversation Style Tab */}
        <TabsContent value="conversation">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Style</CardTitle>
              <CardDescription>
                How this archetype communicates in conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="length">Message Length</Label>
                  <Select
                    value={formData.conversationStyle.length}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        conversationStyle: {
                          ...prev.conversationStyle,
                          length: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id="length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="speed">Response Speed</Label>
                  <Select
                    value={formData.conversationStyle.speed}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        conversationStyle: {
                          ...prev.conversationStyle,
                          speed: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id="speed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="slow">Slow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    value={formData.conversationStyle.tone}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        conversationStyle: {
                          ...prev.conversationStyle,
                          tone: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id="tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="serious">Serious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Characteristics</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., uses tech jargon, playful banter"
                    value={characteristicInput}
                    onChange={(e) => setCharacteristicInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addCharacteristic())
                    }
                  />
                  <Button onClick={addCharacteristic} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.conversationStyle.characteristics.map((char) => (
                    <Badge
                      key={char}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeCharacteristic(char)}
                    >
                      {char}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique conversational traits of this archetype
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
