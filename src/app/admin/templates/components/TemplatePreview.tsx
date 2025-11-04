"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Code, AlertCircle, CheckCircle } from "lucide-react";
import Handlebars from "handlebars";

interface TemplatePreviewProps {
  templateContent: string;
  variableSchema?: any;
}

export function TemplatePreview({
  templateContent,
  variableSchema,
}: TemplatePreviewProps) {
  const [sampleData, setSampleData] = useState<string>("");
  const [compiledOutput, setCompiledOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [autoPreview, setAutoPreview] = useState(true);

  // Generate sample data from variable schema
  useEffect(() => {
    if (variableSchema && Object.keys(variableSchema).length > 0) {
      const sample: any = {};
      Object.entries(variableSchema).forEach(([key, config]: [string, any]) => {
        if (config.defaultValue !== undefined) {
          sample[key] = config.defaultValue;
        } else {
          // Generate sample based on type
          switch (config.type) {
            case "string":
              sample[key] = `Sample ${key}`;
              break;
            case "number":
              sample[key] = 42;
              break;
            case "boolean":
              sample[key] = true;
              break;
            case "object":
              sample[key] = { example: "value" };
              break;
            case "array":
              sample[key] = ["item1", "item2"];
              break;
            default:
              sample[key] = null;
          }
        }
      });
      setSampleData(JSON.stringify(sample, null, 2));
    } else {
      setSampleData("{}");
    }
  }, [variableSchema]);

  // Auto-compile when content or data changes
  useEffect(() => {
    if (autoPreview) {
      compileTemplate();
    }
  }, [templateContent, sampleData, autoPreview]);

  const compileTemplate = () => {
    try {
      setError("");

      // Parse sample data
      let data = {};
      if (sampleData.trim()) {
        try {
          data = JSON.parse(sampleData);
        } catch (e) {
          throw new Error("Invalid JSON in sample data");
        }
      }

      // Compile template
      const template = Handlebars.compile(templateContent);
      const output = template(data);
      setCompiledOutput(output);
    } catch (err: any) {
      setError(err.message || "Failed to compile template");
      setCompiledOutput("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Template Preview</h3>
          <p className="text-sm text-muted-foreground">
            Test your template with sample data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoPreview}
              onChange={(e) => setAutoPreview(e.target.checked)}
              className="rounded"
            />
            Auto-preview
          </label>
          {!autoPreview && (
            <Button onClick={compileTemplate} size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sample Data Input */}
        <Card className="p-4">
          <div className="space-y-3">
            <Label>Sample Data (JSON)</Label>
            <Textarea
              value={sampleData}
              onChange={(e) => setSampleData(e.target.value)}
              placeholder='{"name": "John", "age": 25}'
              rows={15}
              className="font-mono text-sm"
            />
          </div>
        </Card>

        {/* Compiled Output */}
        <Card className="p-4">
          <div className="space-y-3">
            <Tabs defaultValue="output" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="output">
                  <Eye className="h-4 w-4 mr-2" />
                  Output
                </TabsTrigger>
                <TabsTrigger value="template">
                  <Code className="h-4 w-4 mr-2" />
                  Template
                </TabsTrigger>
              </TabsList>
              <TabsContent value="output" className="space-y-3">
                {error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : compiledOutput ? (
                  <>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Template compiled successfully
                      </AlertDescription>
                    </Alert>
                    <div className="bg-muted rounded-md p-4 overflow-auto max-h-[400px]">
                      <pre className="text-sm whitespace-pre-wrap">
                        {compiledOutput}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Enter template content and sample data to see the preview
                  </div>
                )}
              </TabsContent>
              <TabsContent value="template" className="space-y-3">
                <div className="bg-muted rounded-md p-4 overflow-auto max-h-[500px]">
                  <pre className="text-sm whitespace-pre-wrap">
                    {templateContent || "No template content"}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
}
