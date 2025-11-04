"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api/admin";
import { TemplateEditor } from "../components/TemplateEditor";
import { TemplateVariables } from "../components/TemplateVariables";
import { TemplatePreview } from "../components/TemplatePreview";
import { TemplateTestDialog } from "../components/TemplateTestDialog";
import { ArrowLeft, Save, Loader2, Play } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Variable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export default function TemplateEditPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const templateId = params.id as string;
  const isNew = templateId === "new";

  // Form state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sectionType, setSectionType] = useState<string>("WHY");
  const [version, setVersion] = useState("1.0");
  const [isActive, setIsActive] = useState(true);
  const [templateContent, setTemplateContent] = useState("");
  const [variables, setVariables] = useState<Variable[]>([]);

  // Test dialog
  const [showTestDialog, setShowTestDialog] = useState(false);

  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const template = await adminApi.templates.getById(templateId);
      setName(template.name);
      setDescription(template.description || "");
      setSectionType(template.section_type);
      setVersion(template.version);
      setIsActive(template.is_active);
      setTemplateContent(template.template_content);

      // Convert variable schema to array format
      if (template.variable_schema) {
        const vars = Object.entries(template.variable_schema).map(
          ([varName, config]: [string, any]) => ({
            name: varName,
            type: config.type || "string",
            required: config.required || false,
            defaultValue: config.defaultValue,
            description: config.description,
          })
        );
        setVariables(vars);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load template",
        variant: "destructive",
      });
      router.push("/admin/templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (!templateContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Template content is required",
        variant: "destructive",
      });
      return;
    }

    // Convert variables array to schema object
    const variableSchema: any = {};
    variables.forEach((v) => {
      if (v.name) {
        variableSchema[v.name] = {
          type: v.type,
          required: v.required,
          defaultValue: v.defaultValue,
          description: v.description,
        };
      }
    });

    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        section_type: sectionType,
        version,
        template_content: templateContent,
        variable_schema: Object.keys(variableSchema).length > 0 ? variableSchema : undefined,
        is_active: isActive,
      };

      if (isNew) {
        await adminApi.templates.create(payload);
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      } else {
        await adminApi.templates.update(templateId, payload);
        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      }

      router.push("/admin/templates");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Convert variables array to schema object for preview
  const variableSchema: any = {};
  variables.forEach((v) => {
    if (v.name) {
      variableSchema[v.name] = {
        type: v.type,
        required: v.required,
        defaultValue: v.defaultValue,
        description: v.description,
      };
    }
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/templates")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? "Create Template" : "Edit Template"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNew
                ? "Create a new Handlebars template"
                : `Editing template: ${name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => setShowTestDialog(true)}
            >
              <Play className="h-4 w-4 mr-2" />
              Test
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Template Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., WHY Section Template"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    placeholder="1.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this template is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section">
                    Section Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={sectionType} onValueChange={setSectionType}>
                    <SelectTrigger id="section">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHY">WHY</SelectItem>
                      <SelectItem value="HOW">HOW</SelectItem>
                      <SelectItem value="WHAT">WHAT</SelectItem>
                      <SelectItem value="PERSONALITY">PERSONALITY</SelectItem>
                      <SelectItem value="PAST">PAST</SelectItem>
                      <SelectItem value="TRAUMA">TRAUMA</SelectItem>
                      <SelectItem value="RELATIONSHIP">RELATIONSHIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="active">Status</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label htmlFor="active" className="cursor-pointer">
                      {isActive ? "Active" : "Inactive"}
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Template Content */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Template Content <span className="text-destructive">*</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Write your Handlebars template below. Use variables like{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                {`{{variableName}}`}
              </code>{" "}
              to reference dynamic data.
            </p>
            <TemplateEditor
              value={templateContent}
              onChange={setTemplateContent}
              height="600px"
            />
          </Card>
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables" className="space-y-6">
          <Card className="p-6">
            <TemplateVariables variables={variables} onChange={setVariables} />
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="p-6">
            <TemplatePreview
              templateContent={templateContent}
              variableSchema={variableSchema}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Dialog */}
      {!isNew && (
        <TemplateTestDialog
          open={showTestDialog}
          onOpenChange={setShowTestDialog}
          templateId={templateId}
        />
      )}
    </div>
  );
}
