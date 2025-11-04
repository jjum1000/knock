"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api/admin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, Play } from "lucide-react";

interface TemplateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
}

export function TemplateTestDialog({
  open,
  onOpenChange,
  templateId,
}: TemplateTestDialogProps) {
  const { toast } = useToast();
  const [testData, setTestData] = useState<string>("{}");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      // Parse test data
      let data = {};
      try {
        data = JSON.parse(testData);
      } catch (e) {
        throw new Error("Invalid JSON in test data");
      }

      // Call test API
      const response = await adminApi.templates.test(templateId, data);
      setResult(response);

      if (response.success) {
        toast({
          title: "Test Successful",
          description: "Template compiled and validated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test template",
        variant: "destructive",
      });
      setResult({
        success: false,
        error: error.message || "Unknown error",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setTestData("{}");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Test Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test Data Input */}
          <div className="space-y-2">
            <Label>Test Data (JSON)</Label>
            <Textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              placeholder='{"name": "John", "age": 25, "interests": ["music", "gaming"]}'
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Test Results */}
          {result && (
            <Tabs defaultValue="output" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="output" className="space-y-3">
                {result.success ? (
                  <>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Template compiled successfully
                      </AlertDescription>
                    </Alert>
                    <div className="bg-muted rounded-md p-4 overflow-auto max-h-[300px]">
                      <pre className="text-sm whitespace-pre-wrap">
                        {result.compiled_output || "No output"}
                      </pre>
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {result.error || "Compilation failed"}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="validation" className="space-y-3">
                {result.validation_errors && result.validation_errors.length > 0 ? (
                  <div className="space-y-2">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Found {result.validation_errors.length} validation error(s)
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      {result.validation_errors.map((error: string, index: number) => (
                        <div
                          key={index}
                          className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
                        >
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No validation errors found
                    </AlertDescription>
                  </Alert>
                )}

                {result.missing_variables && result.missing_variables.length > 0 && (
                  <div className="space-y-2">
                    <Label>Missing Variables</Label>
                    <div className="bg-muted rounded-md p-3">
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {result.missing_variables.map((variable: string, index: number) => (
                          <li key={index} className="text-muted-foreground">
                            {variable}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-3">
                <div className="space-y-2">
                  <Label>Execution Time</Label>
                  <div className="bg-muted rounded-md p-3 text-sm">
                    {result.execution_time_ms
                      ? `${result.execution_time_ms}ms`
                      : "N/A"}
                  </div>
                </div>

                {result.metadata && (
                  <div className="space-y-2">
                    <Label>Metadata</Label>
                    <div className="bg-muted rounded-md p-3 overflow-auto max-h-[200px]">
                      <pre className="text-sm">
                        {JSON.stringify(result.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleTest} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
